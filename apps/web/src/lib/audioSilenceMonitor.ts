/** Detect trailing silence on a mic stream; fire once when quiet long enough after speech. */

export type SilenceMonitorOptions = {
  /** Ms of silence after last sound before callback (default 1200). */
  silenceMs?: number;
  /** RMS 0–1; below = silence (default 0.018). */
  threshold?: number;
  /** Require this much voiced audio before silence can trigger (default 350). */
  minSpeechMs?: number;
  onSilence: () => void;
};

export type SilenceMonitorHandle = {
  stop: () => void;
};

function rmsFromTimeDomain(data: Uint8Array): number {
  if (!data.length) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const n = (data[i] - 128) / 128;
    sum += n * n;
  }
  return Math.sqrt(sum / data.length);
}

export function attachSilenceMonitor(
  stream: MediaStream,
  options: SilenceMonitorOptions,
): SilenceMonitorHandle {
  const silenceMs = options.silenceMs ?? 1200;
  const threshold = options.threshold ?? 0.018;
  const minSpeechMs = options.minSpeechMs ?? 350;

  const audioCtx = new AudioContext();
  void audioCtx.resume().catch(() => {});
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const buf = new Uint8Array(analyser.fftSize);
  let raf = 0;
  let stopped = false;
  let fired = false;
  let speechStartedAt: number | null = null;
  let lastSoundAt = 0;

  const tick = () => {
    if (stopped || fired) return;
    analyser.getByteTimeDomainData(buf);
    const rms = rmsFromTimeDomain(buf);
    const now = performance.now();

    if (rms >= threshold) {
      if (speechStartedAt === null) speechStartedAt = now;
      lastSoundAt = now;
    } else if (
      speechStartedAt !== null
      && lastSoundAt - speechStartedAt >= minSpeechMs
      && now - lastSoundAt >= silenceMs
    ) {
      fired = true;
      options.onSilence();
      return;
    }

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      source.disconnect();
      void audioCtx.close().catch(() => {});
    },
  };
}
