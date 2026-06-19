import { Loader2, Mic, Square } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "../api";
import { attachSilenceMonitor, type SilenceMonitorHandle } from "../lib/audioSilenceMonitor";

type VoiceInputProps = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  /** hold = 微信式按住说话；tap = 点击开始，停顿或再点结束 */
  mode?: "hold" | "tap";
  /** Auto-stop after silence (tap mode only). Default 1200ms. */
  autoStopSilenceMs?: number;
  language?: string;
  className?: string;
  iconSize?: number;
  title?: string;
};

const HOLD_CANCEL_SLIDE_PX = 72;

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read audio"));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function VoiceInput({
  onTranscript,
  disabled = false,
  mode = "tap",
  autoStopSilenceMs = 1200,
  language = "en",
  className = "voice-input-btn",
  iconSize = 18,
  title,
}: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [holdCancel, setHoldCancel] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceRef = useRef<SilenceMonitorHandle | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stoppingRef = useRef(false);
  const touchStartYRef = useRef(0);
  const holdActiveRef = useRef(false);

  const cleanupStream = useCallback(() => {
    silenceRef.current?.stop();
    silenceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const finishRecorder = useCallback(async (submit: boolean) => {
    if (stoppingRef.current) return;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    stoppingRef.current = true;
    setProcessing(submit);
    setRecording(false);
    setHoldCancel(false);
    holdActiveRef.current = false;
    silenceRef.current?.stop();
    silenceRef.current = null;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    const stream = streamRef.current;
    cleanupStream();
    mediaRecorderRef.current = null;

    if (!submit) {
      chunksRef.current = [];
      stream?.getTracks().forEach((t) => t.stop());
      setProcessing(false);
      stoppingRef.current = false;
      return;
    }

    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      if (blob.size < 200) {
        onTranscript("");
        return;
      }
      const audioBase64 = await blobToBase64(blob);
      const data = await apiRequest<{ text: string }>("/api/voice/transcribe", {
        method: "POST",
        body: JSON.stringify({ audio_base64: audioBase64, language }),
      });
      if (data.text?.trim()) onTranscript(data.text.trim());
    } catch {
      onTranscript("");
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      setProcessing(false);
      stoppingRef.current = false;
    }
  }, [cleanupStream, language, onTranscript]);

  const stopRecording = useCallback(() => {
    void finishRecorder(true);
  }, [finishRecorder]);

  const cancelRecording = useCallback(() => {
    void finishRecorder(false);
  }, [finishRecorder]);

  const startRecording = useCallback(async () => {
    if (disabled || processing || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setHoldCancel(false);
      holdActiveRef.current = true;

      if (mode === "tap" && autoStopSilenceMs > 0) {
        silenceRef.current = attachSilenceMonitor(stream, {
          silenceMs: autoStopSilenceMs,
          onSilence: () => void stopRecording(),
        });
      }
    } catch {
      cleanupStream();
      setRecording(false);
      holdActiveRef.current = false;
    }
  }, [autoStopSilenceMs, cleanupStream, disabled, mode, processing, recording, stopRecording]);

  const endHold = useCallback(() => {
    if (!holdActiveRef.current) return;
    if (holdCancel) cancelRecording();
    else stopRecording();
  }, [cancelRecording, holdCancel, stopRecording]);

  const handleTap = () => {
    if (processing) return;
    if (recording) void stopRecording();
    else void startRecording();
  };

  const defaultTitle = recording
    ? (mode === "hold" ? "松开发送" : "点击结束 · 停顿 1.2s 自动发送")
    : (mode === "hold" ? "按住说话" : "点击说话 · 停顿自动发送");

  const holdOverlay = mode === "hold" && recording && typeof document !== "undefined"
    ? createPortal(
      <div className="voice-hold-overlay" aria-live="polite">
        <div className={`voice-hold-panel${holdCancel ? " voice-hold-panel--cancel" : ""}`}>
          <Mic size={28} className={holdCancel ? "voice-hold-icon-cancel" : "voice-hold-icon-active"} />
          <p className="voice-hold-title">{holdCancel ? "松开 取消" : "松开发送"}</p>
          <p className="voice-hold-hint">{holdCancel ? "" : "上滑取消"}</p>
        </div>
      </div>,
      document.body,
    )
    : null;

  if (mode === "hold") {
    return (
      <>
        {holdOverlay}
        <button
          type="button"
          className={`${className}${recording ? " recording" : ""}${processing ? " processing" : ""}`}
          disabled={disabled || processing}
          onMouseDown={(e) => {
            e.preventDefault();
            void startRecording();
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            endHold();
          }}
          onMouseLeave={() => {
            if (recording) endHold();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            touchStartYRef.current = t?.clientY ?? 0;
            setHoldCancel(false);
            void startRecording();
          }}
          onTouchMove={(e) => {
            if (!recording) return;
            const t = e.changedTouches[0];
            if (!t) return;
            const delta = touchStartYRef.current - t.clientY;
            setHoldCancel(delta >= HOLD_CANCEL_SLIDE_PX);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            endHold();
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            cancelRecording();
          }}
          onContextMenu={(e) => e.preventDefault()}
          title={title ?? defaultTitle}
          aria-label={title ?? defaultTitle}
        >
          {processing ? <Loader2 size={iconSize} className="spin" /> : <Mic size={iconSize} />}
        </button>
      </>
    );
  }

  return (
    <button
      type="button"
      className={`${className}${recording ? " recording" : ""}${processing ? " processing" : ""}`}
      disabled={disabled || processing}
      onClick={handleTap}
      title={title ?? defaultTitle}
      aria-label={title ?? defaultTitle}
    >
      {processing ? <Loader2 size={iconSize} className="spin" /> : recording ? <Square size={iconSize} /> : <Mic size={iconSize} />}
    </button>
  );
}
