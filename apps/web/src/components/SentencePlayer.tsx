import { BookOpen, ChevronDown, Loader, Mic, Play, Sparkles, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SentencePlayerProps = {
  text: string;
  voice?: string;
  onVoiceChange?: (voice: string) => void;
  showVoicePicker?: boolean;
};

type VoiceOption = {
  id: string;
  label: string;
  gender: string;
  tone: string;
  desc: string;
};

const DEFAULT_VOICES: VoiceOption[] = [
  { id: "nova", label: "Nova 温暖女声", gender: "female", tone: "warm", desc: "自然温暖·日常对话" },
  { id: "echo", label: "Echo 温暖男声", gender: "male", tone: "warm", desc: "温暖朗读·讲述" },
  { id: "alloy", label: "Alloy 中性", gender: "neutral", tone: "calm", desc: "平静·语法讲解" },
  { id: "fable", label: "Fable 明亮女声", gender: "female", tone: "bright", desc: "明亮清晰·跟读" },
  { id: "sage", label: "Sage 温柔女声", gender: "female", tone: "gentle", desc: "温柔知性·长篇" },
  { id: "onyx", label: "Onyx 深沉男声", gender: "male", tone: "deep", desc: "沉稳厚重·正式" },
  { id: "shimmer", label: "Shimmer 活力女声", gender: "female", tone: "energetic", desc: "活力四射·口语" },
  { id: "ash", label: "Ash 沉稳男声", gender: "male", tone: "deep", desc: "成熟沉稳·商务" },
  { id: "coral", label: "Coral 柔和男声", gender: "male", tone: "gentle", desc: "柔和亲切·教学" },
];

async function playTTSApi(text: string, voice: string, speed = 1.0): Promise<void> {
  const got = speakWithBrowser(text, speed);
  if (got) return;
  const response = await fetch("/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, speed }),
  });
  if (!response.ok) throw new Error(await response.text());
  const data = (await response.json()) as { audio_url?: string; audio_base64?: string };
  const src = data.audio_url || (data.audio_base64 ? `data:audio/mpeg;base64,${data.audio_base64}` : "");
  if (!src) return;
  const audio = new Audio();
  audio.src = src;
  await audio.play();
}

async function playWordTTSApi(word: string, voice: string): Promise<void> {
  const got = speakWithBrowser(word, 0.85);
  if (got) return;
  const response = await fetch("/api/voice/word-tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word, voice }),
  });
  if (!response.ok) return;
  const data = (await response.json()) as { audio_url?: string; audio_base64?: string };
  const src = data.audio_url || (data.audio_base64 ? `data:audio/mpeg;base64,${data.audio_base64}` : "");
  if (!src) return;
  const audio = new Audio();
  audio.src = src;
  await audio.play();
}

function speakWithBrowser(text: string, speed = 0.9, pitch = 1.1, preferredVoice?: string): boolean {
  if (!window.speechSynthesis) return false;
  window.speechSynthesis.cancel();
  let voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    voices = window.speechSynthesis.getVoices();
  }
  const isChinese = /[\u4e00-\u9fff]/.test(text);
  const u = new SpeechSynthesisUtterance(text);
  u.rate = speed;
  u.pitch = pitch;

  if (preferredVoice) {
    const found = voices.find(v => v.name.toLowerCase().includes(preferredVoice.toLowerCase()));
    if (found) { u.voice = found; u.lang = found.lang; }
    else { u.lang = isChinese ? "zh-CN" : "en-US"; }
  } else if (isChinese) {
    const ms = voices.find(v => v.name.includes("Xiaoxiao") || v.name.includes("Yunjian"));
    if (ms) u.voice = ms;
    u.lang = "zh-CN";
  } else {
    const ms = voices.find(v => v.name.includes("Aria") || v.name.includes("Jenny") || v.name.includes("Guy"));
    if (ms) u.voice = ms;
    u.lang = "en-US";
  }
  window.speechSynthesis.speak(u);
  return true;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") { reject(new Error("Failed to read audio")); return; }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function SentencePlayer({ text, voice = "nova", onVoiceChange, showVoicePicker = true }: SentencePlayerProps) {
  const [loading, setLoading] = useState(false);
  const [wordLoading, setWordLoading] = useState<string | null>(null);
  const [shadowing, setShadowing] = useState(false);
  const [score, setScore] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ word: string; meaning: string } | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>(DEFAULT_VOICES);
  const [selectedVoice, setSelectedVoice] = useState(voice);
  const [ttsProvider, setTtsProvider] = useState("browser");
  const [ttsSpeed, setTtsSpeed] = useState(0.9);
  const [ttsPitch, setTtsPitch] = useState(1.1);

  useEffect(() => {
    fetch("/api/config/tts")
      .then(r => r.json())
      .then((cfg: { tts_provider?: string; tts_voice?: string; tts_speed?: number; tts_pitch?: number }) => {
        if (cfg.tts_provider) setTtsProvider(cfg.tts_provider);
        if (cfg.tts_voice) setSelectedVoice(cfg.tts_voice);
        if (cfg.tts_speed) setTtsSpeed(cfg.tts_speed);
        if (cfg.tts_pitch) setTtsPitch(cfg.tts_pitch);
      })
      .catch(() => {});
  }, []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetch("/api/voice/voices")
      .then(r => r.json())
      .then((data: VoiceOption[]) => { if (Array.isArray(data) && data.length) setVoices(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (voice && voice !== selectedVoice) setSelectedVoice(voice);
  }, [voice]);

  function handleVoiceSelect(v: VoiceOption) {
    setSelectedVoice(v.id);
    setVoiceOpen(false);
    if (onVoiceChange) onVoiceChange(v.id);
  }

  async function play(speedOverride?: number) {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const spd = speedOverride ?? ttsSpeed;
      const got = speakWithBrowser(text, spd, ttsPitch, selectedVoice);
      if (!got || ttsProvider === "cosyvoice" || ttsProvider === "qwentts") {
        await playTTSApi(text, selectedVoice, spd);
      }
    } finally {
      setLoading(false);
    }
  }

  async function playWord(word: string) {
    if (wordLoading) return;
    setWordLoading(word);
    try {
      const got = speakWithBrowser(word, 0.85, ttsPitch, selectedVoice);
      if (!got || ttsProvider === "cosyvoice" || ttsProvider === "qwentts") {
        await playWordTTSApi(word, selectedVoice);
      }
    } catch { /* ignore */ }
    finally { setWordLoading(null); }
  }

  async function startShadowing() {
    if (shadowing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.start();
      recorderRef.current = recorder;
      setShadowing(true);
      setScore(null);
    } catch { setShadowing(false); }
  }

  async function stopShadowing() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); recorder.stop(); });
    recorder.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    setShadowing(false);
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];
    const audio_base64 = await blobToBase64(blob);
    const response = await fetch("/api/voice/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_base64, reference_text: text }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { fluency_score?: number; accuracy_score?: number };
    setScore(`流利 ${data.fluency_score ?? "-"} / 准确 ${data.accuracy_score ?? "-"}`);
  }

  function explainWord(word: string) {
    setTooltip({ word, meaning: `释义加载中...` });
    playWord(word);
  }

  const words = text.split(/(\s+)/);
  const currentVoiceInfo = voices.find(v => v.id === selectedVoice) || voices[0];

  return (
    <div className="sentence-player">
      {showVoicePicker && (
        <div className="voice-picker-wrap">
          <button className="voice-picker-btn" onClick={() => setVoiceOpen(!voiceOpen)}>
            <Sparkles size={14} />
            <span>{currentVoiceInfo?.label || selectedVoice}</span>
            <ChevronDown size={12} className={`chevron ${voiceOpen ? "open" : ""}`} />
          </button>
          {voiceOpen && (
            <div className="voice-dropdown">
              {voices.map((v) => (
                <button
                  key={v.id}
                  className={`voice-option ${v.id === selectedVoice ? "active" : ""}`}
                  onClick={() => handleVoiceSelect(v)}
                >
                  <div className="voice-option-main">
                    <span className="voice-option-label">{v.label}</span>
                    <span className="voice-option-gender">{v.gender === "female" ? "♀" : v.gender === "male" ? "♂" : "⚲"}</span>
                  </div>
                  <span className="voice-option-desc">{v.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="sentence-words" onClick={() => setTooltip(null)}>
        {words.map((part, i) => {
          const trimmed = part.trim();
          if (!trimmed) return <span key={i}>{part}</span>;
          return (
            <span
              key={i}
              className={`clickable-word ${wordLoading === trimmed ? "word-loading" : ""}`}
              onClick={(e) => { e.stopPropagation(); explainWord(trimmed); }}
              title={`点击播报: ${trimmed}`}
            >
              {wordLoading === trimmed ? (
                <><Loader size={10} className="spin-inline" /> {part}</>
              ) : (
                part
              )}
            </span>
          );
        })}
      </div>

      {tooltip && (
        <div className="word-tooltip">
          <div className="word-tooltip-body">
            <div className="tooltip-header">
              <span className="tooltip-word">"{tooltip.word}"</span>
              <button className="tooltip-play-btn" onClick={() => playWord(tooltip.word)}>
                <Play size={12} /> 播报
              </button>
            </div>
            <p className="tooltip-meaning">{tooltip.meaning}</p>
          </div>
          <button className="tooltip-close" onClick={() => setTooltip(null)}>×</button>
        </div>
      )}

      <div className="player-controls">
        <button className="icon-btn play-btn" onClick={() => play(1)} disabled={loading}>
          {loading ? <Loader size={14} className="spin" /> : <Volume2 size={14} />}
        </button>
        <button className="icon-btn slow-btn" onClick={() => play(0.75)} disabled={loading}>慢</button>
        <button
          className={`icon-btn mic-btn ${shadowing ? "recording" : ""}`}
          onMouseDown={() => startShadowing()}
          onMouseUp={() => stopShadowing()}
          onMouseLeave={() => { if (shadowing) stopShadowing(); }}
        >
          <Mic size={14} />
        </button>
        {score && <span className="sentence-score">{score}</span>}
      </div>

      <style>{`
        .sentence-player { display:flex;flex-direction:column;gap:8px;position:relative; }
        .voice-picker-wrap { position:relative; }
        .voice-picker-btn { display:flex;align-items:center;gap:6px;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.2);border-radius:8px;color:#c4b5fd;font-size:12px;padding:4px 10px;cursor:pointer;transition:background 0.15s; }
        .voice-picker-btn:hover { background:rgba(124,58,237,0.22); }
        .voice-picker-btn .chevron { transition:transform 0.15s; }
        .voice-picker-btn .chevron.open { transform:rotate(180deg); }
        .voice-dropdown { position:absolute;top:calc(100% + 4px);left:0;z-index:1100;background:rgba(15,13,25,0.96);backdrop-filter:blur(20px);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:6px;min-width:260px;max-height:320px;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.6); }
        .voice-option { display:flex;flex-direction:column;gap:2px;width:100%;padding:8px 12px;border:none;border-radius:8px;background:transparent;color:#d1d5db;text-align:left;cursor:pointer;transition:background 0.12s; }
        .voice-option:hover { background:rgba(255,255,255,0.06); }
        .voice-option.active { background:rgba(124,58,237,0.18);color:#c4b5fd; }
        .voice-option-main { display:flex;align-items:center;gap:6px; }
        .voice-option-label { font-size:13px;font-weight:500; }
        .voice-option-gender { font-size:11px;opacity:0.6; }
        .voice-option-desc { font-size:11px;color:#9ca3af; }
        .sentence-words { font-size:15px;line-height:1.8;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);color:#d1d5db; }
        .clickable-word { cursor:pointer;border-bottom:1px dashed rgba(168,144,255,0.35);transition:color 0.15s,border-color 0.15s;display:inline;position:relative; }
        .clickable-word:hover { color:#a890ff;border-bottom-color:#a890ff; }
        .clickable-word.word-loading { color:#a78bfa;border-bottom-style:solid; }
        .spin-inline { display:inline-block;vertical-align:middle;animation:spin 1s linear infinite; }
        .word-tooltip { position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:2000;display:flex;align-items:flex-start;gap:8px; }
        .word-tooltip-body { background:rgba(15,13,25,0.95);backdrop-filter:blur(20px);border:1px solid rgba(168,144,255,0.3);border-radius:14px;padding:14px 18px;min-width:240px;box-shadow:0 8px 32px rgba(0,0,0,0.6); }
        .tooltip-header { display:flex;align-items:center;gap:10px;margin-bottom:8px; }
        .tooltip-word { font-size:16px;font-weight:600;color:#e5e7eb; }
        .tooltip-play-btn { display:flex;align-items:center;gap:4px;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.3);border-radius:6px;color:#c4b5fd;font-size:11px;padding:3px 10px;cursor:pointer; }
        .tooltip-play-btn:hover { background:rgba(124,58,237,0.35); }
        .tooltip-meaning { font-size:13px;color:#9ca3af;margin:0; }
        .tooltip-close { background:none;border:none;color:#6b7280;font-size:18px;cursor:pointer;padding:2px 6px;line-height:1; }
        .player-controls { display:flex;align-items:center;gap:6px; }
        .icon-btn { display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:#d1d5db;cursor:pointer;transition:background 0.15s;font-size:12px; }
        .icon-btn:hover:not(:disabled) { background:rgba(255,255,255,0.08); }
        .icon-btn:disabled { opacity:0.5;cursor:not-allowed; }
        .icon-btn.recording { background:rgba(239,68,68,0.25);border-color:rgba(239,68,68,0.5);color:#fca5a5; }
        .sentence-score { font-size:12px;color:#a78bfa;margin-left:4px; }
        .spin { animation:spin 1s linear infinite; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
