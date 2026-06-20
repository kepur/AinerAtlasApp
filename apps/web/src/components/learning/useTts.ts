import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../api";

/** Debounced TTS with session cache — shared by Chat and Game. */
export function useTts() {
  const [cfg, setCfg] = useState({ voice: "Cherry", speed: 0.9, pitch: 1.1, provider: "browser" });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingKeyRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/config/tts`)
      .then((r) => r.json())
      .then((c: { tts_voice?: string; tts_speed?: number; tts_pitch?: number; tts_provider?: string }) =>
        setCfg({
          voice: c.tts_voice || "Cherry",
          speed: c.tts_speed || 0.9,
          pitch: c.tts_pitch || 1.1,
          provider: c.tts_provider || "browser",
        })
      )
      .catch(() => {});
  }, []);

  const speak = useCallback(
    async (text: string, lang?: string) => {
      if (!text) return;
      const key = `${text}|${lang || ""}`;

      if (pendingKeyRef.current === key) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis?.cancel();

      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
        pendingKeyRef.current = null;
      }

      let src = cacheRef.current.get(key);

      if (!src && cfg.provider && cfg.provider !== "browser") {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        pendingKeyRef.current = key;
        try {
          const resp = await fetch(`${API_BASE_URL}/api/voice/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voice: cfg.voice, speed: cfg.speed, language: lang || "" }),
            signal: ctrl.signal,
          });
          if (resp.ok) {
            const d = (await resp.json()) as { audio_url?: string; audio_base64?: string };
            src = d.audio_url || (d.audio_base64 ? `data:audio/mpeg;base64,${d.audio_base64}` : "");
            if (src) cacheRef.current.set(key, src);
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
        abortRef.current = null;
        pendingKeyRef.current = null;
      }

      if (src) {
        const audio = new Audio(src);
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            if (audioRef.current === audio) audioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            if (audioRef.current === audio) audioRef.current = null;
            resolve();
          };
          audio.play().catch(() => resolve());
        });
        return;
      }

      if (!window.speechSynthesis) return;
      await new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang || (/[一-鿿]/.test(text) ? "zh-CN" : "en-US");
        u.rate = cfg.speed;
        u.pitch = cfg.pitch;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      });
    },
    [cfg]
  );

  return { speak };
}
