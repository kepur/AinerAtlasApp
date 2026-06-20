import { Loader2, Mic, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "../api";
import { attachSilenceMonitor, type SilenceMonitorHandle } from "../lib/audioSilenceMonitor";
import { createMediaRecorder, pickRecorderFormat, type RecorderFormat } from "../lib/audioRecorder";
import { assertMicrophoneAvailable } from "../lib/microphone";
import "./VoiceInput.css";

type VoiceInputProps = {
  onTranscript: (text: string) => void;
  /** Shown when mic denied, too short, or ASR returned empty / failed */
  onError?: (message: string) => void;
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
const MIN_AUDIO_BYTES = 400;

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
  onError,
  disabled = false,
  mode = "tap",
  autoStopSilenceMs = 1200,
  language = "auto",
  className = "voice-input-glass",
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
  const pointerStartYRef = useRef(0);
  const holdActiveRef = useRef(false);
  const recordingRef = useRef(false);
  const pendingStartRef = useRef(false);
  const cancelOnStartRef = useRef(false);
  const holdCancelRef = useRef(false);
  const pointerDownRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const formatRef = useRef<RecorderFormat>(pickRecorderFormat());

  const reportError = useCallback((message: string) => {
    onError?.(message);
  }, [onError]);

  const cleanupStream = useCallback(() => {
    silenceRef.current?.stop();
    silenceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const resetRecordingUi = useCallback(() => {
    recordingRef.current = false;
    holdActiveRef.current = false;
    pointerDownRef.current = false;
    holdCancelRef.current = false;
    setRecording(false);
    setHoldCancel(false);
  }, []);

  const abortRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    cleanupStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        try {
          recorder.stop();
        } catch {
          resolve();
        }
      });
    }
    resetRecordingUi();
  }, [cleanupStream, resetRecordingUi]);

  const finishRecorder = useCallback(async (submit: boolean) => {
    if (stoppingRef.current) return;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      resetRecordingUi();
      return;
    }

    stoppingRef.current = true;
    setProcessing(submit);
    resetRecordingUi();
    silenceRef.current?.stop();
    silenceRef.current = null;

    if (recorder.state === "recording") {
      try {
        recorder.requestData();
      } catch {
        /* ignore */
      }
    }

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      try {
        recorder.stop();
      } catch {
        resolve();
      }
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
      const format = formatRef.current;
      const blob = new Blob(chunksRef.current, { type: format.blobType });
      chunksRef.current = [];

      if (blob.size < MIN_AUDIO_BYTES) {
        reportError("说话时间太短或未检测到声音，请再试一次");
        onTranscript("");
        return;
      }

      const audioBase64 = await blobToBase64(blob);
      const data = await apiRequest<{ text: string; provider?: string }>("/api/voice/transcribe", {
        method: "POST",
        body: JSON.stringify({
          audio_base64: audioBase64,
          mime_type: format.blobType,
          language: language === "auto" ? "" : language,
        }),
      });

      const text = data.text?.trim() ?? "";
      if (text) {
        onTranscript(text);
        return;
      }

      if (data.provider === "none") {
        reportError("语音识别服务未配置或暂时不可用，请改用文字输入");
      } else {
        reportError("未识别到语音内容，请靠近麦克风清晰说话后再试");
      }
      onTranscript("");
    } catch (err) {
      console.error("Voice transcribe failed:", err);
      reportError(err instanceof Error ? err.message : "语音识别失败，请重试");
      onTranscript("");
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      setProcessing(false);
      stoppingRef.current = false;
    }
  }, [cleanupStream, language, onTranscript, reportError, resetRecordingUi]);

  const stopRecording = useCallback(() => {
    void finishRecorder(true);
  }, [finishRecorder]);

  const cancelRecording = useCallback(() => {
    if (pendingStartRef.current) {
      cancelOnStartRef.current = true;
      return;
    }
    void finishRecorder(false);
  }, [finishRecorder]);

  const startRecording = useCallback(async () => {
    if (disabled || processing || recordingRef.current || pendingStartRef.current) return;
    pendingStartRef.current = true;
    cancelOnStartRef.current = false;
    try {
      assertMicrophoneAvailable();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (cancelOnStartRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      formatRef.current = pickRecorderFormat();
      const recorder = createMediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;

      if (cancelOnStartRef.current) {
        await abortRecording();
        return;
      }

      recordingRef.current = true;
      if (mode === "hold") {
        holdActiveRef.current = true;
      }
      setRecording(true);
      setHoldCancel(false);
      holdCancelRef.current = false;

      const silenceMs = mode === "tap" ? autoStopSilenceMs : 0;
      if (silenceMs > 0) {
        silenceRef.current = attachSilenceMonitor(stream, {
          silenceMs,
          onSilence: () => void stopRecording(),
        });
      }
    } catch (err) {
      await abortRecording();
      reportError(
        err instanceof Error
          ? err.message
          : "无法访问麦克风，请在浏览器设置中允许麦克风权限",
      );
    } finally {
      pendingStartRef.current = false;
    }
  }, [abortRecording, autoStopSilenceMs, disabled, mode, processing, reportError, stopRecording]);

  const endHold = useCallback(() => {
    pointerDownRef.current = false;
    if (pendingStartRef.current) {
      cancelOnStartRef.current = true;
      return;
    }
    if (!holdActiveRef.current) return;
    if (holdCancelRef.current) cancelRecording();
    else stopRecording();
  }, [cancelRecording, stopRecording]);

  useEffect(() => {
    if (mode !== "hold") return;
    if (!recording) return;
    const onGlobalPointerUp = () => {
      if (pointerDownRef.current || holdActiveRef.current) {
        endHold();
      }
    };
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("pointercancel", onGlobalPointerUp);
    return () => {
      window.removeEventListener("pointerup", onGlobalPointerUp);
      window.removeEventListener("pointercancel", onGlobalPointerUp);
    };
  }, [mode, recording, endHold]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || processing) return;
    e.preventDefault();
    pointerDownRef.current = true;
    pointerStartYRef.current = e.clientY;
    holdCancelRef.current = false;
    setHoldCancel(false);
    buttonRef.current?.setPointerCapture(e.pointerId);
    void startRecording();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (mode !== "hold" || (!recordingRef.current && !pendingStartRef.current)) return;
    const delta = pointerStartYRef.current - e.clientY;
    const cancel = delta >= HOLD_CANCEL_SLIDE_PX;
    holdCancelRef.current = cancel;
    setHoldCancel(cancel);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (buttonRef.current?.hasPointerCapture(e.pointerId)) {
      buttonRef.current.releasePointerCapture(e.pointerId);
    }
    if (mode === "hold") endHold();
  };

  const handleTap = () => {
    if (processing || pendingStartRef.current) return;
    if (recordingRef.current) void stopRecording();
    else void startRecording();
  };

  const defaultTitle = recording
    ? (mode === "hold" ? "松开发送" : "点击结束 · 停顿 1.2s 自动发送")
    : (mode === "hold" ? "按住说话" : "点击说话 · 停顿自动发送");

  const btnClass = [
    className,
    recording ? "recording" : "",
    processing ? "processing" : "",
    mode === "hold" ? "voice-input-glass--hold" : "voice-input-glass--tap",
  ].filter(Boolean).join(" ");

  const holdOverlay = mode === "hold" && recording && typeof document !== "undefined"
    ? createPortal(
      <div className="voice-hold-overlay" aria-live="polite">
        <div className={`voice-hold-panel${holdCancel ? " voice-hold-panel--cancel" : ""}`}>
          <button
            type="button"
            className="voice-hold-dismiss"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => void cancelRecording()}
            aria-label="取消录音"
          >
            <X size={18} />
          </button>
          <div className="voice-hold-orb">
            <Mic size={28} className={holdCancel ? "voice-hold-icon-cancel" : "voice-hold-icon-active"} />
          </div>
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
          ref={buttonRef}
          type="button"
          className={btnClass}
          disabled={disabled || processing}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
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
      ref={buttonRef}
      type="button"
      className={btnClass}
      disabled={disabled || processing}
      onClick={handleTap}
      title={title ?? defaultTitle}
      aria-label={title ?? defaultTitle}
    >
      {processing ? <Loader2 size={iconSize} className="spin" /> : recording ? <Square size={iconSize} /> : <Mic size={iconSize} />}
    </button>
  );
}
