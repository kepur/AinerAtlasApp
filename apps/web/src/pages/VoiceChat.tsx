import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, addCrushCandidate, API_BASE_URL } from "../api";
import VipVoicePrompt from "../components/VipVoicePrompt";
import { hasVoiceCoachAccess } from "../lib/membership";
import { useI18n } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import { startPcmCapture, type PcmCaptureHandle } from "../lib/pcmCaptureVad";

type GrammarTip = { pattern: string; explanation: string };
type SessionTurn = { transcript: string; rewrite: string; tips: GrammarTip[] };
type SessionReport = { turns: number; grammarIssues: number; naturalnessSuggestions: number; patterns: string[] };

type RealtimeSessionInfo = {
  provider?: string;
  asr_engine?: string;
  model?: string;
  voice_ui?: {
    silence_ms?: number;
    vad_threshold?: number;
    vad_type?: string;
    tap_to_end?: boolean;
  };
};

type VoiceBubble = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  status: "streaming" | "final" | "error";
  tips?: GrammarTip[];
  rewrite?: string;
};

const MODES = ["自由对话", "跟读训练", "面试练习", "小组语音"];

function bubbleId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatCallDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceChat() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const voiceAccess = hasVoiceCoachAccess(user);
  const [showVipVoicePrompt, setShowVipVoicePrompt] = useState(!voiceAccess);
  const [connected, setConnected] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState<VoiceBubble[]>([]);
  const [sessionInfo, setSessionInfo] = useState<RealtimeSessionInfo | null>(null);
  const [activeMode, setActiveMode] = useState(0);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [tapAck, setTapAck] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const captureRef = useRef<PcmCaptureHandle | null>(null);
  const turnsRef = useRef<SessionTurn[]>([]);
  const omniAudioCtxRef = useRef<AudioContext | null>(null);
  const omniPlayTimeRef = useRef(0);
  const omniModeRef = useRef(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const userBubbleIdRef = useRef<string | null>(null);
  const assistantBubbleIdRef = useRef<string | null>(null);
  const lastUserTextRef = useRef("");
  const lastTapAtRef = useRef(0);
  const tapAckTimerRef = useRef<number | null>(null);
  const sessionVoiceUiRef = useRef<RealtimeSessionInfo["voice_ui"]>(undefined);

  const upsertBubble = useCallback((bubble: VoiceBubble) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === bubble.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = bubble;
        return next;
      }
      return [...prev, bubble];
    });
  }, []);

  const appendBubble = useCallback((bubble: VoiceBubble) => {
    setMessages((prev) => [...prev, bubble]);
  }, []);

  const scrollFeedToBottom = useCallback((force = false) => {
    const el = feedRef.current;
    if (!el) return;
    if (force || stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollFeedToBottom();
  }, [messages, scrollFeedToBottom]);

  useEffect(() => {
    if (!inCall) return;
    const timer = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [inCall]);

  useEffect(() => {
    if (!voiceAccess) setShowVipVoicePrompt(true);
  }, [voiceAccess]);

  const connect = useCallback((): Promise<WebSocket> => {
    const token = getToken();
    if (!token) {
      return Promise.reject(new Error("请先登录后再使用 Voice Coach"));
    }
    const apiOrigin = API_BASE_URL || window.location.origin;
    const wsBase = apiOrigin.replace(/^http/, "ws");
    const wsMode = activeMode === 2 ? "interview" : "free";
    const ws = new WebSocket(`${wsBase}/api/voice/realtime?token=${token}&mode=${wsMode}`);
    wsRef.current = ws;

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("连接超时，请检查网络后重试"));
        }
      }, 25000);

      ws.onopen = () => {
        /* wait for session event before resolve */
      };
      ws.onerror = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          reject(new Error("语音连接失败，请检查网络或重新登录"));
        }
      };
      ws.onclose = () => {
        window.clearTimeout(timeout);
        setConnected(false);
        setInCall(false);
        captureRef.current?.stop();
        captureRef.current = null;
        if (settled) {
          appendBubble({
            id: bubbleId("sys"),
            role: "system",
            text: "通话已结束",
            status: "final",
          });
        }
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as Record<string, unknown>;

        if (data.type === "session") {
          if (!settled) {
            settled = true;
            window.clearTimeout(timeout);
            setConnected(true);
            resolve(ws);
          }
          const provider = typeof data.provider === "string" ? data.provider : undefined;
          omniModeRef.current = provider === "qwen-omni-realtime";
          const voiceUi = data.voice_ui && typeof data.voice_ui === "object"
            ? (data.voice_ui as RealtimeSessionInfo["voice_ui"])
            : undefined;
          sessionVoiceUiRef.current = voiceUi;
          setSessionInfo({
            provider,
            asr_engine: typeof data.asr_engine === "string" ? data.asr_engine : undefined,
            model: typeof data.model === "string" ? data.model : undefined,
            voice_ui: voiceUi,
          });
          return;
        }

        if (data.type === "turn_committed") {
          setTapAck(true);
          if (tapAckTimerRef.current) window.clearTimeout(tapAckTimerRef.current);
          tapAckTimerRef.current = window.setTimeout(() => setTapAck(false), 1500);
          return;
        }

        if (data.type === "transcript" && typeof data.text === "string") {
          const text = data.text.trim();
          if (!text) return;
          const isFinal = Boolean(data.is_final);
          if (!userBubbleIdRef.current) {
            userBubbleIdRef.current = bubbleId("user");
          }
          upsertBubble({
            id: userBubbleIdRef.current,
            role: "user",
            text,
            status: isFinal ? "final" : "streaming",
          });
          if (isFinal) {
            lastUserTextRef.current = text;
            userBubbleIdRef.current = null;
          }
          return;
        }

        if (data.type === "thinking") {
          assistantBubbleIdRef.current = bubbleId("ai");
          upsertBubble({
            id: assistantBubbleIdRef.current,
            role: "assistant",
            text: t("chat.thinking"),
            status: "streaming",
          });
          return;
        }

        if (data.type === "response_partial" && typeof data.text === "string") {
          if (!assistantBubbleIdRef.current) {
            assistantBubbleIdRef.current = bubbleId("ai");
          }
          upsertBubble({
            id: assistantBubbleIdRef.current,
            role: "assistant",
            text: data.text,
            status: "streaming",
          });
          return;
        }

        if (data.type === "response" && typeof data.text === "string") {
          const tips = (data.grammar_tips as GrammarTip[]) || [];
          const rewrite = typeof data.natural_rewrite === "string" ? data.natural_rewrite : data.text;
          const id = assistantBubbleIdRef.current ?? bubbleId("ai");
          upsertBubble({
            id,
            role: "assistant",
            text: data.text,
            status: "final",
            tips,
            rewrite,
          });
          assistantBubbleIdRef.current = null;
          turnsRef.current.push({
            transcript: lastUserTextRef.current,
            rewrite,
            tips,
          });
          return;
        }

        if (data.type === "audio" && typeof data.data === "string") {
          void playOmniPcmChunk(data.data as string, Number(data.sample_rate) || 24000);
          return;
        }

        if (data.type === "error") {
          if (data.code === "vip_required") {
            setShowVipVoicePrompt(true);
            return;
          }
          const message = typeof data.message === "string" ? data.message : "语音服务出错";
          appendBubble({
            id: bubbleId("err"),
            role: "system",
            text: message,
            status: "error",
          });
        }
      };
    });
  }, [activeMode, appendBubble, t, upsertBubble]);

  async function playOmniPcmChunk(b64: string, sampleRate: number) {
    try {
      if (!omniAudioCtxRef.current) {
        omniAudioCtxRef.current = new AudioContext();
      }
      const ctx = omniAudioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i += 1) channel[i] = pcm[i] / 32768;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const startAt = Math.max(ctx.currentTime, omniPlayTimeRef.current);
      source.start(startAt);
      omniPlayTimeRef.current = startAt + buffer.duration;
    } catch {
      /* ignore playback errors */
    }
  }

  useEffect(() => () => {
    captureRef.current?.stop();
    wsRef.current?.close();
    if (tapAckTimerRef.current) window.clearTimeout(tapAckTimerRef.current);
  }, []);

  async function startMicStream() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (captureRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "audio", action: "start" }));
    const capture = await startPcmCapture(({ base64, sampleRate }) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({
        type: "audio",
        format: "pcm16",
        sample_rate: sampleRate,
        data: base64,
      }));
    }, { vadThreshold: 0.018, gateSilence: false });
    captureRef.current = capture;
  }

  function signalTurnComplete() {
    if (!inCall || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (sessionVoiceUiRef.current?.tap_to_end === false) return;
    const now = Date.now();
    if (now - lastTapAtRef.current < 900) return;
    lastTapAtRef.current = now;
    wsRef.current.send(JSON.stringify({ type: "turn_complete" }));
  }

  async function startCall() {
    if (connecting || inCall) return;
    if (!voiceAccess) {
      setShowVipVoicePrompt(true);
      return;
    }
    setConnecting(true);
    appendBubble({
      id: bubbleId("sys"),
      role: "system",
      text: "正在连接语音教练…",
      status: "streaming",
    });
    try {
      await connect();
      await startMicStream();
      setInCall(true);
      setCallSeconds(0);
      const silenceSec = ((sessionVoiceUiRef.current?.silence_ms ?? 550) / 1000).toFixed(1);
      const tapHint = sessionVoiceUiRef.current?.tap_to_end !== false
        ? `说完可轻点屏幕，或停顿约 ${silenceSec} 秒`
        : `说完后停顿约 ${silenceSec} 秒即可`;
      appendBubble({
        id: bubbleId("sys"),
        role: "system",
        text: `通话已接通 · ${tapHint}，点击红色挂断结束`,
        status: "final",
      });
    } catch (err) {
      setConnected(false);
      setInCall(false);
      appendBubble({
        id: bubbleId("err"),
        role: "system",
        text: err instanceof Error ? err.message : "语音连接失败",
        status: "error",
      });
    } finally {
      setConnecting(false);
    }
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

  async function endCall() {
    captureRef.current?.stop();
    captureRef.current = null;
    userBubbleIdRef.current = null;
    assistantBubbleIdRef.current = null;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "audio", action: "end" }));
      wsRef.current.send(JSON.stringify({ type: "close" }));
      wsRef.current.close();
    }
    wsRef.current = null;
    setInCall(false);
    setConnected(false);
    setConnecting(false);
    buildReport();
  }

  function interruptAi() {
    wsRef.current?.send(JSON.stringify({ type: "interrupt" }));
  }

  const engineLabel = sessionInfo?.provider === "qwen-omni-realtime"
    ? `Omni · ${sessionInfo.model ?? "realtime"}`
    : sessionInfo?.asr_engine === "dashscope"
    ? `ASR · ${sessionInfo.model ?? "fun-asr"}`
    : sessionInfo?.provider;

  return (
    <div className="premium fixed inset-0 bg-surface text-on-surface flex flex-col overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-60 h-60 rounded-full bg-tertiary-fixed/15 blur-2xl" />
      </div>

      <header className="flex-shrink-0 flex items-center justify-between px-margin-mobile h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { if (!inCall) navigate(-1); }}
            className={`material-symbols-outlined ${inCall ? "text-outline/40" : "text-on-surface-variant"}`}
            aria-label="返回"
          >
            arrow_back_ios
          </button>
          <div>
            <h1 className="font-bold text-[16px] text-primary leading-tight">Voice Coach</h1>
            <p className="text-[11px] text-on-surface-variant">
              {inCall ? `通话中 ${formatCallDuration(callSeconds)}` : "实时语音 · 像打电话一样"}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${inCall ? "bg-error/10 border-error/30 voice-call-pulse" : "bg-primary/10 border-primary/20"}`}>
          <span className={`material-symbols-outlined text-[16px] ${inCall ? "text-error" : "text-primary"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {inCall ? "call" : connecting ? "sync" : "call_end"}
          </span>
          <span className={`text-[12px] font-bold ${inCall ? "text-error" : "text-primary"}`}>
            {connecting ? "连接中…" : inCall ? (engineLabel ?? "通话中") : connected ? "已连接" : "未连接"}
          </span>
        </div>
      </header>

      {!inCall && (
        <nav className="flex-shrink-0 mx-margin-mobile mt-3 flex p-1 bg-surface-container rounded-xl overflow-x-auto hide-scrollbar gap-1">
          {MODES.map((mode, i) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                if (mode === "跟读训练") { navigate("/follow-read"); return; }
                if (mode === "小组语音") { navigate("/home#today-topics"); return; }
                setActiveMode(i);
              }}
              className={
                "flex-1 py-2 px-3 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all " +
                (activeMode === i ? "bg-surface-container-lowest shadow-sm text-primary" : "text-outline")
              }
            >
              {mode}
            </button>
          ))}
        </nav>
      )}

      {inCall && (
        <div className="flex-shrink-0 mx-margin-mobile mt-2 px-3 py-2 rounded-xl bg-primary/8 border border-primary/15 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">touch_app</span>
          <p className="text-[12px] text-on-surface leading-snug flex-1">
            {sessionInfo?.voice_ui?.tap_to_end !== false
              ? `说完轻点屏幕，或停顿约 ${((sessionInfo?.voice_ui?.silence_ms ?? 550) / 1000).toFixed(1)} 秒`
              : `说完后停顿约 ${((sessionInfo?.voice_ui?.silence_ms ?? 550) / 1000).toFixed(1)} 秒`}
            {tapAck && <span className="ml-2 text-primary font-bold">· 已发送</span>}
          </p>
        </div>
      )}

      {/* Danmaku / tile message feed — scrollable history, no page refresh */}
      <div
        ref={feedRef}
        onClick={() => {
          if (inCall && sessionVoiceUiRef.current?.tap_to_end !== false) signalTurnComplete();
        }}
        onScroll={() => {
          const el = feedRef.current;
          if (!el) return;
          stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
        }}
        className={`flex-1 min-h-0 overflow-y-auto hide-scrollbar px-margin-mobile py-4 space-y-3 ${inCall && sessionInfo?.voice_ui?.tap_to_end !== false ? "cursor-pointer" : ""}`}
      >
        {messages.length === 0 && !inCall && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-primary/20 to-tertiary-fixed/20 flex items-center justify-center mb-4 voice-call-pulse">
              <span className="material-symbols-outlined text-primary text-[48px]">mic</span>
            </div>
            <p className="font-bold text-[16px] text-primary">点击下方开始通话</p>
            <p className="text-[12px] text-outline mt-2 max-w-[240px]">接通后麦克风常开，全双工对话，只有手动挂断才会结束</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`voice-bubble-in flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                "max-w-[88%] rounded-2xl px-4 py-3 shadow-sm " +
                (msg.role === "user"
                  ? "bg-primary text-white rounded-br-md"
                  : msg.role === "assistant"
                  ? "bg-surface-container-lowest border border-outline-variant/20 text-on-surface rounded-bl-md"
                  : msg.status === "error"
                  ? "bg-error/10 border border-error/20 text-error text-[13px]"
                  : "bg-surface-container text-on-surface-variant text-[13px] italic")
              }
            >
              {msg.role === "assistant" && (
                <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">AI Coach</p>
              )}
              {msg.role === "user" && (
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1 text-right">You</p>
              )}
              <p className={`text-[15px] leading-relaxed ${msg.status === "streaming" ? "opacity-80" : ""}`}>
                {msg.text}
                {msg.status === "streaming" && msg.role === "assistant" && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/50 animate-pulse align-middle" />
                )}
              </p>
              {msg.rewrite && msg.rewrite !== msg.text && msg.status === "final" && (
                <p className="mt-2 pt-2 border-t border-outline-variant/20 text-[13px] text-primary/80">
                  💡 {msg.rewrite}
                </p>
              )}
              {msg.tips && msg.tips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.tips.slice(0, 3).map((tip, i) => (
                    <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] rounded-full">
                      {tip.pattern}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom call controls — phone metaphor */}
      <div className="flex-shrink-0 px-margin-mobile py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-surface/90 backdrop-blur-xl border-t border-outline-variant/20 flex items-center justify-center gap-8 z-50">
        {!inCall ? (
          <button
            type="button"
            onClick={() => void startCall()}
            disabled={connecting || !voiceAccess}
            className="flex flex-col items-center gap-2 touch-manipulation disabled:opacity-60"
          >
            <span className="w-[72px] h-[72px] rounded-full bg-primary text-white flex items-center justify-center shadow-[0_8px_32px_rgba(99,14,212,0.45)] active:scale-95 transition-transform">
              {connecting ? (
                <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[32px]">call</span>
              )}
            </span>
            <span className="text-[13px] font-bold text-primary">{connecting ? "连接中…" : "开始通话"}</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={interruptAi}
              className="flex flex-col items-center gap-1 touch-manipulation active:scale-95 transition-transform"
              aria-label="打断 AI 说话"
            >
              <span className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined">front_hand</span>
              </span>
              <span className="text-[11px] text-outline">打断</span>
            </button>

            <button
              type="button"
              onClick={() => void endCall()}
              className="flex flex-col items-center gap-2 touch-manipulation active:scale-95 transition-transform"
              aria-label="挂断通话"
            >
              <span className="w-[72px] h-[72px] rounded-full bg-error text-white flex items-center justify-center shadow-[0_8px_32px_rgba(186,26,26,0.45)] voice-call-pulse">
                <span className="material-symbols-outlined text-[32px]">call_end</span>
              </span>
              <span className="text-[13px] font-bold text-error">挂断</span>
            </button>

            <button
              type="button"
              onClick={() => scrollFeedToBottom(true)}
              className="flex flex-col items-center gap-1 touch-manipulation active:scale-95 transition-transform"
              aria-label="滚到最新"
            >
              <span className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">south</span>
              </span>
              <span className="text-[11px] text-outline">最新</span>
            </button>
          </>
        )}
      </div>

      {report && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setReport(null)}>
          <div className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl p-6 animate-[fadeInUp_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[18px] text-on-surface">本次语音报告</h3>
              <button type="button" onClick={() => setReport(null)} className="material-symbols-outlined text-on-surface-variant">close</button>
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
              type="button"
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

      <VipVoicePrompt open={showVipVoicePrompt} onClose={() => setShowVipVoicePrompt(false)} />
    </div>
  );
}
