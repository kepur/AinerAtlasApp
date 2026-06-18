import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, addCrushCandidate, API_BASE_URL } from "../api";
import { useI18n } from "../i18n";
import { startPcmCapture, type PcmCaptureHandle } from "../lib/pcmCapture";

type SessionTurn = { transcript: string; rewrite: string; tips: GrammarTip[] };
type SessionReport = { turns: number; grammarIssues: number; naturalnessSuggestions: number; patterns: string[] };

type GrammarTip = { pattern: string; explanation: string };

type RealtimeSessionInfo = {
  provider?: string;
  asr_engine?: string;
  model?: string;
};

const MODES = ["自由对话", "跟读训练", "面试练习", "小组语音"];

export default function VoiceChat() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [thinking, setThinking] = useState(false);
  const [grammarTips, setGrammarTips] = useState<GrammarTip[]>([]);
  const [listening, setListening] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<RealtimeSessionInfo | null>(null);
  const [activeMode, setActiveMode] = useState(0);
  const [naturalRewrite, setNaturalRewrite] = useState("");
  const [karaokeIdx, setKaraokeIdx] = useState(-1);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const captureRef = useRef<PcmCaptureHandle | null>(null);
  const finalTranscriptRef = useRef("");
  const karaokeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnsRef = useRef<SessionTurn[]>([]);
  const karaokeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Lyric-style word-by-word highlight (~estimated cadence; restarts on replay).
  const startKaraoke = useCallback((text: string) => {
    if (karaokeTimer.current) clearInterval(karaokeTimer.current);
    const words = text.split(/\s+/).filter(Boolean);
    let i = 0;
    setKaraokeIdx(0);
    karaokeTimer.current = setInterval(() => {
      i += 1;
      if (i >= words.length) {
        if (karaokeTimer.current) clearInterval(karaokeTimer.current);
        setKaraokeIdx(words.length);
        return;
      }
      setKaraokeIdx(i);
    }, 280);
  }, []);

  const connect = useCallback(() => {
    const token = getToken();
    // Derive the WS origin from the configured API base so prod (API on a
    // different host) works; fall back to the page origin when base is relative.
    const apiOrigin = API_BASE_URL || window.location.origin;
    const wsBase = apiOrigin.replace(/^http/, "ws");
    // activeMode 2 = 面试练习 → interview persona; others use free conversation.
    const wsMode = activeMode === 2 ? "interview" : "free";
    const ws = new WebSocket(`${wsBase}/api/voice/realtime?token=${token}&mode=${wsMode}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setListening(false);
      captureRef.current?.stop();
      captureRef.current = null;
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      if (data.type === "session") {
        setConnected(true);
        setSessionInfo({
          provider: typeof data.provider === "string" ? data.provider : undefined,
          asr_engine: typeof data.asr_engine === "string" ? data.asr_engine : undefined,
          model: typeof data.model === "string" ? data.model : undefined
        });
      }
      if (data.type === "transcript" && typeof data.text === "string") {
        if (data.is_final) {
          finalTranscriptRef.current = finalTranscriptRef.current
            ? `${finalTranscriptRef.current} ${data.text}`
            : data.text;
          setTranscript(finalTranscriptRef.current);
        } else {
          setTranscript(
            finalTranscriptRef.current
              ? `${finalTranscriptRef.current} ${data.text}`
              : data.text
          );
        }
      }
      if (data.type === "thinking") {
        setThinking(true);
        setResponse(t("chat.thinking"));
        setGrammarTips([]);
      }
      if (data.type === "response" && typeof data.text === "string") {
        setThinking(false);
        setResponse(data.text);
        const tips = (data.grammar_tips as GrammarTip[]) || [];
        setGrammarTips(tips);
        const rewrite = typeof data.natural_rewrite === "string" ? data.natural_rewrite : "";
        setNaturalRewrite(rewrite);
        setKaraokeIdx(-1);
        if (rewrite) startKaraoke(rewrite);
        // Accumulate this turn for the post-session layered report.
        turnsRef.current.push({ transcript: finalTranscriptRef.current, rewrite, tips });
      }
      if (data.type === "error" && typeof data.message === "string") {
        setThinking(false);
        setResponse(data.message);
        setGrammarTips([]);
      }
    };
  }, [t, activeMode]);

  useEffect(() => () => {
    captureRef.current?.stop();
    wsRef.current?.close();
    if (karaokeTimer.current) clearInterval(karaokeTimer.current);
  }, []);

  async function startListening() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    finalTranscriptRef.current = "";
    setTranscript("");
    setResponse("");
    setGrammarTips([]);
    setThinking(false);
    wsRef.current.send(JSON.stringify({ type: "audio", action: "start" }));
    const capture = await startPcmCapture(({ base64, sampleRate }) => {
      wsRef.current?.send(JSON.stringify({
        type: "audio",
        format: "pcm16",
        sample_rate: sampleRate,
        data: base64
      }));
    });
    captureRef.current = capture;
    setListening(true);
  }

  function stopListening() {
    captureRef.current?.stop();
    captureRef.current = null;
    wsRef.current?.send(JSON.stringify({ type: "audio", action: "end" }));
    setListening(false);
  }

  async function toggleListen() {
    if (!connected) {
      connect();
      return;
    }
    if (listening) {
      stopListening();
    } else {
      await startListening();
    }
  }

  function interrupt() {
    wsRef.current?.send(JSON.stringify({ type: "interrupt" }));
    stopListening();
  }

  function buildReport() {
    const turns = turnsRef.current;
    if (!turns.length) return;
    const grammarIssues = turns.reduce((n, t2) => n + t2.tips.length, 0);
    const naturalnessSuggestions = turns.filter(
      (t2) => t2.rewrite && t2.rewrite.trim() && t2.rewrite.trim() !== t2.transcript.trim()
    ).length;
    const patterns = Array.from(
      new Set(turns.flatMap((t2) => t2.tips.map((tip) => tip.pattern)).filter(Boolean))
    );
    setReport({ turns: turns.length, grammarIssues, naturalnessSuggestions, patterns });
    setReportSaved(false);
  }

  function disconnect() {
    stopListening();
    wsRef.current?.send(JSON.stringify({ type: "close" }));
    wsRef.current?.close();
    setConnected(false);
    buildReport();
  }

  const engineLabel = sessionInfo?.asr_engine === "dashscope"
    ? `DashScope · ${sessionInfo.model ?? "fun-asr-realtime"}`
    : sessionInfo?.provider;

  // Routed TTS playback (English vs Chinese picks the right provider server-side).
  async function speakRouted(text: string, language = "en") {
    if (!text) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({ text, language, speed: 0.95 }),
      });
      if (resp.ok) {
        const data = await resp.json() as { audio_url?: string; audio_base64?: string };
        const src = data.audio_url || (data.audio_base64 ? `data:audio/mpeg;base64,${data.audio_base64}` : "");
        if (src) { await new Audio(src).play(); return; }
      }
    } catch { /* fall back to browser */ }
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = language === "zh" ? "zh-CN" : "en-US";
      window.speechSynthesis.speak(u);
    }
  }

  // Real playback-synced karaoke: highlight words by actual audio currentTime,
  // weighted by word length (no fixed cadence guessing).
  async function playKaraoke(text: string) {
    if (!text) return;
    const words = text.split(/\s+/).filter(Boolean);
    const weights = words.map((w) => Math.max(1, w.length));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const cum: number[] = [];
    let acc = 0;
    for (const wt of weights) { acc += wt; cum.push(acc / total); }
    if (karaokeTimer.current) clearInterval(karaokeTimer.current);
    karaokeAudioRef.current?.pause();
    try {
      const resp = await fetch(`${API_BASE_URL}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({ text, language: "en", speed: 0.95 }),
      });
      if (resp.ok) {
        const data = await resp.json() as { audio_url?: string; audio_base64?: string };
        const src = data.audio_url || (data.audio_base64 ? `data:audio/mpeg;base64,${data.audio_base64}` : "");
        if (src) {
          const a = new Audio(src);
          karaokeAudioRef.current = a;
          a.ontimeupdate = () => {
            if (!a.duration || !isFinite(a.duration)) return;
            const frac = a.currentTime / a.duration;
            let idx = cum.findIndex((c) => frac <= c);
            if (idx < 0) idx = words.length - 1;
            setKaraokeIdx(idx);
          };
          a.onended = () => setKaraokeIdx(words.length);
          setKaraokeIdx(0);
          await a.play();
          return;
        }
      }
    } catch { /* fall through */ }
    // Fallback: estimated cadence + browser/routed TTS.
    startKaraoke(text);
    void speakRouted(text, "en");
  }

  // The lyric-style overlay shows the natural rewrite (preferred) or AI reply.
  const fallbackExpr = !thinking && response && response !== t("chat.thinking") ? response : "";
  const karaokeText = naturalRewrite || fallbackExpr;
  const karaokeWords = karaokeText.split(/\s+/).filter(Boolean);

  return (
    <div className="premium fixed inset-0 bg-surface text-on-surface flex flex-col overflow-hidden">
      {/* Animated background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-60 h-60 rounded-full bg-tertiary-fixed/15 blur-2xl" />
      </div>

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-margin-mobile h-16 bg-surface/80 backdrop-blur-xl border-b border-white/20 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="material-symbols-outlined text-on-surface-variant">arrow_back_ios</button>
          <div>
            <h1 className="font-bold text-[16px] text-primary leading-tight">Voice Coach</h1>
            <p className="text-[11px] text-on-surface-variant">实时语音对话 · 逐句纠正</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          <span className="material-symbols-outlined text-[16px] text-primary fill" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
          <span className="text-[12px] font-bold text-primary">
            {connected ? (engineLabel ?? "已连接") : "未连接"}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar px-margin-mobile py-5 space-y-5">
        {/* Mode selector */}
        <nav className="flex p-1 bg-surface-container rounded-xl overflow-x-auto hide-scrollbar gap-1">
          {MODES.map((mode, i) => (
            <button
              key={mode}
              onClick={() => {
                if (mode === "跟读训练") { navigate("/follow-read"); return; }
                // 小组语音 → 进入话题/圈子会议入口（多人语音房）。
                if (mode === "小组语音") { navigate("/home#today-topics"); return; }
                // 切到面试练习需重连以应用面试官 persona。
                if (connected && i !== activeMode) disconnect();
                setActiveMode(i);
              }}
              className={
                "flex-1 py-2 px-3 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all " +
                (activeMode === i ? "bg-white shadow-sm text-primary" : "text-outline")
              }
            >
              {mode}
            </button>
          ))}
        </nav>

        {/* Central orb visualization */}
        <section className="relative aspect-[4/3] w-full flex flex-col items-center justify-center gap-5">
          <div className="absolute inset-0 bg-primary/5 rounded-[40px] blur-3xl opacity-50" />
          <div className="relative w-44 h-44 flex items-center justify-center">
            <div className={`absolute w-full h-full rounded-full bg-gradient-to-tr from-primary via-primary-container to-tertiary-fixed opacity-20 transition-all duration-300 ${listening ? "scale-110 opacity-40" : ""}`} style={{ animation: "pulse-soft 3s ease-in-out infinite" }} />
            <div className="absolute w-32 h-32 rounded-full bg-gradient-to-bl from-primary to-tertiary-fixed opacity-30 blur-xl" />
            <div className="relative w-24 h-24 rounded-full bg-white glass-card flex items-center justify-center shadow-2xl">
              <span className="material-symbols-outlined text-primary text-[40px] fill" style={{ fontVariationSettings: listening ? "'FILL' 1" : "'FILL' 0" }}>
                {listening ? "graphic_eq" : "mic"}
              </span>
            </div>
          </div>
          <div className="text-center z-10">
            <p className="font-bold text-[16px] text-primary">
              {listening ? "AI 正在听你表达..." : connected ? "点击麦克风开始说话" : "点击麦克风连接"}
            </p>
            <p className="text-[12px] text-outline mt-1">Talk naturally as if with a friend</p>
          </div>
        </section>

        {/* Live Expression Overlay — lyric-style karaoke, never red errors */}
        {karaokeText && (
          <section className="relative rounded-2xl p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-tertiary-fixed/10 border border-primary/15 text-center animate-[fadeInUp_0.4s_ease-out]">
            <p className="text-[10px] font-bold text-primary/70 uppercase tracking-[0.2em] mb-2">更自然地说</p>
            <p className="text-[22px] font-bold leading-snug">
              {karaokeWords.map((w, i) => (
                <span
                  key={i}
                  className={"transition-colors duration-200 " + (i <= karaokeIdx ? "text-primary" : "text-primary/30")}
                >
                  {w}{i < karaokeWords.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
            <button
              onClick={() => void playKaraoke(karaokeText)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white text-[13px] font-semibold active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">volume_up</span> 朗读
            </button>
            {grammarTips.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {grammarTips.slice(0, 3).map((tip, i) => (
                  <span key={i} className="px-3 py-1 bg-white/70 text-primary text-[11px] rounded-full font-medium border border-primary/10">
                    Try: {tip.pattern}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Transcript */}
        <section className="glass-card premium-shadow rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">{t("voice.youSaid")}</span>
            <span className="material-symbols-outlined text-primary text-[20px]">play_circle</span>
          </div>
          <p className="text-[15px] text-on-surface leading-relaxed min-h-[44px]">
            {transcript || <span className="text-on-surface-variant italic text-[14px]">{t("voice.holdToSpeak")}</span>}
          </p>
        </section>

        {/* AI response */}
        <section className="glass-card premium-shadow rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">{t("voice.aiReply")}</span>
            {thinking && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
          </div>
          <p className="text-[15px] text-on-surface leading-relaxed min-h-[44px]">
            {thinking
              ? <span className="text-on-surface-variant animate-pulse-soft">{t("chat.thinking")}</span>
              : response || <span className="text-on-surface-variant italic text-[14px]">{t("voice.waitingReply")}</span>}
          </p>
        </section>

        {/* Grammar tips */}
        {grammarTips.length > 0 && (
          <section className="glass-card premium-shadow rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lightbulb</span>
              {t("voice.grammarHud")}
            </p>
            <div className="flex flex-wrap gap-2">
              {grammarTips.map((tip, i) => (
                <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary text-[12px] rounded-full font-medium">
                  {tip.pattern}: {tip.explanation}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Controls */}
      <div className="flex-shrink-0 px-margin-mobile py-5 bg-surface/80 backdrop-blur-xl border-t border-white/20 flex items-center justify-center gap-6">
        {connected && (
          <button
            onClick={interrupt}
            className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined">stop</span>
          </button>
        )}

        <button
          onClick={() => void toggleListen()}
          className={
            "w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all " +
            (listening
              ? "bg-error text-white shadow-[0_8px_30px_rgba(186,26,26,0.4)]"
              : "bg-primary text-white shadow-[0_8px_30px_rgba(99,14,212,0.4)]")
          }
        >
          <span className="material-symbols-outlined text-[28px]">{listening ? "mic_off" : "mic"}</span>
        </button>

        {connected && (
          <button
            onClick={disconnect}
            className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-error active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* Post-session layered report */}
      {report && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setReport(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 animate-[fadeInUp_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[18px] text-on-surface">本次语音报告</h3>
              <button onClick={() => setReport(null)} className="material-symbols-outlined text-on-surface-variant">close</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl bg-primary/8 p-4 text-center">
                <p className="text-[28px] font-bold text-primary leading-none">{report.turns}</p>
                <p className="text-[12px] text-on-surface-variant mt-1">对话轮次</p>
              </div>
              <div className="rounded-2xl bg-primary/8 p-4 text-center">
                <p className="text-[28px] font-bold text-primary leading-none">{report.grammarIssues}</p>
                <p className="text-[12px] text-on-surface-variant mt-1">语法问题</p>
              </div>
              <div className="rounded-2xl bg-primary/8 p-4 text-center">
                <p className="text-[28px] font-bold text-primary leading-none">{report.naturalnessSuggestions}</p>
                <p className="text-[12px] text-on-surface-variant mt-1">自然表达建议</p>
              </div>
              <div className="rounded-2xl bg-tertiary-fixed/20 p-4 text-center">
                <p className="text-[28px] font-bold text-tertiary-container leading-none">{report.patterns.length}</p>
                <p className="text-[12px] text-on-surface-variant mt-1">可进消消乐</p>
              </div>
            </div>
            {report.patterns.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {report.patterns.map((p, i) => (
                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-[12px] rounded-full font-medium">{p}</span>
                ))}
              </div>
            )}
            <button
              disabled={reportSaved || report.patterns.length === 0}
              onClick={async () => {
                try { await Promise.all(report.patterns.map((p) => addCrushCandidate(p))); setReportSaved(true); } catch { /* ignore */ }
              }}
              className="w-full py-3 rounded-2xl bg-primary text-white font-semibold active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              {reportSaved ? "已加入今日练习 ✓" : "全部加入今日练习"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
