import { useCallback, useRef, useState } from "react";
import { Volume2, Loader, Pause, AlertCircle } from "lucide-react";
import { useAudioCacheStore } from "../stores/audioCacheStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TTSState = "idle" | "loading" | "playing" | "paused" | "failed";

type TTSButtonProps = {
  text: string;
  lang?: string;
  /** Provider/preset voice id to read this line in (per-character voice). */
  voice?: string;
  size?: number;
  className?: string;
};

/** Browser speechSynthesis fallback so 朗读 always produces audio, even when
 *  no server-side TTS provider/key is configured. */
function browserSpeak(text: string, lang: string, voice: string, onEnd: () => void): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang?.startsWith("zh") ? "zh-CN" : "en-US";
    // Pick a female/male browser voice to roughly match the bound voice.
    const voices = window.speechSynthesis.getVoices();
    const wantFemale = /female|warm|lively|nova|shimmer|cherry/i.test(voice);
    const match = voices.find((v) =>
      v.lang.startsWith(u.lang.slice(0, 2)) &&
      (wantFemale ? /female|woman|samantha|tingting|mei|nova/i.test(v.name) : true)
    ) || voices.find((v) => v.lang.startsWith(u.lang.slice(0, 2)));
    if (match) u.voice = match;
    u.onend = onEnd;
    u.onerror = onEnd;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TTSButton({
  text,
  lang,
  voice = "auto",
  size = 16,
  className = "",
}: TTSButtonProps) {
  const [state, setState] = useState<TTSState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = useCallback(async () => {
    // loading → no-op
    if (state === "loading") return;

    // playing → pause
    if (state === "playing") {
      audioRef.current?.pause();
      setState("paused");
      return;
    }

    // paused → resume
    if (state === "paused") {
      try {
        await audioRef.current?.play();
        setState("playing");
      } catch {
        setState("failed");
      }
      return;
    }

    // idle | failed → load & play
    setState("loading");
    try {
      const url = await useAudioCacheStore.getState().getOrFetch(text, lang, voice);

      // Create or reuse Audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
      }
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => setState("idle");
      audio.onerror = () => setState("failed");

      await audio.play();
      setState("playing");
    } catch {
      // Server TTS unavailable → fall back to the browser's speech synthesis.
      const ok = browserSpeak(text, lang || "en", voice, () => setState("idle"));
      setState(ok ? "playing" : "failed");
    }
  }, [state, text, lang, voice]);

  // ----- Icon selection -----
  let icon: React.ReactNode;
  switch (state) {
    case "idle":
      icon = <Volume2 size={size} />;
      break;
    case "loading":
      icon = <Loader size={size} className="tts-spin" />;
      break;
    case "playing":
      icon = <Volume2 size={size} className="tts-playing" />;
      break;
    case "paused":
      icon = <Pause size={size} />;
      break;
    case "failed":
      icon = <AlertCircle size={size} />;
      break;
  }

  return (
    <button
      type="button"
      className={`tts-btn ${state} ${className}`.trim()}
      onClick={() => void handleClick()}
      title={
        state === "failed"
          ? "播放失败，点击重试"
          : state === "playing"
            ? "暂停"
            : state === "paused"
              ? "继续播放"
              : "播放"
      }
    >
      {icon}
    </button>
  );
}
