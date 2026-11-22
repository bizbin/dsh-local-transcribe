window.__ModuleLoader__.load({
  id: 'dsh-local-transcribe',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // The module system claims any untagged <style> appended during
    // materialization, so the stylesheet is owned and cleaned up with the plugin.
    if (typeof document !== 'undefined') {
      const styleEl = document.createElement('style')
      styleEl.textContent = CSS
      document.head.append(styleEl)
    }

    const DICTS = {
      zh: {
        panelLabel: '语音转文本',
        title: '本地语音转文本',
        subtitle: '选择本机音频文件（可多个，按顺序合并），离线识别为文字，支持预览、试听与二次编辑',
        pickFiles: '选择音频文件',
        outputDir: '输出目录',
        pickDir: '选择…',
        language: '语言',
        prompt: '提示词',
        start: '开始识别',
        cancel: '取消',
        reTranscribe: '重新识别',
        clear: '清除结果',
        filesSelected: '已选文件',
        emptyFiles: '还没有选择文件。点击「选择音频文件」浏览本机目录。',
        emptyResult: '识别结果会显示在这里：完整文本、分段时间轴、合并音频试听，均可编辑后保存。',
        browserTitle: '浏览目录选择音频',
        close: '关闭',
        up: '上移',
        down: '下移',
        remove: '移除',
        totalDuration: '合计时长',
        converting: '正在转换音频…',
        transcribing: '正在识别…',
        composing: '正在整理结果…',
        done: '识别完成',
        cancelled: '已取消',
        failed: '识别失败',
        save: '保存修改',
        saved: '已保存：',
        copy: '复制全文',
        copied: '已复制',
        segments: '分段时间轴',
        transcript: '转写文本（可编辑）',
        player: '合并音频试听',
        backToParent: '上一级',
        home: '主目录',
        unknownDuration: '时长未知',
        files: '个文件',
        noAudioHint: '当前目录没有可识别的音频文件',
        dropHint: '也可以把音频文件直接拖进本面板（支持 m4a / mp3 / wav / flac / mp4 等）',
        dragActive: '松开鼠标即可添加文件',
        uploading: '上传中',
        uploadFailed: '上传失败',
        hotwords: '主题词',
        hotwordsPlaceholder: '人名、术语、主题（逗号分隔），用于提升识别与勘误准确率',
        proofread: '智能勘误',
        proofreading: '智能勘误中…',
        editsFound: '处修改建议',
        noEdits: '未发现需要修正的地方 ✓',
        accept: '接受',
        reject: '拒绝',
        acceptAll: '全部接受',
        rejectAll: '全部拒绝',
        appliedNote: '已应用修改，记得点「保存修改」写回文件',
        proofreadFailed: '勘误失败',
        seekHint: '点击段落从该处播放',
        lowConfHint: '低置信词，点击查看候选纠正',
        candidatesTitle: '候选纠正',
        candidatesLoading: '查询中…',
        candidatesEmpty: '该词看起来没有明显问题',
        applyCandidate: '点击候选词直接替换',
        close: '关闭'
      },
      en: {
        panelLabel: 'Transcribe',
        title: 'Local speech-to-text',
        subtitle: 'Pick local audio files (several merge into one), transcribe offline, then preview, play back, and edit the result',
        pickFiles: 'Choose audio files',
        outputDir: 'Output directory',
        pickDir: 'Choose…',
        language: 'Language',
        prompt: 'Prompt',
        start: 'Transcribe',
        cancel: 'Cancel',
        reTranscribe: 'Transcribe again',
        clear: 'Clear result',
        filesSelected: 'Selected files',
        emptyFiles: 'No files selected yet. Click “Choose audio files” to browse this machine.',
        emptyResult: 'The transcript appears here: full text, per-segment timeline, and merged-audio playback — all editable and saveable.',
        browserTitle: 'Browse directories to pick audio',
        close: 'Close',
        up: 'Move up',
        down: 'Move down',
        remove: 'Remove',
        totalDuration: 'Total duration',
        converting: 'Converting audio…',
        transcribing: 'Transcribing…',
        composing: 'Composing result…',
        done: 'Done',
        cancelled: 'Cancelled',
        failed: 'Transcription failed',
        save: 'Save edits',
        saved: 'Saved: ',
        copy: 'Copy all',
        copied: 'Copied',
        segments: 'Segment timeline',
        transcript: 'Transcript (editable)',
        player: 'Merged audio playback',
        backToParent: 'Up one level',
        home: 'Home',
        unknownDuration: 'unknown duration',
        files: 'files',
        noAudioHint: 'No supported audio files in this directory',
        dropHint: 'You can also drag audio files straight into this panel (m4a / mp3 / wav / flac / mp4 …)',
        dragActive: 'Drop to add the files',
        uploading: 'Uploading',
        uploadFailed: 'Upload failed',
        hotwords: 'Hot words',
        hotwordsPlaceholder: 'Names, terms, topics (comma-separated) — improves transcription and proofreading',
        proofread: 'Smart proofread',
        proofreading: 'Proofreading…',
        editsFound: 'suggested edits',
        noEdits: 'Nothing to correct ✓',
        accept: 'Accept',
        reject: 'Reject',
        acceptAll: 'Accept all',
        rejectAll: 'Reject all',
        appliedNote: 'Edits applied — remember to press “Save edits”',
        proofreadFailed: 'Proofreading failed',
        seekHint: 'Click a segment to play from there',
        lowConfHint: 'Low-confidence word — click for candidate corrections',
        candidatesTitle: 'Candidate corrections',
        candidatesLoading: 'Looking up…',
        candidatesEmpty: 'This word looks fine',
        applyCandidate: 'Click a candidate to replace the word',
        close: 'Close'
      }
    }

    function fmtClock(ms) {
      const total = Math.max(0, Math.floor(ms / 1000))
      const m = Math.floor(total / 60)
      const s = String(total % 60).padStart(2, '0')
      return `${m}:${s}`
    }

    function fmtDuration(sec) {
      if (sec === null || sec === undefined) return ''
      const m = Math.floor(sec / 60)
      const s = Math.round(sec % 60)
      return `${m}:${String(s).padStart(2, '0')}`
    }

    const AUDIO_EXTS = ['.m4a', '.mp3', '.wav', '.flac', '.aac', '.ogg', '.opus', '.wma', '.m4b', '.amr', '.aiff', '.aif', '.caf', '.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.ts', '.3gp', '.mpg', '.mpeg']

    function useDict(ctx) {
      const [, force] = React.useReducer(c => c + 1, 0)
      React.useEffect(() => {
        const locale = ctx.get('locale')
        if (locale === undefined) return undefined
        return locale.subscribe(force)
      }, [ctx])
      const locale = ctx.get('locale')
      const snap = locale === undefined ? {} : locale.getLocale()
      const id = String(snap.id ?? snap.locale ?? '')
      return id.startsWith('zh') ? DICTS.zh : DICTS.en
    }

    return {
      inject: ['slots', 'locale', 'uiWorkspace'],
      apply(ctx) {
        // Register dictionaries with the Client locale service for both languages.
        const localeService = ctx.get('locale')
        if (localeService !== undefined) {
          localeService.register('local-transcribe', 'zh', DICTS.zh)
          localeService.register('local-transcribe', 'en', DICTS.en)
        }
        const uiWorkspace = ctx.get('uiWorkspace')

        async function rpc(method, args) {
          const res = await fetch(`${location.origin}/local-transcribe/rpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, args })
          })
          const payload = await res.json()
          if (!payload.ok) throw new Error(payload.error && payload.error.message ? payload.error.message : '请求失败')
          return payload.value
        }

        function PanelIcon({ size, active }) {
          const bars = [[5, 17, 14], [11, 9, 30], [17, 4, 40], [23, 14, 20], [29, 21, 6], [35, 11, 26]]
          return h('svg', { viewBox: '0 0 48 48', width: size, height: size, 'aria-hidden': true, style: { display: 'block', pointerEvents: 'none' } },
            bars.map(([x, y, height], i) => h('rect', {
              key: i, x, y, width: 4, height, rx: 2,
              fill: active ? 'var(--dsw-alias-brand-primary)' : 'currentColor'
            })))
        }

        function TranscribePanel() {
          const dict = useDict(ctx)
          const [files, setFiles] = React.useState([])
          const [browserOpen, setBrowserOpen] = React.useState(false)
          const [listing, setListing] = React.useState(null)
          const [listError, setListError] = React.useState('')
          const [outputDir, setOutputDir] = React.useState('')
          const [baseName, setBaseName] = React.useState('')
          const [language, setLanguage] = React.useState('zh')
          const [prompt, setPrompt] = React.useState('')
          const [job, setJob] = React.useState(null)
          const [result, setResult] = React.useState(null)
          const [text, setText] = React.useState('')
          const [savedNote, setSavedNote] = React.useState('')
          const [copiedNote, setCopiedNote] = React.useState('')
          const [busy, setBusy] = React.useState(false)
          const [dragging, setDragging] = React.useState(false)
          const [uploading, setUploading] = React.useState(0)
          const [uploadTotal, setUploadTotal] = React.useState(0)
          const [hotwords, setHotwords] = React.useState('')
          const [proofLoading, setProofLoading] = React.useState(false)
          const [proofEdits, setProofEdits] = React.useState(null)
          const [proofNote, setProofNote] = React.useState('')
          const audioRef = React.useRef(null)
          const [activeSeg, setActiveSeg] = React.useState(-1)
          const [fixedTokens, setFixedTokens] = React.useState({})
          const [suggest, setSuggest] = React.useState(null)
          const activeRefs = React.useRef({})

          const segOffsets = React.useMemo(() => {
            if (result === null) return []
            const offsets = []
            let total = 0
            for (const seg of result.segments) {
              offsets.push(total)
              total += seg.text.length + 1
            }
            return offsets
          }, [result])

          React.useEffect(() => {
            const el = activeRefs.current[activeSeg]
            if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }, [activeSeg])

          React.useEffect(() => {
            if (!browserOpen) return
            let cancelled = false
            setListError('')
            rpc('listFiles', { path: listing === null ? undefined : listing.path }).then(next => {
              if (!cancelled) setListing(next)
            }).catch(error => {
              if (!cancelled) setListError(String(error && error.message ? error.message : error))
            })
            return () => { cancelled = true }
          }, [browserOpen, listing === null ? null : listing.path])

          // Poll job status while running.
          React.useEffect(() => {
            if (job === null || !['converting', 'transcribing', 'composing'].includes(job.phase)) return
            const timer = setInterval(() => {
              rpc('status', { jobId: job.jobId }).then(snapshot => {
                setJob(snapshot)
                if (snapshot.phase === 'done' && snapshot.result !== null) {
                  setResult(snapshot.result)
                  setText(snapshot.result.text)
                }
              }).catch(() => {})
            }, 800)
            return () => clearInterval(timer)
          }, [job === null ? null : `${job.jobId}:${job.phase}`])

          function addFile(entry) {
            if (files.some(f => f.path === entry.path)) return
            const next = [...files, { path: entry.path, name: entry.name, size: entry.size, durationSec: null }]
            setFiles(next)
            if (outputDir === '') setOutputDir(entry.path.slice(0, entry.path.lastIndexOf('/')))
            if (baseName === '') setBaseName(entry.name.replace(/\.[^.]+$/, ''))
            rpc('probe', { paths: [entry.path] }).then(probed => {
              setFiles(current => current.map(f => f.path === entry.path && probed[0] ? { ...f, durationSec: probed[0].durationSec } : f))
            }).catch(() => {})
          }

          function addUploaded(file, value) {
            setFiles(current => current.some(f => f.path === value.path)
              ? current
              : [...current, { path: value.path, name: file.name, size: value.size, durationSec: value.durationSec }])
            if (outputDir === '') setOutputDir('')
            if (baseName === '') setBaseName(file.name.replace(/\.[^.]+$/, ''))
          }

          async function uploadFile(file) {
            const res = await fetch(`${location.origin}/local-transcribe/upload`, {
              method: 'POST',
              headers: { 'x-file-name': encodeURIComponent(file.name), 'Content-Type': 'application/octet-stream' },
              body: file
            })
            const payload = await res.json()
            if (!payload.ok) throw new Error(payload.error && payload.error.message ? payload.error.message : '上传失败')
            return payload.value
          }

          async function handleDropped(fileList) {
            const items = Array.from(fileList).filter(item => typeof item.name === 'string')
            const supported = []
            const rejected = []
            for (const item of items) {
              const dot = item.name.lastIndexOf('.')
              const ext = dot === -1 ? '' : item.name.slice(dot).toLowerCase()
              if (AUDIO_EXTS.includes(ext)) supported.push(item)
              else rejected.push(item.name)
            }
            if (rejected.length > 0) setListError(`${dict.uploadFailed}：${rejected.join('、')}（类型不支持，支持 m4a / mp3 / wav / flac / mp4 等）`)
            if (supported.length === 0) return
            setListError('')
            setUploadTotal(supported.length)
            for (let i = 0; i < supported.length; i++) {
              setUploading(i + 1)
              try {
                const value = await uploadFile(supported[i])
                addUploaded(supported[i], value)
              } catch (error) {
                setListError(`${supported[i].name}: ${String(error && error.message ? error.message : error)}`)
              }
            }
            setUploading(0)
            setUploadTotal(0)
          }

          function removeFile(path) {
            setFiles(current => current.filter(f => f.path !== path))
          }

          function moveFile(index, delta) {
            setFiles(current => {
              const target = index + delta
              if (target < 0 || target >= current.length) return current
              const next = current.slice()
              const [item] = next.splice(index, 1)
              next.splice(target, 0, item)
              return next
            })
          }

          function applyEdit(current, edit) {
            if (typeof current !== 'string') return current
            const at = current.indexOf(edit.before)
            if (at === -1) return current
            return current.slice(0, at) + edit.after + current.slice(at + edit.before.length)
          }

          function startProofread() {
            if (job === null || result === null || proofLoading) return
            setProofLoading(true)
            setProofEdits(null)
            setProofNote('')
            setListError('')
            rpc('proofread', { jobId: job.jobId, terms: hotwords })
              .then(value => {
                setProofEdits(value.edits)
                setProofLoading(false)
              })
              .catch(error => {
                setProofLoading(false)
                setListError(`${dict.proofreadFailed}: ${String(error && error.message ? error.message : error)}`)
              })
          }

          function acceptEdit(index) {
            if (proofEdits === null) return
            const edit = proofEdits[index]
            if (edit === undefined) return
            setText(current => applyEdit(current, edit))
            setProofEdits(proofEdits.filter((_, i) => i !== index))
            setProofNote(dict.appliedNote)
          }

          function rejectEdit(index) {
            if (proofEdits === null) return
            setProofEdits(proofEdits.filter((_, i) => i !== index))
          }

          function acceptAllEdits() {
            if (proofEdits === null || proofEdits.length === 0) return
            const edits = proofEdits
            setText(current => edits.reduce((acc, edit) => applyEdit(acc, edit), current))
            setProofEdits([])
            setProofNote(`${dict.appliedNote}（${edits.length}）`)
          }

          function onAudioTime(e) {
            if (result === null) return
            const ms = e.currentTarget.currentTime * 1000
            let idx = -1
            for (let i = 0; i < result.segments.length; i++) {
              if (result.segments[i].startMs > ms) break
              if (ms < result.segments[i].endMs) { idx = i; break }
            }
            setActiveSeg(idx)
          }

          function seekToSegment(seg) {
            const audio = audioRef.current
            if (audio === null) return
            audio.currentTime = seg.startMs / 1000
            audio.play().catch(() => {})
          }

          function openSuggest(seg, segIndex, tokenIndex, token, anchor, x, y) {
            const key = `${segIndex}:${tokenIndex}`
            setSuggest({ key, text: token.text, anchor, x, y, candidates: null, loading: true, error: '' })
            rpc('suggest', { jobId: job === null ? '' : job.jobId, text: token.text, context: seg.text, terms: hotwords })
              .then(candidates => setSuggest(cur => cur !== null && cur.key === key ? { ...cur, candidates, loading: false } : cur))
              .catch(error => setSuggest(cur => cur !== null && cur.key === key ? { ...cur, error: String(error && error.message ? error.message : error), loading: false } : cur))
          }

          function applyCandidate(candidate) {
            if (suggest === null) return
            const original = suggest.text
            const anchor = suggest.anchor
            setText(current => {
              if (current.slice(anchor, anchor + original.length) === original) {
                return current.slice(0, anchor) + candidate + current.slice(anchor + original.length)
              }
              const at = current.indexOf(original)
              if (at === -1) return current
              return current.slice(0, at) + candidate + current.slice(at + original.length)
            })
            setFixedTokens(cur => ({ ...cur, [suggest.key]: candidate }))
            setSuggest(null)
            setProofNote(dict.appliedNote)
          }

          function renderSegmentText(seg, segIndex) {
            const lows = seg.lowTokens ?? []
            if (lows.length === 0) return seg.text
            const parts = []
            let cursor = 0
            lows.forEach((token, tokenIndex) => {
              const at = seg.text.indexOf(token.text, cursor)
              const key = `${segIndex}:${tokenIndex}`
              if (at === -1) return
              if (at > cursor) parts.push(seg.text.slice(cursor, at))
              const fixed = fixedTokens[key]
              parts.push(h('mark', {
                key,
                className: 'lt-lowconf' + (fixed !== undefined ? ' lt-fixed' : ''),
                title: dict.lowConfHint,
                onClick: e => {
                  e.stopPropagation()
                  if (fixed === undefined) openSuggest(seg, segIndex, tokenIndex, token, (segOffsets[segIndex] ?? 0) + at, e.clientX, e.clientY)
                }
              }, fixed ?? token.text))
              cursor = at + token.text.length
            })
            if (cursor < seg.text.length) parts.push(seg.text.slice(cursor))
            return parts
          }

          function startTranscribe() {
            if (files.length === 0) return
            setBusy(true)
            setResult(null)
            setSavedNote('')
            setCopiedNote('')
            setProofEdits(null)
            setProofNote('')
            setFixedTokens({})
            setSuggest(null)
            setActiveSeg(-1)
            const name = baseName.trim() || `${files[0].name.replace(/\.[^.]+$/, '')}${files.length > 1 ? `等${files.length}个文件` : ''}`
            const dir = outputDir.trim() || files[0].path.slice(0, files[0].path.lastIndexOf('/'))
            rpc('start', { paths: files.map(f => f.path), language, prompt, hotwords, baseName: name, outputDir: dir, markdown: true })
              .then(value => { setJob({ jobId: value.jobId, phase: 'converting', progress: 0, error: null, result: null, files: [] }) })
              .catch(error => { setBusy(false); setListError(String(error && error.message ? error.message : error)) })
          }

          function cancelJob() {
            if (job === null) return
            rpc('cancel', { jobId: job.jobId }).catch(() => {})
          }

          function saveEdits() {
            if (job === null || result === null) return
            rpc('save', { jobId: job.jobId, text }).then(value => {
              setSavedNote(`${dict.saved}${value.files.txt}`)
            }).catch(error => {
              setSavedNote(String(error && error.message ? error.message : error))
            })
          }

          function clearAll() {
            if (job !== null) rpc('clear', { jobId: job.jobId }).catch(() => {})
            setJob(null)
            setResult(null)
            setText('')
            setSavedNote('')
            setProofEdits(null)
            setProofNote('')
            setFixedTokens({})
            setSuggest(null)
            setActiveSeg(-1)
            setBusy(false)
          }

          function copyAll() {
            if (navigator.clipboard === undefined) return
            navigator.clipboard.writeText(text).then(() => {
              setCopiedNote(dict.copied)
              setTimeout(() => setCopiedNote(''), 1500)
            }).catch(() => {})
          }

          const totalDuration = files.reduce((sum, f) => sum + (f.durationSec ?? 0), 0)
          const running = job !== null && ['converting', 'transcribing', 'composing'].includes(job.phase)

          return h('div', {
            className: 'lt-page',
            onDragOver: e => {
              e.preventDefault()
              if (!running && uploading === 0) setDragging(true)
            },
            onDragLeave: e => {
              e.preventDefault()
              if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
            },
            onDrop: e => {
              e.preventDefault()
              setDragging(false)
              if (running || uploading > 0) return
              if (e.dataTransfer && e.dataTransfer.files) void handleDropped(e.dataTransfer.files)
            }
          },
            dragging ? h('div', { className: 'lt-drop-overlay' },
              h('div', { className: 'lt-drop-box' }, dict.dragActive)
            ) : null,
            h('div', { className: 'lt-header' },
              h('div', { className: 'lt-title' }, dict.title),
              h('div', { className: 'lt-subtitle' }, dict.subtitle)
            ),
            h('div', { className: 'lt-body' },
              h('div', { className: 'lt-col lt-col-left' },
                h('div', { className: 'lt-col-head' }, dict.filesSelected),
                h('div', { className: 'lt-toolbar' },
                  h('button', { className: 'lt-btn lt-btn-primary', disabled: running, onClick: () => setBrowserOpen(v => !v) }, dict.pickFiles),
                  h('button', { className: 'lt-btn', disabled: running, title: outputDir, onClick: async () => { const dir = uiWorkspace !== undefined ? await uiWorkspace.pickDirectory() : null; if (dir) setOutputDir(dir) } }, outputDir ? `${dict.outputDir}: ${outputDir.split('/').pop() || outputDir}` : dict.pickDir)
                ),
                browserOpen ? h('div', { className: 'lt-browser' },
                  h('div', { className: 'lt-browser-head' },
                    h('span', null, dict.browserTitle),
                    h('button', { className: 'lt-btn lt-btn-small', onClick: () => setBrowserOpen(false) }, dict.close)
                  ),
                  listError ? h('div', { className: 'lt-error' }, listError) : null,
                  listing === null ? h('div', { className: 'lt-muted' }, '…') : h('div', { className: 'lt-browser-body' },
                    h('div', { className: 'lt-crumbs' },
                      h('button', { className: 'lt-crumb', onClick: () => setListing({ ...listing, path: listing.home }) }, dict.home),
                      listing.crumbs.map(crumb => h('button', {
                        key: crumb.path, className: 'lt-crumb',
                        onClick: () => setListing({ ...listing, path: crumb.path })
                      }, crumb.name))
                    ),
                    h('div', { className: 'lt-browser-list' },
                      listing.entries.filter(e => e.dir || e.audio).map(entry => h('button', {
                        key: entry.path,
                        className: 'lt-row' + (entry.dir ? ' lt-row-dir' : '') + (files.some(f => f.path === entry.path) ? ' lt-row-selected' : ''),
                        onClick: () => { if (entry.dir) setListing({ ...listing, path: entry.path }); else addFile(entry) }
                      },
                        h('span', { className: 'lt-row-name' }, entry.dir ? `📁 ${entry.name}` : entry.name),
                        entry.dir ? null : h('span', { className: 'lt-row-meta' }, entry.size === null ? '' : `${(entry.size / 1048576).toFixed(1)} MB`)
                      ))
                    )
                  )
                ) : null,
                h('div', { className: 'lt-file-list' },
                  files.length === 0 ? h('div', { className: 'lt-muted' },
                    h('div', null, dict.emptyFiles),
                    h('div', { style: { marginTop: 6 } }, dict.dropHint)
                  ) :
                  files.map((file, index) => h('div', { key: file.path, className: 'lt-file-row' },
                    h('span', { className: 'lt-file-index' }, `${index + 1}.`),
                    h('span', { className: 'lt-file-name', title: file.path }, file.name),
                    h('span', { className: 'lt-file-duration' }, fmtDuration(file.durationSec)),
                    h('button', { className: 'lt-btn lt-btn-small', disabled: running || index === 0, onClick: () => moveFile(index, -1) }, '↑'),
                    h('button', { className: 'lt-btn lt-btn-small', disabled: running || index === files.length - 1, onClick: () => moveFile(index, 1) }, '↓'),
                    h('button', { className: 'lt-btn lt-btn-small', disabled: running, onClick: () => removeFile(file.path) }, '✕')
                  ))
                ),
                files.length > 0 ? h('div', { className: 'lt-footer' }, `${dict.totalDuration}: ${fmtDuration(totalDuration)} · ${files.length} ${dict.files}`) : null,
                uploading > 0 ? h('div', { className: 'lt-footer' }, `${dict.uploading} ${uploading}/${uploadTotal} …`) : null
              ),
              h('div', { className: 'lt-col lt-col-right' },
                h('div', { className: 'lt-col-head' },
                  dict.title,
                  files.length > 0 && !running ? h('span', { className: 'lt-spacer' }) : null,
                  files.length > 0 && !running ? h('button', { className: 'lt-btn lt-btn-primary', onClick: startTranscribe }, dict.start) : null,
                  running ? h('button', { className: 'lt-btn', onClick: cancelJob }, dict.cancel) : null,
                  job !== null && !running && result !== null ? h('button', { className: 'lt-btn', onClick: clearAll }, dict.clear) : null
                ),
                h('div', { className: 'lt-options' },
                  h('label', { className: 'lt-field' }, `${dict.language} `,
                    h('select', { value: language, disabled: running, onChange: e => setLanguage(e.target.value) },
                      h('option', { value: 'zh' }, '中文 zh'), h('option', { value: 'en' }, 'English en'), h('option', { value: 'auto' }, 'auto'))
                  ),
                  h('label', { className: 'lt-field lt-field-grow' }, `${dict.hotwords} `,
                    h('input', { type: 'text', value: hotwords, disabled: running, placeholder: dict.hotwordsPlaceholder, onChange: e => setHotwords(e.target.value) })),
                  h('label', { className: 'lt-field lt-field-grow' }, `${dict.prompt} `,
                    h('input', { type: 'text', value: prompt, disabled: running, placeholder: '（默认：以下是普通话的句子。）', onChange: e => setPrompt(e.target.value) }))
                ),
                running ? h('div', { className: 'lt-progress-wrap' },
                  h('div', { className: 'lt-progress-track' },
                    h('div', { className: 'lt-progress-fill', style: { width: `${job.progress ?? 0}%` } })),
                  h('div', { className: 'lt-muted' }, dict[job.phase] + (job.phase === 'transcribing' ? ` ${job.progress ?? 0}%` : ''))
                ) : null,
                job !== null && job.phase === 'error' ? h('div', { className: 'lt-error' }, `${dict.failed}: ${job.error}`) : null,
                job !== null && job.phase === 'cancelled' ? h('div', { className: 'lt-muted' }, dict.cancelled) : null,
                result === null ? h('div', { className: 'lt-empty' },
                  h('div', null,
                    h('div', null, dict.emptyResult),
                    h('div', { style: { marginTop: 8 } }, dict.dropHint))
                ) : h('div', { className: 'lt-result' },
                  h('div', { className: 'lt-result-head' },
                    h('span', { className: 'lt-muted' }, `${dict.done} · ${result.language} · ${fmtDuration(result.durationSec)} · ${result.segments.length} 段`),
                    h('span', { className: 'lt-spacer' }),
                    h('button', { className: 'lt-btn lt-btn-small', disabled: proofLoading, onClick: startProofread }, proofLoading ? dict.proofreading : dict.proofread),
                    h('button', { className: 'lt-btn lt-btn-small', onClick: copyAll }, copiedNote || dict.copy),
                    h('button', { className: 'lt-btn lt-btn-small lt-btn-primary', onClick: saveEdits }, dict.save),
                    savedNote ? h('span', { className: 'lt-saved' }, savedNote) : null
                  ),
                  proofNote ? h('div', { className: 'lt-saved' }, proofNote) : null,
                  proofEdits !== null && proofEdits.length === 0 ? h('div', { className: 'lt-saved' }, dict.noEdits) : null,
                  proofEdits !== null && proofEdits.length > 0 ? h('div', { className: 'lt-edit-list' },
                    h('div', { className: 'lt-edit-head' },
                      h('span', { className: 'lt-muted' }, `${proofEdits.length} ${dict.editsFound}`),
                      h('span', { className: 'lt-spacer' }),
                      h('button', { className: 'lt-btn lt-btn-small lt-btn-primary', onClick: acceptAllEdits }, dict.acceptAll),
                      h('button', { className: 'lt-btn lt-btn-small', onClick: () => setProofEdits([]) }, dict.rejectAll)
                    ),
                    proofEdits.map((edit, index) => h('div', { key: `${index}:${edit.before}`, className: 'lt-edit-row' },
                      h('div', { className: 'lt-edit-main' },
                        h('span', { className: 'lt-edit-before' }, edit.before),
                        h('span', { className: 'lt-edit-arrow' }, '→'),
                        h('span', { className: 'lt-edit-after' }, edit.after),
                        edit.reason ? h('span', { className: 'lt-edit-reason' }, edit.reason) : null
                      ),
                      h('div', { className: 'lt-edit-actions' },
                        h('button', { className: 'lt-btn lt-btn-small lt-btn-primary', onClick: () => acceptEdit(index) }, dict.accept),
                        h('button', { className: 'lt-btn lt-btn-small', onClick: () => rejectEdit(index) }, dict.reject)
                      )
                    ))
                  ) : null,
                  job !== null ? h('audio', {
                    className: 'lt-audio',
                    controls: true,
                    ref: audioRef,
                    src: `${location.origin}/local-transcribe/play/${job.jobId}`,
                    onTimeUpdate: onAudioTime,
                    onSeeked: onAudioTime
                  }) : null,
                  h('div', { className: 'lt-section-title' }, dict.transcript),
                  h('textarea', { className: 'lt-textarea', value: text, onChange: e => setText(e.target.value), spellCheck: false }),
                  h('div', { className: 'lt-section-title' }, dict.segments),
                  h('div', { className: 'lt-segments' },
                    result.segments.map((seg, index) => h('div', {
                      key: index,
                      className: 'lt-seg-row' + (index === activeSeg ? ' lt-seg-active' : ''),
                      title: dict.seekHint,
                      ref: el => { activeRefs.current[index] = el },
                      onClick: () => seekToSegment(seg)
                    },
                      h('span', { className: 'lt-seg-time' }, fmtClock(seg.startMs)),
                      h('span', { className: 'lt-seg-text' }, renderSegmentText(seg, index)))
                    )
                  ),
                  suggest !== null ? h('div', {
                    className: 'lt-popover',
                    style: { left: Math.min(suggest.x, window.innerWidth - 340), top: Math.min(suggest.y + 12, window.innerHeight - 240) }
                  },
                    h('div', { className: 'lt-popover-head' },
                      h('span', { className: 'lt-muted' }, `${dict.candidatesTitle}：「${suggest.text}」`),
                      h('span', { className: 'lt-spacer' }),
                      h('button', { className: 'lt-btn lt-btn-small', onClick: () => setSuggest(null) }, dict.close)
                    ),
                    suggest.loading ? h('div', { className: 'lt-muted' }, dict.candidatesLoading)
                      : suggest.error ? h('div', { className: 'lt-error' }, suggest.error)
                      : suggest.candidates === null || suggest.candidates.length === 0 ? h('div', { className: 'lt-muted' }, dict.candidatesEmpty)
                      : h('div', { className: 'lt-cand-list' },
                        h('div', { className: 'lt-muted' }, dict.applyCandidate),
                        suggest.candidates.map((cand, i) => h('button', { key: i, className: 'lt-cand-row', onClick: () => applyCandidate(cand.text) },
                          h('span', { className: 'lt-cand-text' }, cand.text),
                          cand.reason ? h('span', { className: 'lt-cand-reason' }, cand.reason) : null)))
                  ) : null
                )
              )
            )
          )
        }

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'transcribe',
          order: 20,
          label: () => {
            const locale = ctx.get('locale')
            const snap = locale === undefined ? {} : locale.getLocale()
            return String(snap.id ?? snap.locale ?? '').startsWith('zh') ? DICTS.zh.panelLabel : DICTS.en.panelLabel
          }
        }, PanelIcon))

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'transcribe'
        }, TranscribePanel))
      }
    }
  }
})

const CSS = `
.lt-page { display: flex; flex-direction: column; height: 100%; gap: 12px; padding: 16px 20px; box-sizing: border-box; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); overflow: auto; position: relative; }
.lt-drop-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent); pointer-events: none; }
.lt-drop-box { padding: 40px 64px; border: 2px dashed var(--dsw-alias-brand-primary); border-radius: 16px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 16px; font-weight: 600; }
.lt-header { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.lt-title { font-size: 16px; font-weight: 600; }
.lt-subtitle { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.lt-body { display: flex; gap: 12px; flex: 1; min-height: 0; align-items: stretch; }
.lt-col { display: flex; flex-direction: column; min-width: 0; min-height: 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.lt-col-left { width: 360px; flex-shrink: 0; }
.lt-col-right { flex: 1; }
.lt-col-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: 13px; font-weight: 600; }
.lt-toolbar { display: flex; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); flex-wrap: wrap; }
.lt-options { display: flex; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); flex-wrap: wrap; }
.lt-field { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.lt-field select, .lt-field input { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 4px 8px; font-size: 12px; }
.lt-field-grow { flex: 1; min-width: 200px; }
.lt-field-grow input { width: 100%; }
.lt-btn { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; }
.lt-btn:hover { border-color: var(--dsw-alias-brand-primary); }
.lt-btn:disabled { opacity: 0.5; cursor: default; }
.lt-btn-primary { background: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); border-color: var(--dsw-alias-brand-primary); font-weight: 600; }
.lt-btn-small { padding: 2px 7px; border-radius: 6px; }
.lt-spacer { flex: 1; }
.lt-browser { border-bottom: 1px solid var(--dsw-alias-border-l1); padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; min-height: 0; max-height: 46%; }
.lt-browser-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.lt-browser-body { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.lt-crumbs { display: flex; flex-wrap: wrap; gap: 2px; }
.lt-crumb { background: none; border: none; color: var(--dsw-alias-brand-primary); font-size: 12px; cursor: pointer; padding: 1px 3px; }
.lt-browser-list { overflow-y: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; max-height: 260px; }
.lt-row { display: flex; align-items: center; gap: 8px; width: 100%; background: none; border: none; border-bottom: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-primary); padding: 6px 10px; font-size: 12px; cursor: pointer; text-align: left; }
.lt-row:last-child { border-bottom: none; }
.lt-row:hover { background: var(--dsw-alias-bg-layer-2); }
.lt-row-dir { font-weight: 600; }
.lt-row-selected { background: var(--dsw-alias-bg-layer-2); }
.lt-row-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-row-meta { color: var(--dsw-alias-label-secondary); }
.lt-file-list { flex: 1; min-height: 0; overflow-y: auto; padding: 6px 10px; display: flex; flex-direction: column; gap: 4px; }
.lt-file-row { display: flex; align-items: center; gap: 6px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 5px 8px; font-size: 12px; background: var(--dsw-alias-bg-layer-2); }
.lt-file-index { color: var(--dsw-alias-label-secondary); }
.lt-file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-file-duration { color: var(--dsw-alias-label-secondary); }
.lt-footer { padding: 6px 12px; border-top: 1px solid var(--dsw-alias-border-l1); font-size: 11px; color: var(--dsw-alias-label-secondary); }
.lt-muted { color: var(--dsw-alias-label-secondary); font-size: 12px; }
.lt-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; white-space: pre-wrap; }
.lt-saved { color: var(--dsw-alias-state-success-primary); font-size: 12px; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-empty { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; color: var(--dsw-alias-label-secondary); font-size: 13px; text-align: center; }
.lt-progress-wrap { padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.lt-progress-track { height: 6px; border-radius: 3px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
.lt-progress-fill { height: 100%; background: var(--dsw-alias-brand-primary); border-radius: 3px; transition: width 0.3s ease; }
.lt-result { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; }
.lt-result-head { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.lt-audio { width: 100%; height: 32px; }
.lt-section-title { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
.lt-textarea { flex: 1; min-height: 180px; resize: none; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 10px; font-size: 13px; line-height: 1.7; font-family: inherit; }
.lt-segments { flex: 0 1 40%; min-height: 80px; overflow-y: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; display: flex; flex-direction: column; }
.lt-seg-row { display: flex; gap: 10px; padding: 5px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); border-left: 3px solid transparent; font-size: 12px; cursor: pointer; }
.lt-seg-row:last-child { border-bottom: none; }
.lt-seg-time { flex-shrink: 0; color: var(--dsw-alias-brand-primary); font-variant-numeric: tabular-nums; }
.lt-seg-text { flex: 1; }
.lt-edit-list { display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 8px; max-height: 220px; overflow-y: auto; }
.lt-edit-head { display: flex; align-items: center; gap: 8px; }
.lt-edit-row { display: flex; align-items: flex-start; gap: 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 6px 8px; background: var(--dsw-alias-bg-layer-2); }
.lt-edit-main { flex: 1; display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; font-size: 13px; }
.lt-edit-before { color: var(--dsw-alias-state-error-primary); text-decoration: line-through; }
.lt-edit-arrow { color: var(--dsw-alias-label-secondary); }
.lt-edit-after { color: var(--dsw-alias-state-success-primary); font-weight: 600; }
.lt-edit-reason { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.lt-edit-actions { display: flex; gap: 6px; flex-shrink: 0; }
.lt-seg-active { background: var(--dsw-alias-bg-layer-2); border-left: 3px solid var(--dsw-alias-brand-primary); }
.lt-lowconf { background: none; color: var(--dsw-alias-state-warn-primary); text-decoration: underline dotted; text-underline-offset: 3px; cursor: pointer; border-radius: 3px; padding: 0 1px; }
.lt-lowconf:hover { background: var(--dsw-alias-bg-layer-2); }
.lt-lowconf.lt-fixed { color: var(--dsw-alias-state-success-primary); text-decoration: none; cursor: default; }
.lt-popover { position: fixed; z-index: 1100; width: 320px; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.lt-popover-head { display: flex; align-items: center; gap: 8px; }
.lt-cand-list { display: flex; flex-direction: column; gap: 6px; }
.lt-cand-row { display: flex; align-items: baseline; gap: 8px; width: 100%; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 6px 10px; font-size: 13px; cursor: pointer; text-align: left; }
.lt-cand-row:hover { border-color: var(--dsw-alias-brand-primary); }
.lt-cand-text { color: var(--dsw-alias-state-success-primary); font-weight: 600; }
.lt-cand-reason { color: var(--dsw-alias-label-secondary); font-size: 11px; }
`
