# dsh-local-transcribe

A [DeepSeek Harness (DSH)](https://github.com/deepseek-ai) plugin for **fully-local speech-to-text** powered by [whisper.cpp](https://github.com/ggml-org/whisper.cpp). Everything runs on your machine — nothing is uploaded.

- 🎛 **Visual panel** (sidebar icon): drag & drop or browse local audio files, pick several and merge them into one recording, transcribe with live progress, preview the full text with a per-segment timeline, play back the merged audio, and **edit the transcript in place** before saving.
- 🎯 **Play-along highlight & confidence marks**: click a segment to play from there; while audio plays, the matching segment is highlighted and auto-scrolled. Whisper token probabilities (full-JSON output) mark low-confidence words in a distinct color — click one to see **candidate corrections** from the LLM and replace with one click.
- 👥 **Speaker separation**: optional local speaker diarization (sherpa-onnx + 3D-Speaker models, downloaded automatically on first use, ~45 MB). Segments are labelled 说话人1/2/… with color-coded rows, a clickable legend filter, and `【说话人N】` prefixes in the exported markdown.
- ✨ **Smart proofreading** (LLM-powered): one click runs a *faithful-correction* pass over the transcript — only homophone/terminology/punctuation mistakes are fixed, never rewrites. Suggestions come back as a **diff review list** (before → after + reason); accept or reject each one, or accept all.
- 🔥 **Hot words**: a topic/terminology field feeds both the whisper prompt (fewer homophone errors at transcription time) and the proofreader (term-aware corrections).
- 🤖 **Agent tool** `transcribe_audio`: every agent session can transcribe one file or merge several files (in order) into one continuous transcript, with optional `hotwords` and `diarize`.
- 🈶 Supports m4a / mp3 / wav / flac / aac / ogg / opus / wma / m4b / amr / aiff / aif / caf and video files (mp4 / mov / mkv / avi / webm / m4v / ts / 3gp / mpg / mpeg).
- 🔒 Panel–host communication is loopback-only (`127.0.0.1` / `localhost`), owned by the plugin context.

## Requirements

1. A running DSH (≥ 0.2.2-rc.1) with a web profile.
2. `ffmpeg` / `ffprobe` on PATH (`brew install ffmpeg` on macOS).
3. A **whisper.cpp** build with the `whisper-cli` executable, plus a **ggml model**:
   ```bash
   git clone https://github.com/ggml-org/whisper.cpp
   cd whisper.cpp && cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build -j
   # model, e.g. Chinese-friendly medium (~1.5 GB):
   curl -L -o ggml-medium.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
   ```

## Install

Clone the repository and install the bundle from the Plugin Manager, or install it directly:

```bash
git clone https://github.com/bizbin/dsh-local-transcribe
cd dsh-local-transcribe && pnpm install   # installs sherpa-onnx (speaker separation)
# In DSH, ask the agent (or use the Plugin Manager UI) to:
#   install_bundle <absolute path to dsh-local-transcribe>
```

Speaker-separation models (segmentation + speaker embedding, ~45 MB) are downloaded automatically on first use into `~/.dsh/storages/local-transcribe-models/diarization` (override with `diarizationModelDir`).

## Configure

In your profile's `cordis.patch.yml`, set the `local-transcribe` row's `config`:

```yaml
- id: local-transcribe
  config:
    whisperCli: /path/to/whisper.cpp/build/bin/whisper-cli
    model: /path/to/ggml-medium.bin
    # ffmpeg: ffmpeg            # command on PATH by default
    # ffprobe: ffprobe
    # language: zh              # default transcription language ('auto' to detect)
    # prompt: '以下是普通话的句子。'
    # threads: 10
```

| Key | Default | Meaning |
| --- | --- | --- |
| `whisperCli` | `whisper-cli` (PATH) | whisper-cli executable |
| `model` | *(required)* | absolute path of the ggml model file |
| `ffmpeg` / `ffprobe` | `ffmpeg` / `ffprobe` | commands on PATH or absolute paths |
| `language` | `zh` | default language code |
| `prompt` | `以下是普通话的句子。` | initial whisper prompt |
| `threads` | `10` | whisper-cli thread count |
| `proofreadProvider` | `deepseek-official` | DSH llm-service provider route used for smart proofreading |
| `proofreadModel` | `deepseek-v4-pro` | model used for smart proofreading |
| `lowConfidenceThreshold` | `0.5` | whisper token probability (0–1) below which words are marked low-confidence in the panel |
| `diarizationModelDir` | *(auto)* | directory for the speaker-separation models |
| `diarizationNumSpeakers` | `0` | known speaker count for diarization (`0` = auto-detect) |
| `diarizationThreshold` | `0.5` | clustering threshold (0–1; higher merges more aggressively) |

## Panel

Open the waveform icon in the sidebar. Then either **drag audio files onto the panel** (they are uploaded to `~/.dsh/storages/local-transcribe-uploads/`, 500 MB per file) or browse the filesystem. Order the selected files, fill in **hot words** (names/terms/topics), pick an output directory, language and prompt, and press **Transcribe**. While running you see the phase and percentage; when done you get the transcript, a segment timeline, and merged-audio playback. **Click any segment to play from there** — the playing segment stays highlighted and scrolls into view. Words whisper transcribed with low confidence (token probability below `lowConfidenceThreshold`) are underlined in a warning color: **click one to fetch candidate corrections** and click a candidate to replace it in the editable transcript.

Tick **Speaker separation** to run local diarization (set the known speaker count or leave *Auto*): segments get color-coded speaker labels, a legend lets you filter by speaker, and the exported markdown carries `【说话人N】` prefixes. Diarization runs in a worker thread and takes roughly 0.6× the audio duration (WASM runtime).

Press **Smart proofread** to run the faithful-correction pass: the suggestions appear as a diff list (`before → after` with a reason). Accept or reject each suggestion, or accept all — accepted edits are applied to the editable transcript immediately. Then press **Save edits** — the plugin rewrites `<name>_原始转写.txt` and regenerates `<name>_转写稿.md`. The proofreader uses the DSH `llm` service (`proofreadProvider` / `proofreadModel` config), so it works with whatever provider your profile has configured.

Outputs (next to the first input, or `output_dir`):

- `<name>_原始转写.txt` — plain text
- `<name>_带时间轴.json` — segments with millisecond timestamps
- `<name>_转写稿.md` — markdown, one heading per minute

## Agent tool

`transcribe_audio` — one file via `path`, or several merged in order via `paths`; `language`, `prompt`, `hotwords` (comma-separated words injected into the whisper prompt), `diarize` + `diarize_num_speakers` (speaker separation, segments gain a 1-based `speaker` field), `output_dir`, `output_name`, `markdown`, `keep_wav` options. The tool returns the full text, the segment timeline, and the output file paths.

## Security notes

- Transcription uses only local binaries; audio never leaves the machine.
- The panel's HTTP routes (`/local-transcribe/rpc`, `/local-transcribe/upload`, `/local-transcribe/play/*`) accept requests from loopback only, and are removed when the plugin unloads.

## License

[MIT](LICENSE)

---

# dsh-local-transcribe（中文说明）

基于 [whisper.cpp](https://github.com/ggml-org/whisper.cpp) 的 DeepSeek Harness（DSH）插件，**完全本地**完成语音转文本，音频不出本机。

- **可视化面板**（侧边栏波形图标）：拖拽或浏览选择音频文件，多个文件按顺序合并为一段整体识别，实时显示进度；完成后可预览全文与分段时间轴、试听合并音频、**就地编辑文本并保存**（重写 txt 并重新生成 markdown）。
- **说话人分离**：可选的本地说话人分离（sherpa-onnx + 3D-Speaker 模型，首次使用自动下载，约 45MB）。段落按说话人编号（说话人1/2…）分色显示，图例可点击筛选，导出 markdown 带【说话人N】前缀。
- **智能勘误**（LLM）：一键执行「忠实勘误」——只改同音字/术语/标点错误，绝不改写语义；结果以 **diff 审阅列表**（原文 → 修正 + 理由）呈现，逐条接受/拒绝或全部接受，接受后立即应用到可编辑文本。
- **主题词**：主题/术语输入框同时喂给 whisper prompt（转录时减少同音错字）和智能勘误（按词表修正术语）。
- **智能体工具** `transcribe_audio`：任意会话可调用，支持单个文件或 `paths` 数组合并识别，带 `hotwords` 参数。
- 支持 m4a / mp3 / wav / flac / aac / ogg / opus / wma / m4b / amr / aiff / aif / caf 等音频与 mp4 / mov / mkv 等视频。
- 面板与宿主通过仅限环回地址的 HTTP 路由通信，随插件卸载自动注销。

**依赖**：DSH ≥ 0.2.2-rc.1；ffmpeg/ffprobe；whisper.cpp 编译出的 `whisper-cli` 与一个 ggml 模型（下载命令见上文）。安装后在本 profile 的 `cordis.patch.yml` 中配置 `whisperCli` 与 `model` 两个路径即可使用。
