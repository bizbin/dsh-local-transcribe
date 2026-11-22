// Speaker-diarization worker: runs the blocking sherpa-onnx (WASM) pipeline
// off the host event loop. Receives { wavPath, segmentationModel,
// embeddingModel, numClusters, threshold } and posts back the raw segments.
// ESM worker (package type: module); loaded fresh from disk on every job.
import { parentPort } from 'node:worker_threads'
import sherpa from 'sherpa-onnx'

parentPort.on('message', (message) => {
  try {
    const wave = sherpa.readWave(message.wavPath)
    if (wave.sampleRate !== 16000) {
      parentPort.postMessage({ ok: false, error: `说话人分离需要 16 kHz 单声道音频（实际 ${wave.sampleRate} Hz）` })
      return
    }
    const diarizer = sherpa.createOfflineSpeakerDiarization({
      segmentation: {
        pyannote: { model: message.segmentationModel, windowShiftRatio: 0.1 },
        numThreads: 1
      },
      embedding: { model: message.embeddingModel, numThreads: 1 },
      clustering: {
        numClusters: Number(message.numClusters ?? 0) > 0 ? Number(message.numClusters) : -1,
        threshold: Number(message.threshold ?? 0.5)
      },
      minDurationOn: 0.5,
      minDurationOff: 0.6
    })
    const segments = diarizer.process(wave.samples)
    diarizer.free()
    parentPort.postMessage({
      ok: true,
      segments: segments.map(s => ({ start: s.start, end: s.end, speaker: s.speaker }))
    })
  } catch (error) {
    parentPort.postMessage({ ok: false, error: String(error && error.message ? error.message : error) })
  }
})
