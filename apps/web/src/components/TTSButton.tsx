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
  size?: number;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TTSButton({
  text,
  lang,
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
      const url = await useAudioCacheStore.getState().getOrFetch(text, lang);

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
      setState("failed");
    }
  }, [state, text, lang]);

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
