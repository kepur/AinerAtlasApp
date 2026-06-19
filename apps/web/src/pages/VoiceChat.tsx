import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, addCrushCandidate, submitRealtimeCallSummary, API_BASE_URL, type RealtimeCallSummary } from "../api";
import { LearningHUD, TokenExplainSheet, TurnSelector, useTts } from "../components/learning";
import VipVoicePrompt from "../components/VipVoicePrompt";
import VoiceAmbientScene, { type VoiceSceneMood } from "../components/voice/VoiceAmbientScene";
import VoiceCompanionPet from "../components/voice/VoiceCompanionPet";
import VoiceConversationFeed, { type VoiceBubble } from "../components/voice/VoiceConversationFeed";
import {
  countFocusPoints,
  deriveTurnLabel,
  mergeHudData,
  type VoiceDialogueTurn,
} from "../lib/voiceTurnHelpers";
import { hasVoiceCoachAccess, isMembershipReady, isVoiceCoachBlocked } from "../lib/membership";
import { useI18n } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import type { DialogueTurn, HudData } from "../stores/chatStore";
import { toWebSocketBase } from "../lib/microphone";
import { startPcmCapture, type PcmCaptureHandle } from "../lib/pcmCaptureVad";
import "../MessageBubble.css";
import "../components/voice/VoiceChat.css";

type GrammarTip = { pattern: string; explanation: string };
type SessionReport = RealtimeCallSummary;

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
  coach_briefing?: CoachBriefing | null;
  opening_greeting?: string;
};

type CoachBriefing = {
  user_summary?: string;
  ability_snapshot?: Record<string, number | string>;
  strengths?: string[];
  weaknesses_to_improve?: string[];
  interests?: string[];
  focus_topics?: string[];
  opening_greeting?: string;
  analyzed_at?: string | null;
};

type VoiceBubbleMsg = VoiceBubble;

function bubbleId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatCallDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MODES = ["自由对话", "跟读训练", "面试练习", "小组语音"];

function patchAssistantBubble(
  setMessages: Dispatch<SetStateAction<VoiceBubbleMsg[]>>,
  tips: GrammarTip[],
  rewrite: string,
) {
  setMessages((prev) => {
    const next = [...prev];
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if (next[i].role === "assistant" && next[i].status === "final") {
        next[i] = {
          ...next[i],
          tips: tips.length ? tips : next[i].tips,
          rewrite: rewrite || next[i].rewrite,
        };
        break;
      }
    }
    return next;
  });
}

function voiceTurnsToSelector(turns: VoiceDialogueTurn[]): DialogueTurn[] {
  return turns.map((t) => ({
    turn_id: t.turn_id,
    user_message_id: t.userBubbleId,
    assistant_message_id: t.assistantBubbleId ?? "",
    user_text: t.user_text,
    ai_reply: t.ai_reply,
    hud: t.hud,
    status: t.status,
    label: t.label,
    pinned: t.pinned,
    focusCount: t.focusCount,
  }));
}

export default function VoiceChat() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userHydrated = useAuthStore((s) => s.userHydrated);
  const loadUser = useAuthStore((s) => s.loadUser);
  const membershipReady = isMembershipReady(isLoggedIn, userHydrated);
  const voiceAccess = hasVoiceCoachAccess(user);
  const voiceBlocked = isVoiceCoachBlocked(isLoggedIn, userHydrated, user);
  const [showVipVoicePrompt, setShowVipVoicePrompt] = useState(false);
  const [connected, setConnected] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState<VoiceBubbleMsg[]>([]);
  const [turns, setTurns] = useState<VoiceDialogueTurn[]>([]);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [pinnedTurnId, setPinnedTurnId] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<RealtimeSessionInfo | null>(null);
  const [activeMode, setActiveMode] = useState(0);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [tapAck, setTapAck] = useState(false);
  const [explainToken, setExplainToken] = useState<{ token: string; context: string } | null>(null);
  const [coachBriefing, setCoachBriefing] = useState<CoachBriefing | null>(null);
  const { speak } = useTts();

  const wsRef = useRef<WebSocket | null>(null);
  const captureRef = useRef<PcmCaptureHandle | null>(null);
  const currentTurnIdRef = useRef<string | null>(null);
  const turnsSnapshotRef = useRef(turns);
  turnsSnapshotRef.current = turns;
  const callSecondsRef = useRef(callSeconds);
  callSecondsRef.current = callSeconds;
  const sessionInfoRef = useRef(sessionInfo);
  sessionInfoRef.current = sessionInfo;
  const activeModeRef = useRef(activeMode);
  activeModeRef.current = activeMode;
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

  const upsertBubble = useCallback((bubble: VoiceBubbleMsg) => {
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

  const appendBubble = useCallback((bubble: VoiceBubbleMsg) => {
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
  }, [messages, turns, scrollFeedToBottom]);

  const selectorTurns = useMemo(() => voiceTurnsToSelector(turns), [turns]);
  const hudTurn = useMemo(() => {
    if (pinnedTurnId) return turns.find((t) => t.turn_id === pinnedTurnId) ?? null;
    if (activeTurnId) return turns.find((t) => t.turn_id === activeTurnId) ?? null;
    return turns[turns.length - 1] ?? null;
  }, [turns, activeTurnId, pinnedTurnId]);
  const displayHud = hudTurn?.hud ?? null;
  const displayPhase = hudTurn?.status === "analyzing" ? "analyzing" as const : null;

  const petMood = useMemo((): VoiceSceneMood => {
    if (!inCall) return "idle";
    if (turns.some((t) => t.status === "analyzing")) return "thinking";
    if (messages.some((m) => m.role === "assistant" && m.status === "streaming")) return "speaking";
    return "listening";
  }, [inCall, turns, messages]);

  const setActiveTurn = useCallback((turnId: string) => {
    setActiveTurnId(turnId);
  }, []);

  const pinTurn = useCallback((turnId: string) => {
    setPinnedTurnId(turnId);
    setTurns((prev) => prev.map((t) => ({ ...t, pinned: t.turn_id === turnId })));
  }, []);

  const unpinTurn = useCallback(() => {
    setPinnedTurnId(null);
    setTurns((prev) => prev.map((t) => ({ ...t, pinned: false })));
  }, []);

  const patchCurrentTurn = useCallback((patch: Partial<VoiceDialogueTurn>) => {
    const turnId = currentTurnIdRef.current;
    if (!turnId) return;
    setTurns((prev) => prev.map((t) => (t.turn_id === turnId ? { ...t, ...patch } : t)));
  }, []);

  const applyHudToCurrentTurn = useCallback((incoming: HudData, naturalRewrite: string, finalize: boolean) => {
    const turnId = currentTurnIdRef.current;
    if (!turnId || !incoming) return;
    setTurns((prev) => {
      const idx = prev.findIndex((t) => t.turn_id === turnId);
      if (idx < 0) return prev;
      const cur = prev[idx];
      const hud = mergeHudData(cur.hud, incoming);
      const next = [...prev];
      next[idx] = {
        ...cur,
        hud,
        status: finalize ? "ready" : "analyzing",
        focusCount: countFocusPoints(hud),
        label: deriveTurnLabel(hud, cur.user_text, idx),
      };
      return next;
    });
    const tips = (incoming.grammar_tips as GrammarTip[]) || [];
    const rewrite = naturalRewrite || incoming.corrected_sentence || incoming.main_expression || "";
    patchAssistantBubble(setMessages, tips, rewrite);
  }, []);

  useEffect(() => {
    if (!inCall) return;
    const timer = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [inCall]);

  useEffect(() => {
    if (isLoggedIn && !userHydrated) void loadUser();
  }, [isLoggedIn, userHydrated, loadUser]);

  useEffect(() => {
    if (!membershipReady) {
      setShowVipVoicePrompt(false);
      return;
    }
    setShowVipVoicePrompt(voiceBlocked);
  }, [membershipReady, voiceBlocked]);

  const connect = useCallback((): Promise<WebSocket> => {
    const token = getToken();
    if (!token) {
      return Promise.reject(new Error("请先登录后再使用 Voice Coach"));
    }
    const apiOrigin = API_BASE_URL || window.location.origin;
    const wsBase = toWebSocketBase(apiOrigin);
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
            coach_briefing: (data.coach_briefing && typeof data.coach_briefing === "object")
              ? (data.coach_briefing as CoachBriefing)
              : null,
            opening_greeting: typeof data.opening_greeting === "string" ? data.opening_greeting : undefined,
          });
          if (data.coach_briefing && typeof data.coach_briefing === "object") {
            setCoachBriefing(data.coach_briefing as CoachBriefing);
          }
          return;
        }

        if (data.type === "learning_analyzing") {
          patchCurrentTurn({ status: "analyzing" });
          return;
        }

        if (data.type === "learning_hud_partial") {
          const partial = (data.hud && typeof data.hud === "object") ? (data.hud as HudData) : null;
          if (partial) {
            const rewrite = typeof data.natural_rewrite === "string" ? data.natural_rewrite : "";
            applyHudToCurrentTurn(partial, rewrite, false);
          }
          return;
        }

        if (data.type === "learning_hud") {
          const hud = (data.hud && typeof data.hud === "object") ? (data.hud as HudData) : null;
          if (hud) {
            const rewrite = typeof data.natural_rewrite === "string"
              ? data.natural_rewrite
              : (hud.corrected_sentence || hud.main_expression || "");
            applyHudToCurrentTurn(hud, rewrite, true);
          } else {
            patchCurrentTurn({ status: "ready" });
          }
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
          const uid = userBubbleIdRef.current;
          upsertBubble({
            id: uid,
            role: "user",
            text,
            status: isFinal ? "final" : "streaming",
          });
          if (isFinal) {
            lastUserTextRef.current = text;
            const turnId = bubbleId("turn");
            currentTurnIdRef.current = turnId;
            setTurns((prev) => [
              ...prev,
              {
                turn_id: turnId,
                userBubbleId: uid,
                assistantBubbleId: null,
                user_text: text,
                ai_reply: "",
                hud: null,
                status: "replying",
                label: deriveTurnLabel(null, text, prev.length),
                pinned: false,
                focusCount: 0,
              },
            ]);
            setActiveTurnId(turnId);
            userBubbleIdRef.current = null;
          }
          return;
        }

        if (data.type === "thinking") {
          assistantBubbleIdRef.current = bubbleId("ai");
          patchCurrentTurn({ assistantBubbleId: assistantBubbleIdRef.current, status: "replying" });
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
            patchCurrentTurn({ assistantBubbleId: assistantBubbleIdRef.current, status: "replying" });
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
          patchCurrentTurn({
            assistantBubbleId: id,
            ai_reply: data.text,
            status: "replying",
          });
          assistantBubbleIdRef.current = null;
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
  }, [activeMode, appendBubble, applyHudToCurrentTurn, patchCurrentTurn, t, upsertBubble]);

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
    if (isLoggedIn && !userHydrated) await loadUser();
    const fresh = useAuthStore.getState();
    if (isVoiceCoachBlocked(fresh.isLoggedIn, fresh.userHydrated, fresh.user)) {
      setShowVipVoicePrompt(true);
      return;
    }
    setConnecting(true);
    setTurns([]);
    setActiveTurnId(null);
    setPinnedTurnId(null);
    currentTurnIdRef.current = null;
    setCoachBriefing(null);
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
      const silenceSec = ((sessionVoiceUiRef.current?.silence_ms ?? 1200) / 1000).toFixed(1);
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

  async function fetchCallSummary() {
    const snapshot = turnsSnapshotRef.current;
    if (!snapshot.length && callSecondsRef.current <= 0) return;

    setReportLoading(true);
    setReport(null);
    setReportSaved(false);

    const wsMode = activeModeRef.current === 2 ? "interview" : "free";
    const payload = {
      duration_seconds: Math.max(1, callSecondsRef.current),
      mode: wsMode,
      provider: sessionInfoRef.current?.provider ?? "qwen-omni-realtime",
      turns: snapshot.map((t) => ({
        user_text: t.user_text,
        ai_reply: t.ai_reply,
        hud: (t.hud ?? {}) as Record<string, unknown>,
      })),
    };

    try {
      const summary = await submitRealtimeCallSummary(payload);
      setReport(summary);
    } catch {
      const grammarIssues = snapshot.reduce((n, t2) => n + (t2.hud?.grammar_tips?.length ?? 0), 0);
      const naturalnessSuggestions = snapshot.filter(
        (t2) => t2.hud?.corrected_sentence && t2.hud.corrected_sentence.trim() !== t2.user_text.trim()
      ).length;
      const patterns = Array.from(
        new Set(
          snapshot.flatMap((t2) => (t2.hud?.patterns_v2 ?? []).map((p) => p.pattern)).filter(Boolean)
        )
      );
      setReport({
        session_id: "",
        provider: payload.provider,
        duration_seconds: payload.duration_seconds,
        transcript: "",
        scores: {},
        top_corrections: [],
        highlights: ["小结生成失败，以下为本地统计。"],
        filler_words: [],
        pause_feedback: [],
        recommended_practice: [],
        summary: `共 ${snapshot.length} 轮对话（离线统计）`,
        turn_count: snapshot.length,
        grammar_issues: grammarIssues,
        naturalness_suggestions: naturalnessSuggestions,
        patterns_for_crush: patterns,
        mode: wsMode,
      });
    } finally {
      setReportLoading(false);
    }
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
    void fetchCallSummary();
  }

  function interruptAi() {
    wsRef.current?.send(JSON.stringify({ type: "interrupt" }));
  }

  const statusLabel = connecting
    ? "连接中…"
    : inCall
    ? "通话中"
    : connected
    ? "已连接"
    : "未连接";

  return (
    <div className="premium voice-chat-shell fixed inset-0 bg-surface text-on-surface flex flex-col overflow-hidden">
      <VoiceAmbientScene mood={petMood} inCall={inCall} />

      <header className="flex-shrink-0 flex items-center justify-between px-margin-mobile h-16 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/20 z-40 relative">
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
            {statusLabel}
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

      {inCall && coachBriefing && (
        <div className="flex-shrink-0 mx-margin-mobile mt-2 px-3 py-2.5 rounded-xl bg-tertiary-fixed/10 border border-tertiary-fixed/20">
          <p className="text-[11px] font-bold text-tertiary-container uppercase tracking-wide mb-1">今日教练已了解你</p>
          {coachBriefing.user_summary && (
            <p className="text-[12px] text-on-surface leading-snug mb-1.5">{coachBriefing.user_summary}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {(coachBriefing.interests ?? []).slice(0, 4).map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] text-on-surface-variant">{tag}</span>
            ))}
          </div>
          <p className="text-[11px] text-primary/80 mt-1.5 italic">教练会先开口打招呼，请听完后回应</p>
        </div>
      )}

      {inCall && (
        <div className="flex-shrink-0 mx-margin-mobile mt-2 px-3 py-2 rounded-xl bg-primary/8 border border-primary/15 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">touch_app</span>
          <p className="text-[12px] text-on-surface leading-snug flex-1">
            {sessionInfo?.voice_ui?.tap_to_end !== false
              ? `说完轻点屏幕，或停顿约 ${((sessionInfo?.voice_ui?.silence_ms ?? 1200) / 1000).toFixed(1)} 秒`
              : `说完后停顿约 ${((sessionInfo?.voice_ui?.silence_ms ?? 1200) / 1000).toFixed(1)} 秒`}
            {tapAck && <span className="ml-2 text-primary font-bold">· 已发送</span>}
          </p>
        </div>
      )}

      {!inCall && (
        <div className="voice-pet-zone">
          <VoiceCompanionPet mood="idle" />
        </div>
      )}

      {inCall && (
        <div className="voice-pet-zone compact">
          <VoiceCompanionPet mood={petMood} compact />
        </div>
      )}

      <div className="voice-chat-layout chat-detail-layout flex-1 min-h-0 flex flex-col">
        {(inCall || turns.length > 0) && (
          <div className="voice-hud-strip">
            <TurnSelector
              turns={selectorTurns}
              activeTurnId={activeTurnId}
              pinnedTurnId={pinnedTurnId}
              onSelect={setActiveTurn}
              onPin={pinTurn}
              onUnpin={unpinTurn}
              minTurns={1}
            />
            <p className="voice-hud-hint">本轮学习要点（横滑）· 点击色块回顾历史轮次</p>
            <LearningHUD
              hud={displayHud}
              streamPhase={displayPhase}
              speak={speak}
              onTokenClick={(token, context) => setExplainToken({ token, context })}
              className="voice-learning-hud"
            />
          </div>
        )}

        <VoiceConversationFeed
          messages={messages}
          turns={turns}
          activeTurnId={activeTurnId}
          inCall={inCall}
          onTurnClick={setActiveTurn}
          speak={speak}
          feedRef={feedRef}
          onFeedScroll={() => {
            const el = feedRef.current;
            if (!el) return;
            stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
          }}
          onFeedTap={() => {
            if (inCall && sessionVoiceUiRef.current?.tap_to_end !== false) signalTurnComplete();
          }}
          tapToEnd={sessionInfo?.voice_ui?.tap_to_end !== false}
        />
      </div>

      {/* Bottom call controls — phone metaphor */}
      <div className="flex-shrink-0 px-margin-mobile py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-surface/90 backdrop-blur-xl border-t border-outline-variant/20 flex items-center justify-center gap-8 z-50">
        {!inCall ? (
          <button
            type="button"
            onClick={() => void startCall()}
            disabled={connecting || !membershipReady || voiceBlocked}
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

      {reportLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-2xl bg-surface-container-lowest px-6 py-4 text-on-surface text-[14px]">
            正在生成本次通话小结…
          </div>
        </div>
      )}

      {report && !reportLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setReport(null)}>
          <div className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl p-6 animate-[fadeInUp_0.3s_ease-out] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[18px] text-on-surface">本次通话小结</h3>
              <button type="button" onClick={() => setReport(null)} className="material-symbols-outlined text-on-surface-variant">close</button>
            </div>
            <p className="text-[11px] text-outline mb-3">通话练习报告，非 Thought Freeze 思想资产</p>
            {report.summary && (
              <p className="text-[14px] text-on-surface-variant leading-relaxed mb-4">{report.summary}</p>
            )}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl bg-primary/8 p-4 text-center">
                <p className="text-[28px] font-bold text-primary leading-none">{report.turn_count}</p>
                <p className="text-[12px] text-on-surface-variant mt-1">对话轮次</p>
              </div>
              <div className="rounded-2xl bg-primary/8 p-4 text-center">
                <p className="text-[28px] font-bold text-primary leading-none">{report.grammar_issues}</p>
                <p className="text-[12px] text-on-surface-variant mt-1">语法问题</p>
              </div>
              <div className="rounded-2xl bg-primary/8 p-4 text-center">
                <p className="text-[28px] font-bold text-primary leading-none">{report.naturalness_suggestions}</p>
                <p className="text-[12px] text-on-surface-variant mt-1">自然表达建议</p>
              </div>
              <div className="rounded-2xl bg-tertiary-fixed/20 p-4 text-center">
                <p className="text-[28px] font-bold text-tertiary-container leading-none">{report.patterns_for_crush.length}</p>
                <p className="text-[12px] text-on-surface-variant mt-1">可进消消乐</p>
              </div>
            </div>
            {report.highlights.length > 0 && (
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-on-surface mb-2">亮点</p>
                <ul className="space-y-1">
                  {report.highlights.map((h, i) => (
                    <li key={i} className="text-[13px] text-on-surface-variant">· {h}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.recommended_practice.length > 0 && (
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-on-surface mb-2">建议练习</p>
                <ul className="space-y-1">
                  {report.recommended_practice.map((p, i) => (
                    <li key={i} className="text-[13px] text-on-surface-variant">· {p}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.patterns_for_crush.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {report.patterns_for_crush.map((p, i) => (
                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-[12px] rounded-full font-medium">{p}</span>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={reportSaved || report.patterns_for_crush.length === 0}
              onClick={async () => {
                try {
                  await Promise.all(report.patterns_for_crush.map((p) => addCrushCandidate(p)));
                  setReportSaved(true);
                } catch { /* ignore */ }
              }}
              className="w-full py-3 rounded-2xl bg-primary text-white font-semibold active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              {reportSaved ? "已加入今日练习 ✓" : "全部加入今日练习"}
            </button>
          </div>
        </div>
      )}

      <VipVoicePrompt open={showVipVoicePrompt} onClose={() => setShowVipVoicePrompt(false)} />
      {explainToken && (
        <TokenExplainSheet
          token={explainToken.token}
          context={explainToken.context}
          onClose={() => setExplainToken(null)}
          speak={speak}
        />
      )}
    </div>
  );
}
