import { spawn } from 'node:child_process'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { promises as fsp } from 'node:fs'
import { basename, dirname, extname, join, resolve, sep } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

export const name = 'local-transcribe'

// Configuration keys and defaults (edited in the profile's cordis.patch.yml
// under the `local-transcribe` row's `config`; unknown keys are ignored).
const CONFIG_KEYS = {
  whisperCli: 'whisper-cli', // whisper.cpp whisper-cli 可执行文件（PATH 中的名字或绝对路径）
  model: '', // whisper.cpp 使用的 ggml 模型文件绝对路径（必填，见 README 获取方式）
  ffmpeg: 'ffmpeg', // ffmpeg 命令（PATH 中的名字或绝对路径）
  ffprobe: 'ffprobe', // ffprobe 命令
  language: 'zh', // 默认转写语言代码，如 zh / en / auto
  prompt: '以下是普通话的句子。', // whisper 初始提示词
  threads: 10 // whisper-cli 线程数
}

export const inject = ['tools', 'webServer']

/** Effective configuration, set by `apply` before any operation can run. */
let cfg = { ...CONFIG_KEYS }

function abortError() {
  const error = new Error('transcription aborted')
  error.name = 'AbortError'
  return error
}

/** Run a child process to completion; capture output, forward stderr lines, and kill the child when `signal` aborts. */
function run(command, args, { signal, cwd, onStderr } = {}) {
  return new Promise((settle, fail) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env, cwd })
    let stdout = ''
    let stderr = ''
    let settled = false
    const onAbort = () => {
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 2000).unref()
    }
    if (signal !== undefined) {
      if (signal.aborted) onAbort()
      else signal.addEventListener('abort', onAbort, { once: true })
    }
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => {
      stderr += chunk
      if (onStderr !== undefined) onStderr(String(chunk))
    })
    child.on('error', error => {
      if (settled) return
      settled = true
      if (signal !== undefined) signal.removeEventListener('abort', onAbort)
      fail(error)
    })
    child.on('close', code => {
      if (settled) return
      settled = true
      if (signal !== undefined) signal.removeEventListener('abort', onAbort)
      settle({ exit: code ?? 0, stdout, stderr, aborted: signal !== undefined && signal.aborted })
    })
  })
}

/** 0:05-style clock for millisecond offsets. */
function fmtClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

/** Compose the markdown transcript from raw segments: one heading per minute, segments as paragraphs. */
function composeMarkdownFromSegments(base, durationSec, segments) {
  const lines = [`# ${base} · 转写稿`, '']
  lines.push(`> 音频时长：${(durationSec / 60).toFixed(1)} 分钟（0:00–${fmtClock(durationSec * 1000)}），本地 whisper.cpp 模型转写，未经人工校对。`)
  let currentMinute = -1
  for (const seg of segments) {
    const minute = Math.floor(seg.startMs / 60000)
    if (minute !== currentMinute) {
      currentMinute = minute
      lines.push('', `## ${fmtClock(minute * 60000)}`, '')
    }
    lines.push(seg.text)
  }
  lines.push('')
  return lines.join('\n')
}

/** Compose the markdown transcript from edited plain text (no per-segment timestamps). */
function composeMarkdownFromText(base, text) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0)
  return [`# ${base} · 转写稿`, '', ...paragraphs, ''].join('\n\n')
}

/**
 * Core transcription pipeline shared by the agent tool and the panel UI:
 * convert every input to 16 kHz mono WAV, merge several into one WAV when
 * requested, run whisper-cli once over the merged audio, and write the three
 * output files next to the chosen directory.
 */
async function transcribeRequest({ paths, language, prompt, threads, outDir, baseName, markdown = true, keepWav = false, signal, onProgress }) {
  if (typeof cfg.model !== 'string' || cfg.model.trim().length === 0) {
    throw new Error('未配置模型路径：请在插件配置 local-transcribe.config.model 中设置 whisper.cpp ggml 模型文件的绝对路径（下载方法见插件 README）')
  }
  const inputs = paths.map(p => resolve(String(p)))
  for (const input of inputs) {
    if (!existsSync(input)) throw new Error(`找不到音频文件: ${input}`)
  }
  await fsp.mkdir(outDir, { recursive: true })
  const work = await fsp.mkdtemp(join(tmpdir(), 'dsh-transcribe-'))
  const mergedWav = join(work, 'merged.wav')
  try {
    // 1. Convert each input to 16 kHz mono WAV.
    for (let i = 0; i < inputs.length; i++) {
      onProgress?.({ phase: 'converting', index: i, total: inputs.length })
      const seg = join(work, `seg-${i}.wav`)
      const conv = await run(cfg.ffmpeg, ['-y', '-v', 'error', '-i', inputs[i], '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', seg], { signal })
      if (conv.aborted) throw abortError()
      if (conv.exit !== 0 || !existsSync(seg)) throw new Error(`ffmpeg 转换失败 (${basename(inputs[i])}, exit ${conv.exit}): ${conv.stderr.trim().slice(-800)}`)
    }
    // 2. Merge into one WAV (single input: just rename).
    if (inputs.length > 1) {
      const listPath = join(work, 'list.txt')
      const list = Array.from({ length: inputs.length }, (_, i) => `file '${join(work, `seg-${i}.wav`).replace(/'/g, "'\\''")}'`).join('\n') + '\n'
      await fsp.writeFile(listPath, list, 'utf8')
      const merge = await run(cfg.ffmpeg, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', mergedWav], { signal })
      if (merge.aborted) throw abortError()
      if (merge.exit !== 0 || !existsSync(mergedWav)) throw new Error(`音频合并失败 (exit ${merge.exit}): ${merge.stderr.trim().slice(-800)}`)
    } else {
      await fsp.rename(join(work, 'seg-0.wav'), mergedWav)
    }
    // 3. Transcribe the merged audio.
    const cliArgs = ['-m', cfg.model, '-f', mergedWav, '-l', language, '-t', String(threads)]
    if (prompt) cliArgs.push('--prompt', prompt)
    cliArgs.push('-otxt', '-oj', '-of', join(work, 'out'))
    let lastPercent = 0
    const tr = await run(cfg.whisperCli, cliArgs, {
      signal,
      onStderr: chunk => {
        const match = chunk.match(/progress =\s*(\d+)%/)
        if (match !== null) {
          lastPercent = Number(match[1])
          onProgress?.({ phase: 'transcribing', percent: lastPercent })
        }
      }
    })
    if (tr.aborted) throw abortError()
    const txtPath = join(work, 'out.txt')
    const jsonPath = join(work, 'out.json')
    if (tr.exit !== 0 || !existsSync(txtPath) || !existsSync(jsonPath)) throw new Error(`whisper-cli 转写失败 (exit ${tr.exit}): ${tr.stderr.trim().slice(-1000)}`)
    onProgress?.({ phase: 'composing' })
    const text = (await fsp.readFile(txtPath, 'utf8')).replace(/\r\n/g, '\n').trim()
    const raw = JSON.parse(await fsp.readFile(jsonPath, 'utf8'))
    const segments = (raw.transcription ?? []).map(seg => ({
      startMs: seg.offsets?.from ?? 0,
      endMs: seg.offsets?.to ?? 0,
      text: String(seg.text ?? '').trim()
    })).filter(seg => seg.text.length > 0)
    const durationSec = segments.length > 0 ? segments[segments.length - 1].endMs / 1000 : 0
    const detected = raw.result?.language ?? language
    // 4. Write the three output files.
    const finalTxt = join(outDir, `${baseName}_原始转写.txt`)
    const finalJson = join(outDir, `${baseName}_带时间轴.json`)
    await fsp.copyFile(txtPath, finalTxt)
    await fsp.copyFile(jsonPath, finalJson)
    let markdownPath = null
    if (markdown) {
      markdownPath = join(outDir, `${baseName}_转写稿.md`)
      await fsp.writeFile(markdownPath, composeMarkdownFromSegments(baseName, durationSec, segments), 'utf8')
    }
    let wavPath = null
    if (keepWav) {
      wavPath = join(outDir, `${baseName}_16k.wav`)
      await fsp.copyFile(mergedWav, wavPath)
    }
    return {
      text,
      language: detected,
      durationSec,
      segments,
      files: { txt: finalTxt, json: finalJson, markdown: markdownPath },
      wavPath
    }
  } finally {
    await fsp.rm(work, { recursive: true, force: true })
  }
}

/** One live transcription job owned by the panel UI. */
const jobs = new Map()

function jobSnapshot(job) {
  return {
    jobId: job.id,
    phase: job.phase,
    progress: job.progress,
    error: job.error,
    files: job.files,
    result: job.result === null ? null : {
      text: job.result.text,
      language: job.result.language,
      durationSec: job.result.durationSec,
      segments: job.result.segments,
      files: job.result.files
    }
  }
}

function startJob({ paths, language, prompt, baseName, outputDir, markdown }) {
  const id = randomUUID()
  const abort = new AbortController()
  const job = {
    id,
    abort,
    phase: 'converting',
    progress: 0,
    error: null,
    files: paths.slice(),
    result: null,
    wavPath: null,
    baseName,
    outputDir,
    segments: null,
    language: null,
    durationSec: null,
    text: null
  }
  jobs.set(id, job)
  void (async () => {
    try {
      const result = await transcribeRequest({
        paths,
        language: language || cfg.language,
        prompt: prompt || cfg.prompt,
        threads: cfg.threads ?? 10,
        outDir: outputDir,
        baseName,
        markdown: markdown !== false,
        keepWav: true,
        signal: abort.signal,
        onProgress: update => {
          if (update.phase === 'converting') {
            job.phase = 'converting'
            job.progress = update.total > 1 ? Math.round((update.index / update.total) * 100) : 0
          } else if (update.phase === 'transcribing') {
            job.phase = 'transcribing'
            job.progress = update.percent ?? 0
          } else if (update.phase === 'composing') {
            job.phase = 'composing'
            job.progress = 100
          }
        }
      })
      job.result = result
      job.text = result.text
      job.segments = result.segments
      job.language = result.language
      job.durationSec = result.durationSec
      job.wavPath = result.wavPath
      job.phase = 'done'
      job.progress = 100
      job.files = [result.files.txt, result.files.json, ...(result.files.markdown ? [result.files.markdown] : [])]
    } catch (error) {
      if (abort.signal.aborted) {
        job.phase = 'cancelled'
      } else {
        job.phase = 'error'
        job.error = String(error && error.message ? error.message : error)
      }
    }
  })()
  return id
}

function findJob(jobId) {
  const job = jobs.get(String(jobId))
  if (job === undefined) throw new Error(`未知任务: ${jobId}`)
  return job
}

/* ---------------- Panel UI RPC channel (package-private, loopback-fenced) ---------------- */

const AUDIO_EXTENSIONS = ['.m4a', '.mp3', '.wav', '.flac', '.aac', '.ogg', '.opus', '.wma', '.m4b', '.amr', '.aiff', '.aif', '.caf', '.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.ts', '.3gp', '.mpg', '.mpeg']

/** Staging directory for files dragged into the panel from the browser. */
const UPLOAD_DIR = join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'storages', 'local-transcribe-uploads')
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024

function isLoopbackAuthority(value) {
  if (typeof value !== 'string' || value.length === 0) return false
  const name = value.replace(/:\d+$/, '').replace(/^\[/, '').replace(/\]$/, '')
  return name === '127.0.0.1' || name === 'localhost' || name === '::1'
}

/** Race a promise against a timeout so a stalled filesystem cannot block the panel. */
function withTimeout(promise, ms, message) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function listFiles(path) {
  const home = process.env.HOME ?? ''
  let dir = resolve(String(path || home || '/'))
  const stat = await fsp.stat(dir).catch(() => null)
  if (stat === null || !stat.isDirectory()) dir = home
  // A stalled directory (e.g. a stale network mount) must not hang the panel.
  const names = await withTimeout(fsp.readdir(dir), 8000, `读取目录超时: ${dir}`)
  const entries = []
  for (const name of names.slice(0, 1000)) {
    const full = join(dir, name)
    const info = await withTimeout(fsp.lstat(full), 3000, null).catch(() => null)
    if (info === null) continue
    entries.push({
      name,
      path: full,
      dir: info.isDirectory() || (info.isSymbolicLink() && await withTimeout(fsp.stat(full), 3000).then(s => s.isDirectory()).catch(() => false)),
      size: info.isFile() ? info.size : null,
      hidden: name.startsWith('.'),
      audio: info.isFile() ? AUDIO_EXTENSIONS.includes(extname(name).toLowerCase()) : false
    })
  }
  entries.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name, 'zh-CN') : a.dir ? -1 : 1))
  const crumbs = []
  let cursor = dir
  while (cursor.length > 0) {
    crumbs.unshift({ name: basename(cursor) || cursor, path: cursor })
    const parent = dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }
  return { path: dir, home, crumbs, entries }
}

async function probeFiles(paths) {
  const out = []
  for (const p of paths) {
    const entry = { path: resolve(String(p)), name: basename(String(p)), size: null, durationSec: null }
    const stat = await fsp.stat(entry.path).catch(() => null)
    if (stat !== null && stat.isFile()) entry.size = stat.size
    const probe = await run(cfg.ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', entry.path])
    if (probe.exit === 0) {
      const value = Number.parseFloat(probe.stdout.trim())
      if (Number.isFinite(value)) entry.durationSec = value
    }
    out.push(entry)
  }
  return out
}

/** Register the panel UI's HTTP routes on the web server (loopback-fenced, owned by this plugin's ctx). */
function registerPanelRoutes(ctx) {
  const webServer = ctx.get('webServer')
  if (webServer === undefined) return undefined
  return ctx.effect(() => {
    const disposeRpc = webServer.register({
      kind: 'exact',
      path: '/local-transcribe/rpc',
      handler: (req, res) => {
        void handlePanelRpc(req, res)
      }
    }, )
    const disposeUpload = webServer.register({
      kind: 'exact',
      path: '/local-transcribe/upload',
      handler: (req, res) => {
        void handleUpload(req, res)
      }
    })
    const disposePlay = webServer.register({
      kind: 'prefix',
      path: '/local-transcribe/play',
      handler: (req, res) => {
        try {
          const host = req.headers.host
          const origin = req.headers.origin
          if (!isLoopbackAuthority(host) || (origin !== undefined && !isLoopbackAuthority(origin))) {
            res.writeHead(403)
            res.end('forbidden')
            return
          }
          const pathname = new URL(req.url, 'http://127.0.0.1').pathname
          if (pathname === '/local-transcribe/play') {
            res.writeHead(404)
            res.end('audio unavailable')
            return
          }
          const jobId = pathname.slice('/local-transcribe/play/'.length)
          void serveAudio(res, jobId)
        } catch (error) {
          try {
            res.writeHead(500)
            res.end(String(error && error.message ? error.message : error))
          } catch {}
        }
      }
    })
    return () => {
      disposeRpc()
      disposeUpload()
      disposePlay()
    }
  }, 'local-transcribe: panel routes')
}

/** Receive one dragged-in audio file as a raw binary body and stage it for transcription. */
async function handleUpload(req, res) {
  try {
    const host = req.headers.host
    const origin = req.headers.origin
    if (!isLoopbackAuthority(host) || (origin !== undefined && !isLoopbackAuthority(origin))) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    if (req.method !== 'POST') {
      res.writeHead(405, { Allow: 'POST' })
      res.end('method not allowed')
      return
    }
    let name = 'audio.bin'
    try {
      name = decodeURIComponent(String(req.headers['x-file-name'] ?? 'audio.bin'))
    } catch {}
    const ext = extname(name).toLowerCase()
    if (!AUDIO_EXTENSIONS.includes(ext)) {
      sendJson(res, 400, { ok: false, error: { message: `不支持的文件类型「${ext || '未知'}」，支持 m4a / mp3 / wav / flac / aac / ogg / mp4 / mov 等音频视频文件` } })
      return
    }
    await fsp.mkdir(UPLOAD_DIR, { recursive: true })
    const safeBase = basename(name).replace(/[^\w\u4e00-\u9fff(). -]/g, '_')
    const target = join(UPLOAD_DIR, `${Date.now()}-${safeBase}`)
    await new Promise((resolveUpload, rejectUpload) => {
      let size = 0
      const out = createWriteStream(target)
      const finish = () => resolveUpload()
      const fail = error => {
        req.unpipe(out)
        out.destroy()
        rejectUpload(error instanceof Error ? error : new Error(String(error)))
      }
      req.on('data', chunk => {
        size += chunk.length
        if (size > MAX_UPLOAD_BYTES) {
          req.destroy()
          fail(new Error('文件超过 500MB 上限'))
        }
      })
      req.on('error', fail)
      req.pipe(out)
      out.on('finish', finish)
      out.on('error', fail)
    }).catch(async error => {
      await fsp.rm(target, { force: true })
      throw error
    })
    const probed = await probeFiles([target])
    sendJson(res, 200, {
      ok: true,
      value: {
        path: target,
        name,
        size: probed[0].size,
        durationSec: probed[0].durationSec
      }
    })
  } catch (error) {
    try {
      sendJson(res, 400, { ok: false, error: { message: String(error && error.message ? error.message : error) } })
    } catch {}
  }
}

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = ''
    req.on('data', chunk => {
      raw += chunk
      if (raw.length > 20 * 1024 * 1024) {
        rejectBody(new Error('请求体过大'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(raw || '{}'))
      } catch {
        rejectBody(new Error('请求体不是合法 JSON'))
      }
    })
    req.on('error', rejectBody)
  })
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

async function handlePanelRpc(req, res) {
  try {
    const host = req.headers.host
    const origin = req.headers.origin
    if (!isLoopbackAuthority(host) || (origin !== undefined && !isLoopbackAuthority(origin))) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    if (req.method !== 'POST') {
      res.writeHead(405, { Allow: 'POST' })
      res.end('method not allowed')
      return
    }
    let body
    try {
      body = await readJsonBody(req)
    } catch (error) {
      sendJson(res, 400, { ok: false, error: { message: error.message } })
      return
    }
    const endpoint = body.method
    const args = body.args === undefined || body.args === null ? {} : body.args
    try {
      let value
      switch (endpoint) {
        case 'listFiles': {
          value = await listFiles(args.path)
          break
        }
        case 'probe': {
          const paths = Array.isArray(args.paths) ? args.paths : []
          value = await probeFiles(paths)
          break
        }
        case 'start': {
          const paths = (Array.isArray(args.paths) ? args.paths : []).filter(p => typeof p === 'string' && p.length > 0)
          if (paths.length === 0) throw new Error('请先选择至少一个音频文件')
          const outDir = resolve(String(args.outputDir || dirname(paths[0])))
          const baseName = (String(args.baseName || '').trim() || `${basename(paths[0], extname(paths[0]))}${paths.length > 1 ? `等${paths.length}个文件` : ''}`).replace(/[/\\]/g, '_')
          const jobId = startJob({
            paths,
            language: typeof args.language === 'string' ? args.language : '',
            prompt: typeof args.prompt === 'string' ? args.prompt : '',
            baseName,
            outputDir: outDir,
            markdown: args.markdown !== false
          })
          value = { jobId, baseName, outputDir: outDir }
          break
        }
        case 'status': {
          value = jobSnapshot(findJob(args.jobId))
          break
        }
        case 'cancel': {
          findJob(args.jobId).abort.abort()
          value = { ok: true }
          break
        }
        case 'clear': {
          const job = findJob(args.jobId)
          jobs.delete(job.id)
          value = { ok: true }
          break
        }
        case 'save': {
          const job = findJob(args.jobId)
          const text = String(args.text ?? '')
          if (text.trim().length === 0) throw new Error('转写文本为空，未保存')
          const txtPath = join(job.outputDir, `${job.baseName}_原始转写.txt`)
          const mdPath = join(job.outputDir, `${job.baseName}_转写稿.md`)
          await fsp.writeFile(txtPath, text.replace(/\r\n/g, '\n').trim() + '\n', 'utf8')
          await fsp.writeFile(mdPath, composeMarkdownFromText(job.baseName, text), 'utf8')
          value = { files: { txt: txtPath, markdown: mdPath } }
          break
        }
        default:
          throw new Error(`未知操作: ${endpoint}`)
      }
      sendJson(res, 200, { ok: true, value })
    } catch (error) {
      sendJson(res, 200, { ok: false, error: { message: String(error && error.message ? error.message : error) } })
    }
  } catch (error) {
    try {
      res.writeHead(500)
      res.end(String(error && error.message ? error.message : error))
    } catch {}
  }
}

async function serveAudio(res, jobId) {
  const job = jobs.get(jobId)
  if (job === undefined || job.wavPath === null) {
    res.writeHead(404)
    res.end('audio unavailable')
    return
  }
  try {
    const stat = await fsp.stat(job.wavPath)
    const range = String(res.req.headers.range ?? '')
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (match !== null) {
      let start = match[1] === '' ? null : Number(match[1])
      let end = match[2] === '' ? null : Number(match[2])
      if (start === null) {
        start = Math.max(0, stat.size - (end ?? 0))
        end = stat.size - 1
      } else if (end === null || end >= stat.size) {
        end = stat.size - 1
      }
      if (start > end || start >= stat.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` })
        res.end()
        return
      }
      res.writeHead(206, {
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`
      })
      createReadStream(job.wavPath, { start, end }).pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
        'Content-Length': stat.size
      })
      createReadStream(job.wavPath).pipe(res)
    }
  } catch (error) {
    res.writeHead(500)
    res.end(String(error && error.message ? error.message : error))
  }
}

export function apply(ctx, config = {}) {
  cfg = { ...CONFIG_KEYS }
  for (const key of Object.keys(CONFIG_KEYS)) {
    if (config[key] !== undefined && config[key] !== null) cfg[key] = config[key]
  }
  if (typeof cfg.model !== 'string' || cfg.model.trim().length === 0) console.warn(`[${name}] model 未配置；在 profile 的 cordis.patch.yml 中设置 local-transcribe.config.model 后即可转写。`)
  if (!existsSync(cfg.whisperCli) && !cfg.whisperCli.includes('/')) console.warn(`[${name}] PATH 中未找到 whisper-cli；可把 whisperCli 配置为绝对路径。`)

  // Panel UI channel: own loopback-fenced HTTP routes (rpc + audio playback),
  // owned by this plugin's ctx so they are removed when the plugin unloads.
  try {
    registerPanelRoutes(ctx)
  } catch (error) {
    console.warn(`[${name}] panel routes unavailable:`, error)
  }

  const definition = {
    name: 'transcribe_audio',
    description: 'Transcribe one local audio/video file, or merge several files into one continuous transcript, using a local whisper.cpp model — fully offline, nothing is uploaded. Converts the inputs with ffmpeg, merges them in the given order, runs whisper-cli once, and writes three files next to the first input (or to output_dir): `<name>_原始转写.txt` (plain text), `<name>_带时间轴.json` (segments with timestamps), and `<name>_转写稿.md` (markdown, one heading per minute). Use it for any speech-to-text task (meetings, 汇报, interviews, voice notes). Default language is zh; pass `auto` to auto-detect.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to a single audio or video file (m4a, mp3, wav, mp4, and other ffmpeg inputs). Use `paths` instead to merge several files into one transcript.'
        },
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Absolute paths of several audio/video files; they are merged in array order into one WAV and transcribed as a single continuous text. Use `path` for a single file.'
        },
        language: {
          type: 'string',
          description: 'Language code override (e.g. zh, en, ja, auto). Defaults to the plugin-configured language (zh).'
        },
        prompt: {
          type: 'string',
          description: 'Initial whisper prompt override; helps with terminology. Defaults to the plugin-configured Chinese prompt.'
        },
        output_dir: {
          type: 'string',
          description: 'Directory for the output files. Defaults to the directory of the first input file.'
        },
        output_name: {
          type: 'string',
          description: 'Base name for the output files. Defaults to the first input name, with `等N个文件` appended when merging.'
        },
        markdown: {
          type: 'boolean',
          description: 'Also compose a markdown transcript. Default true.'
        },
        keep_wav: {
          type: 'boolean',
          description: 'Keep the merged 16 kHz mono WAV next to the outputs. Default false.'
        }
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', description: 'Full plain-text transcript.' },
          language: { type: 'string', description: 'Language used or detected.' },
          durationSec: { type: 'number', description: 'Audio duration in seconds.' },
          segments: {
            type: 'array',
            description: 'Per-segment transcription with millisecond offsets.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                startMs: { type: 'number' },
                endMs: { type: 'number' },
                text: { type: 'string' }
              },
              required: ['startMs', 'endMs', 'text']
            }
          },
          files: {
            type: 'object',
            additionalProperties: false,
            properties: {
              txt: { type: 'string' },
              json: { type: 'string' },
              markdown: { oneOf: [{ type: 'string' }, { type: 'null' }] }
            },
            required: ['txt', 'json', 'markdown']
          }
        },
        required: ['text', 'language', 'durationSec', 'segments', 'files']
      },
      render(_args, value) {
        const minutes = value.durationSec / 60
        const lines = [
          `本地转写完成（${value.language}）：${minutes.toFixed(1)} 分钟音频，${value.segments.length} 个片段。`,
          `纯文本：${value.files.txt}`,
          `带时间轴 JSON：${value.files.json}`,
          ...(value.files.markdown ? [`Markdown 转写稿：${value.files.markdown}`] : []),
          '',
          '--- 转写文本 ---',
          value.text
        ]
        return [{ type: 'text', text: lines.join('\n') }]
      }
    },
    timeoutMs: 3_600_000,
    async execute(args, exec) {
      const paths = Array.isArray(args.paths) && args.paths.length > 0
        ? args.paths.map(p => String(p))
        : [String(args.path ?? '')]
      if (paths.some(p => p.trim().length === 0)) throw new Error('transcribe_audio: 请提供音频文件路径（path 或 paths）')
      const first = resolve(paths[0])
      const outDir = args.output_dir !== undefined ? resolve(String(args.output_dir)) : dirname(first)
      const baseName = args.output_name !== undefined && String(args.output_name).trim().length > 0
        ? String(args.output_name).trim().replace(/[/\\]/g, '_')
        : `${basename(first, extname(first))}${paths.length > 1 ? `等${paths.length}个文件` : ''}`
      const result = await transcribeRequest({
        paths,
        language: args.language !== undefined && String(args.language).length > 0 ? String(args.language) : cfg.language,
        prompt: args.prompt !== undefined && String(args.prompt).length > 0 ? String(args.prompt) : cfg.prompt,
        threads: cfg.threads ?? 10,
        outDir,
        baseName,
        markdown: args.markdown !== false,
        keepWav: args.keep_wav === true,
        signal: exec.signal
      })
      return {
        text: result.text,
        language: result.language,
        durationSec: result.durationSec,
        segments: result.segments,
        files: result.files
      }
    },
    presentCall(args) {
      const paths = Array.isArray(args.paths) && args.paths.length > 0 ? args.paths : [args.path]
      return {
        card: 'terminal',
        title: paths.length > 1 ? `Transcribe ${paths.length} merged files` : 'Transcribe audio',
        description: `ffmpeg → whisper-cli (${String(args.language ?? 'default language')})`,
        cwd: dirname(resolve(String(paths[0] ?? '.')))
      }
    },
    presentResult(_args, value) {
      const head = value.text.length > 600 ? `${value.text.slice(0, 600)}\n…（全文见输出文件）` : value.text
      return {
        card: 'generic',
        title: 'Transcript',
        content: [{ type: 'text', text: head }]
      }
    }
  }

  ctx.tools.register(definition)
}
