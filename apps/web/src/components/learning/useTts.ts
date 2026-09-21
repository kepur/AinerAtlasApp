import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../api";
import { useContentLanguage } from "../../hooks/useContentLanguage";

type TtsCfg = { voice: string; speed: number; pitch: number; provider: string };

// An empty voice lets the server pick the neural voice for the content's
// language (see app/services/tts_profile.py). Hardcoding a Chinese voice here
// made every language request one.
const DEFAULT_CFG: TtsCfg = { voice: "", speed: 0.9, pitch: 1.1, provider: "edge" };

/** Debounced TTS with session cache — shared by Chat and Game. */
export function useTts(explicitLanguage?: string) {
  const contentLanguage = useContentLanguage();
  const defaultLanguage = explicitLanguage || contentLanguage;
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
    lang = lang || defaultLanguage;
    if (!text) return;
    const key = `${text}|${lang || ""}`;

    if (pendingKeyRef.current === key) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      pendingKeyRef.current = null;
    }

    // Make sure the configured backend voice is known before synthesizing.
    if (readyRef.current) {
      try {
        await readyRef.current;
      } catch {
        /* fall through to whatever cfg we have */
      }
    }
    const cfg = cfgRef.current;

    let src = cacheRef.current.get(key);

    if (!src) {
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
        // play() rejects when the blob is invalid or autoplay is blocked.
        audio.play().catch(() => {
          if (audioRef.current === audio) audioRef.current = null;
          resolve(false);
        });
      });
      if (played) return;
    }

    // Do not fall back to OS/browser speech synthesis. A failed server TTS
    // request stays silent so every successful playback uses the configured
    // backend provider consistently.
  }, [defaultLanguage]);

  useEffect(() => () => {
    abortRef.current?.abort();
    audioRef.current?.pause();
    audioRef.current = null;
  }, [defaultLanguage]);

  return { speak };
}
