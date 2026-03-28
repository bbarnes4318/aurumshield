/* ================================================================
   AUDIO UTILITIES — Low-level PCM audio capture and playback
   
   Handles:
   1. Microphone capture → 16kHz PCM Int16 → base64 chunks
   2. Playback of incoming 24kHz PCM base64 → AudioContext
   3. Barge-in interruption (flush playback buffer)
   ================================================================ */

/* ---------- Constants ---------- */

/** Gemini Live API expects 16kHz PCM input */
const INPUT_SAMPLE_RATE = 16000;
/** Gemini Live API outputs 24kHz PCM */
const OUTPUT_SAMPLE_RATE = 24000;
/** Chunk size in samples (~100ms at 16kHz) */
const CHUNK_SIZE = 1600;

/* ---------- PCM ↔ Base64 Utilities ---------- */

export function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToPcm(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

/* ---------- Volume Computation ---------- */

/**
 * Compute RMS volume level from PCM data, normalized to 0-1.
 */
export function computeVolume(pcm: Int16Array): number {
  if (pcm.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < pcm.length; i++) {
    const normalized = pcm[i] / 32768;
    sumSq += normalized * normalized;
  }
  return Math.sqrt(sumSq / pcm.length);
}

/* ---------- Microphone Stream ---------- */

/**
 * AudioWorklet processor source code (inlined as a data URI).
 * Collects raw PCM samples from the microphone and posts them
 * to the main thread as Int16Array chunks.
 */
const WORKLET_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(${CHUNK_SIZE});
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channel = input[0];
    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._offset++] = channel[i];
      if (this._offset >= ${CHUNK_SIZE}) {
        // Convert float32 [-1, 1] to int16 [-32768, 32767]
        const pcm = new Int16Array(${CHUNK_SIZE});
        for (let j = 0; j < ${CHUNK_SIZE}; j++) {
          const s = Math.max(-1, Math.min(1, this._buffer[j]));
          pcm[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        this.port.postMessage(pcm.buffer, [pcm.buffer]);
        this._buffer = new Float32Array(${CHUNK_SIZE});
        this._offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

export interface MicrophoneStream {
  /** Stop capturing and release resources */
  stop: () => void;
}

/**
 * Opens the user's microphone, resamples to 16kHz, and streams
 * PCM chunks to the provided callback as base64 strings.
 */
export async function createMicrophoneStream(
  onChunk: (base64Pcm: string) => void,
): Promise<MicrophoneStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: INPUT_SAMPLE_RATE,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
  const source = audioCtx.createMediaStreamSource(stream);

  // Register the worklet from an inline data URI
  const workletBlob = new Blob([WORKLET_SOURCE], { type: "application/javascript" });
  const workletUrl = URL.createObjectURL(workletBlob);
  await audioCtx.audioWorklet.addModule(workletUrl);
  URL.revokeObjectURL(workletUrl);

  const workletNode = new AudioWorkletNode(audioCtx, "pcm-capture-processor");
  workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    const pcm = new Int16Array(event.data);
    onChunk(pcmToBase64(pcm));
  };

  source.connect(workletNode);
  // Don't connect to destination — we don't want mic playback

  return {
    stop: () => {
      workletNode.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      audioCtx.close().catch(() => {});
    },
  };
}

/* ---------- Audio Player ---------- */

export interface AudioPlayer {
  /** Queue a base64-encoded PCM chunk for playback */
  enqueue: (base64Pcm: string) => void;
  /** Flush all queued audio (used for barge-in interruption) */
  interrupt: () => void;
  /** Whether audio is currently playing */
  isPlaying: () => boolean;
  /** Get current volume level (0-1) */
  getVolume: () => number;
  /** Release all resources */
  destroy: () => void;
}

/**
 * Creates a player that queues incoming PCM chunks and plays them
 * back sequentially at 24kHz. Supports barge-in interruption.
 */
export function createAudioPlayer(): AudioPlayer {
  const audioCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
  let queue: AudioBuffer[] = [];
  let currentSource: AudioBufferSourceNode | null = null;
  let playing = false;
  let lastVolume = 0;
  let destroyed = false;

  function playNext() {
    if (destroyed || queue.length === 0) {
      playing = false;
      lastVolume = 0;
      return;
    }

    playing = true;
    const buffer = queue.shift()!;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    currentSource = source;

    // Compute volume from the buffer data
    const channelData = buffer.getChannelData(0);
    let sumSq = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSq += channelData[i] * channelData[i];
    }
    lastVolume = Math.sqrt(sumSq / channelData.length);

    source.onended = () => {
      currentSource = null;
      playNext();
    };

    source.start();
  }

  return {
    enqueue(base64Pcm: string) {
      if (destroyed) return;

      const pcm = base64ToPcm(base64Pcm);
      const floats = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) {
        floats[i] = pcm[i] / 32768;
      }

      const buffer = audioCtx.createBuffer(1, floats.length, OUTPUT_SAMPLE_RATE);
      buffer.getChannelData(0).set(floats);
      queue.push(buffer);

      // If not currently playing, start
      if (!playing) {
        playNext();
      }
    },

    interrupt() {
      queue = [];
      if (currentSource) {
        try {
          currentSource.stop();
        } catch {
          // Already stopped
        }
        currentSource = null;
      }
      playing = false;
      lastVolume = 0;
    },

    isPlaying() {
      return playing;
    },

    getVolume() {
      return lastVolume;
    },

    destroy() {
      destroyed = true;
      this.interrupt();
      audioCtx.close().catch(() => {});
    },
  };
}
