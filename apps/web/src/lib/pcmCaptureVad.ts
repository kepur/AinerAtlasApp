import { startPcmCapture as startPcmCaptureBase, type PcmCaptureHandle } from "./pcmCapture";

export type { PcmCaptureHandle };

export type PcmCaptureOptions = {
  /**
   * Omni 等服务端 VAD 模式必须为 false：静音也要推流，服务端才能判断话轮结束。
   * true = 仅推有声音片段（省流量，但会破坏 server_vad 断句）。
   */
  gateSilence?: boolean;
  /** RMS threshold 0–1; only used when gateSilence is true. */
  vadThreshold?: number;
};

function pcmRms(pcm: Int16Array): number {
  if (!pcm.length) return 0;
  let sum = 0;
  for (let i = 0; i < pcm.length; i += 1) {
    const n = pcm[i] / 32768;
    sum += n * n;
  }
  return Math.sqrt(sum / pcm.length);
}

export async function startPcmCapture(
  onChunk: (payload: { base64: string; sampleRate: number }) => void,
  options: PcmCaptureOptions = {}
): Promise<PcmCaptureHandle> {
  const gateSilence = options.gateSilence !== false ? true : false;
  const threshold = options.vadThreshold ?? 0.018;
  return startPcmCaptureBase(({ base64, sampleRate }) => {
    if (gateSilence) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      if (pcmRms(pcm) < threshold) return;
    }
    onChunk({ base64, sampleRate });
  });
}
