const TARGET_SAMPLE_RATE = 16000;
const DEFAULT_SEND_BATCH_MS = 48;
const DEFAULT_MAX_PENDING_FRAMES = 10;

export type PcmCaptureStartOptions = {
  sendBatchMs?: number;
  maxPendingFrames?: number;
};

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < newLength) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  const step = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return btoa(binary);
}

function mergePcmFrames(frames: Int16Array[]): Int16Array {
  if (frames.length === 1) return frames[0];
  const total = frames.reduce((sum, frame) => sum + frame.length, 0);
  const merged = new Int16Array(total);
  let offset = 0;
  for (const frame of frames) {
    merged.set(frame, offset);
    offset += frame.length;
  }
  return merged;
}

export type PcmCaptureHandle = {
  stop: () => void;
  resume: () => Promise<void>;
  sampleRate: number;
};

import { assertMicrophoneAvailable } from "./microphone";

export async function startPcmCapture(
  onChunk: (payload: { base64: string; sampleRate: number }) => void,
  options: PcmCaptureStartOptions = {},
): Promise<PcmCaptureHandle> {
  const sendBatchMs = options.sendBatchMs ?? DEFAULT_SEND_BATCH_MS;
  const maxPendingFrames = options.maxPendingFrames ?? DEFAULT_MAX_PENDING_FRAMES;
  assertMicrophoneAvailable();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioContext = new AudioContext();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const muteGain = audioContext.createGain();
  muteGain.gain.value = 0;

  let stopped = false;
  const pendingFrames: Int16Array[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flushPending = () => {
    flushTimer = null;
    if (stopped || pendingFrames.length === 0) return;
    const frames = pendingFrames.splice(0, pendingFrames.length);
    const pcm = mergePcmFrames(frames);
    onChunk({
      base64: arrayBufferToBase64(
        pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength),
      ),
      sampleRate: TARGET_SAMPLE_RATE,
    });
  };

  const scheduleFlush = () => {
    if (flushTimer !== null) return;
    flushTimer = window.setTimeout(flushPending, sendBatchMs);
  };

  processor.onaudioprocess = (event) => {
    if (stopped) return;
    const channel = event.inputBuffer.getChannelData(0);
    const downsampled = downsampleBuffer(channel, audioContext.sampleRate, TARGET_SAMPLE_RATE);
    pendingFrames.push(floatTo16BitPCM(downsampled));
    if (pendingFrames.length >= maxPendingFrames) {
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushPending();
      return;
    }
    scheduleFlush();
  };

  source.connect(processor);
  processor.connect(muteGain);
  muteGain.connect(audioContext.destination);

  return {
    sampleRate: TARGET_SAMPLE_RATE,
    resume: async () => {
      if (stopped || audioContext.state === "running") return;
      await audioContext.resume().catch(() => {});
    },
    stop: () => {
      stopped = true;
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushPending();
      processor.disconnect();
      source.disconnect();
      muteGain.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void audioContext.close();
    },
  };
}
