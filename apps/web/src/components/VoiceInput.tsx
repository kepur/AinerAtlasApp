import { Mic, Square } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { API_BASE_URL } from "../api";

type VoiceInputProps = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

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

export default function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setProcessing(true);
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    recorder.stream.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    setRecording(false);

    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      const audioBase64 = await blobToBase64(blob);
      const response = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_base64: audioBase64, language: "en" }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { text: string };
      if (data.text) onTranscript(data.text);
    } catch {
      onTranscript("");
    } finally {
      setProcessing(false);
    }
  }, [onTranscript]);

  async function startRecording() {
    if (disabled || processing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }

  return (
    <button
      type="button"
      className={`voice-input-btn ${recording ? "recording" : ""}`}
      disabled={disabled || processing}
      onMouseDown={() => void startRecording()}
      onMouseUp={() => void stopRecording()}
      onMouseLeave={() => {
        if (recording) void stopRecording();
      }}
      onTouchStart={(event) => {
        event.preventDefault();
        void startRecording();
      }}
      onTouchEnd={(event) => {
        event.preventDefault();
        void stopRecording();
      }}
      title={recording ? "松开发送" : "按住说话"}
    >
      {recording || processing ? <Square size={18} /> : <Mic size={18} />}
    </button>
  );
}
