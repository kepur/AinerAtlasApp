import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../api";

type TtsCfg = { voice: string; speed: number; pitch: number; provider: string };

const DEFAULT_CFG: TtsCfg = { voice: "Cherry", speed: 0.9, pitch: 1.1, provider: "browser" };

/** Debounced TTS with session cache — shared by Chat and Game. */
export function useTts() {
  const [cfg, setCfg] = useState<TtsCfg>(DEFAULT_CFG);
  const cfgRef = useRef<TtsCfg>(DEFAULT_CFG);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingKeyRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, string>());
  // Resolves once the server TTS config has been fetched. speak() awaits this so
  // it never falls back to the robotic browser voice merely because the config
  // request has not resolved yet (e.g. the werewolf GM line that fires the
  // instant you enter the room).
  const readyRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  useEffect(() => {
    readyRef.current = fetch(`${API_BASE_URL}/api/config/tts`)
      .then((r) => r.json())
      .then((c: { tts_voice?: string; tts_speed?: number; tts_pitch?: number; tts_provider?: string }) => {
        const next: TtsCfg = {
          voice: c.tts_voice || DEFAULT_CFG.voice,
          speed: c.tts_speed || DEFAULT_CFG.speed,
          pitch: c.tts_pitch || DEFAULT_CFG.pitch,
          provider: c.tts_provider || DEFAULT_CFG.provider,
        };
        cfgRef.current = next;
        setCfg(next);
      })
      .catch(() => {});
  }, []);

  const speak = useCallback(async (text: string, lang?: string) => {
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

    // Make sure we know the configured provider before deciding browser vs server.
    if (readyRef.current) {
      try {
        await readyRef.current;
      } catch {
        /* fall through to whatever cfg we have */
      }
    }
    const cfg = cfgRef.current;

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
      const played = await new Promise<boolean>((resolve) => {
        audio.onended = () => {
          if (audioRef.current === audio) audioRef.current = null;
          resolve(true);
        };
        audio.onerror = () => {
          if (audioRef.current === audio) audioRef.current = null;
          resolve(false);
        };
        // play() rejects when the blob is invalid or autoplay is blocked — fall
        // back to the browser voice instead of failing silently.
        audio.play().catch(() => {
          if (audioRef.current === audio) audioRef.current = null;
          resolve(false);
        });
      });
      if (played) return;
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
  }, []);

  return { speak };
}
