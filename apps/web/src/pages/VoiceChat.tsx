import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getToken, addCrushCandidate, submitRealtimeCallSummary, API_BASE_URL, listVoiceSessions, joinVoiceGroupMatch, pollVoiceGroupMatch, leaveVoiceGroupMatch, type RealtimeCallSummary, type VoiceSessionRecord } from "../api";
import { LearningHUD, TokenExplainSheet, TurnSelector, useTts } from "../components/learning";
import VipVoicePrompt from "../components/VipVoicePrompt";
import { AmbientScene, CompanionPet, deriveVoiceSceneMood, type SceneMood } from "../components/ambient";
import VoiceConversationFeed, { type VoiceBubble } from "../components/voice/VoiceConversationFeed";
import {
  countFocusPoints,
  deriveTurnLabel,
  mergeHudData,
  type VoiceDialogueTurn,
} from "../lib/voiceTurnHelpers";
import { hasVoiceCoachAccess, hasProAccess, isMembershipReady, isVoiceCoachBlocked } from "../lib/membership";
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

const BARGE_IN_RMS = 0.028;
const BARGE_IN_FRAMES = 2;
const PCM_DIRECT_SEND_LIMIT = 320_000;

function pcm16Base64Rms(base64: string): number {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  if (!pcm.length) return 0;
  let sum = 0;
  for (let i = 0; i < pcm.length; i += 1) {
    const n = pcm[i] / 32768;
    sum += n * n;
  }
  return Math.sqrt(sum / pcm.length);
}

/** Local coach TTS still playing (not LLM "thinking" state). */
function coachAudioPlaying(
  activeSources: number,
  audioCtx: AudioContext | null,
  scheduledUntilSec: number,
): boolean {
  if (activeSources > 0) return true;
  if (!audioCtx) return false;
  return scheduledUntilSec > audioCtx.currentTime + 0.03;
}

/** Short silent PCM chunk to keep Omni / mic pipeline alive during long pauses. */
function pcm16SilenceBase64(durationMs: number, sampleRate = 16000): string {
  const samples = Math.max(1, Math.round((sampleRate * durationMs) / 1000));
  const bytes = new Uint8Array(samples * 2);
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step) as unknown as number[]);
  }
  return btoa(binary);
}

const MODES = ["自由对话", "跟读训练", "面试练习", "小组语音"];
const CONNECTION_STATUS_BUBBLE_ID = "voice-connection-status";
const INTERVIEW_INDUSTRIES = ["通用", "科技", "金融", "医疗", "教育", "零售"];
const IELTS_BANDS = ["5.5", "6.0", "6.5", "7.0", "7.5"];

function buildCoachMarqueeLine(
  briefing: CoachBriefing | null,
  silenceMs: number,
  tapToEnd: boolean,
  tapAck: boolean,
  interviewMode: boolean,
): string {
  const pauseHint = tapToEnd
    ? `说完轻点屏幕，或停顿约 ${(silenceMs / 1000).toFixed(1)} 秒`
    : `说完后停顿约 ${(silenceMs / 1000).toFixed(1)} 秒`;
  const chunks: string[] = [];
  if (briefing?.user_summary) chunks.push(briefing.user_summary);
  if (interviewMode) {
    for (const tag of (briefing?.interests ?? []).slice(0, 4)) chunks.push(tag);
    for (const q of (briefing?.focus_topics ?? []).slice(0, 1)) chunks.push(String(q));
  } else {
    for (const tag of (briefing?.interests ?? []).slice(0, 4)) chunks.push(tag);
    for (const s of (briefing?.strengths ?? []).slice(0, 2)) chunks.push(s);
  }
  const profile = chunks.length ? chunks.join(" · ") : interviewMode ? "面试场景已就绪" : "教练已就绪";
  const ack = tapAck ? " · 已发送" : "";
  return `${profile} · ${pauseHint}${ack}`;
}

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
  const [searchParams] = useSearchParams();
  const presetGroupRoom = searchParams.get("groupRoom");
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
  const [interviewIndustry, setInterviewIndustry] = useState("通用");
  const [ieltsBand, setIeltsBand] = useState("6.5");
  const [groupRoomId, setGroupRoomId] = useState<string | null>(null);
  const [groupMatching, setGroupMatching] = useState(false);
  const [groupMatchStatus, setGroupMatchStatus] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState<VoiceSessionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { speak } = useTts();

  const wsRef = useRef<WebSocket | null>(null);
  const captureRef = useRef<PcmCaptureHandle | null>(null);
  const manualCloseRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectVoiceRef = useRef<() => void>(() => {});
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
  const omniSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const omniModeRef = useRef(false);
  const userSpeakingRef = useRef(false);
  const aiSpeakingRef = useRef(false);
  const speechStartedAtRef = useRef<number | null>(null);
  const pendingTranscriptRef = useRef<{ text: string; isFinal: boolean } | null>(null);
  const transcriptFlushRef = useRef<number | null>(null);
  const wsSendQueueRef = useRef<string[]>([]);
  const wsFlushTimerRef = useRef<number | null>(null);
  const lastInterruptAtRef = useRef(0);
  const bargeInStreakRef = useRef(0);
  const triggerBargeInRef = useRef<() => void>(() => {});
  const lastAudioSentAtRef = useRef(Date.now());
  const feedRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(false);
  const userBubbleIdRef = useRef<string | null>(null);
  const assistantBubbleIdRef = useRef<string | null>(null);
  const lastUserTextRef = useRef("");
  const lastTapAtRef = useRef(0);
  const tapAckTimerRef = useRef<number | null>(null);
  const sessionVoiceUiRef = useRef<RealtimeSessionInfo["voice_ui"]>(undefined);
  const inCallRef = useRef(false);
  const summaryOnceRef = useRef(false);
  const interviewIndustryRef = useRef(interviewIndustry);
  const ieltsBandRef = useRef(ieltsBand);
  const groupRoomIdRef = useRef(groupRoomId);
  interviewIndustryRef.current = interviewIndustry;
  ieltsBandRef.current = ieltsBand;
  groupRoomIdRef.current = groupRoomId;
  const [disconnectFlash, setDisconnectFlash] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);

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

  const stopOmniPlayback = useCallback(() => {
    const ctx = omniAudioCtxRef.current;
    omniPlayTimeRef.current = ctx?.currentTime ?? 0;
    for (const src of omniSourcesRef.current) {
      try {
        src.stop(0);
      } catch {
        /* already stopped */
      }
      try {
        src.disconnect();
      } catch {
        /* ignore */
      }
    }
    omniSourcesRef.current = [];
    omniPlayTimeRef.current = 0;
    aiSpeakingRef.current = false;
    setAiSpeaking(false);
    void captureRef.current?.resume?.();
  }, []);

  const flushWsSendQueue = useCallback(() => {
    wsFlushTimerRef.current = null;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      wsSendQueueRef.current = [];
      return;
    }
    while (wsSendQueueRef.current.length > 0 && ws.bufferedAmount < 256_000) {
      const next = wsSendQueueRef.current.shift();
      if (next) ws.send(next);
    }
    if (wsSendQueueRef.current.length > 0 && wsFlushTimerRef.current === null) {
      wsFlushTimerRef.current = window.setTimeout(flushWsSendQueue, 16);
    }
  }, []);

  const queueWsSend = useCallback((payload: string, priority = false) => {
    if (priority) {
      wsSendQueueRef.current.unshift(payload);
    } else {
      wsSendQueueRef.current.push(payload);
    }
    if (!priority && wsSendQueueRef.current.length > 96) {
      wsSendQueueRef.current = wsSendQueueRef.current.slice(-72);
    }
    flushWsSendQueue();
  }, [flushWsSendQueue]);

  const sendWsControl = useCallback((payload: Record<string, unknown>) => {
    queueWsSend(JSON.stringify(payload), true);
  }, [queueWsSend]);

  const sendPcmAudio = useCallback((payload: string) => {
    lastAudioSentAtRef.current = Date.now();
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN && ws.bufferedAmount < PCM_DIRECT_SEND_LIMIT) {
      ws.send(payload);
      return;
    }
    queueWsSend(payload);
  }, [queueWsSend]);

  const triggerBargeIn = useCallback(() => {
    const now = Date.now();
    if (now - lastInterruptAtRef.current < 350) return;
    const coachPlaying = coachAudioPlaying(
      omniSourcesRef.current.length,
      omniAudioCtxRef.current,
      omniPlayTimeRef.current,
    );
    if (!coachPlaying && !aiSpeakingRef.current) return;
    lastInterruptAtRef.current = now;
    bargeInStreakRef.current = 0;
    stopOmniPlayback();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendWsControl({ type: "interrupt" });
    }
  }, [sendWsControl, stopOmniPlayback]);

  useEffect(() => {
    triggerBargeInRef.current = triggerBargeIn;
  }, [triggerBargeIn]);

  const markUserSpeaking = useCallback((speaking: boolean) => {
    userSpeakingRef.current = speaking;
    setUserSpeaking(speaking);
    if (speaking) {
      if (speechStartedAtRef.current === null) {
        speechStartedAtRef.current = Date.now();
      }
      return;
    }
    speechStartedAtRef.current = null;
  }, []);

  const applyTranscriptUpdate = useCallback((text: string, isFinal: boolean) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!userBubbleIdRef.current) {
      userBubbleIdRef.current = bubbleId("user");
    }
    const uid = userBubbleIdRef.current;
    markUserSpeaking(!isFinal);
    upsertBubble({
      id: uid,
      role: "user",
      text: trimmed,
      status: isFinal ? "final" : "streaming",
    });
    if (isFinal) {
      lastUserTextRef.current = trimmed;
      const turnId = bubbleId("turn");
      currentTurnIdRef.current = turnId;
      setTurns((prev) => [
        ...prev,
        {
          turn_id: turnId,
          userBubbleId: uid,
          assistantBubbleId: null,
          user_text: trimmed,
          ai_reply: "",
          hud: null,
          status: "replying",
          label: deriveTurnLabel(null, trimmed, prev.length),
          pinned: false,
          focusCount: 0,
        },
      ]);
      setActiveTurnId(turnId);
      userBubbleIdRef.current = null;
      markUserSpeaking(false);
    }
  }, [markUserSpeaking, upsertBubble]);

  const flushPendingTranscript = useCallback(() => {
    const pending = pendingTranscriptRef.current;
    if (!pending) return;
    pendingTranscriptRef.current = null;
    applyTranscriptUpdate(pending.text, pending.isFinal);
  }, [applyTranscriptUpdate]);

  const scheduleTranscriptUpdate = useCallback((text: string, isFinal: boolean) => {
    pendingTranscriptRef.current = { text, isFinal };
    if (isFinal) {
      if (transcriptFlushRef.current !== null) {
        window.cancelAnimationFrame(transcriptFlushRef.current);
        transcriptFlushRef.current = null;
      }
      flushPendingTranscript();
      return;
    }
    if (transcriptFlushRef.current !== null) return;
    transcriptFlushRef.current = window.requestAnimationFrame(() => {
      transcriptFlushRef.current = null;
      flushPendingTranscript();
    });
  }, [flushPendingTranscript]);

  const scrollFeedToBottom = useCallback((force = false) => {
    const el = feedRef.current;
    if (!el) return;
    if (force || stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollFeedToBottom();
    }
  }, [messages, turns, scrollFeedToBottom]);

  const selectorTurns = useMemo(() => voiceTurnsToSelector(turns), [turns]);
  const hudTurn = useMemo(() => {
    if (pinnedTurnId) return turns.find((t) => t.turn_id === pinnedTurnId) ?? null;
    if (activeTurnId) return turns.find((t) => t.turn_id === activeTurnId) ?? null;
    return turns[turns.length - 1] ?? null;
  }, [turns, activeTurnId, pinnedTurnId]);
  const displayHud = hudTurn?.hud ?? null;
  const displayPhase = hudTurn?.status === "analyzing" ? "analyzing" as const : null;

  const petMood = useMemo((): SceneMood => {
    return deriveVoiceSceneMood({
      inCall,
      turns,
      assistantStreaming: messages.some((m) => m.role === "assistant" && m.status === "streaming"),
    });
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
    if (presetGroupRoom) {
      setActiveMode(3);
      setGroupRoomId(presetGroupRoom);
    }
  }, [presetGroupRoom]);

  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

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

  const finishCallSummaryRef = useRef<() => Promise<void>>(async () => {});

  async function waitForPendingAnalysis(maxMs = 28000) {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      const snapshot = turnsSnapshotRef.current;
      const pending = snapshot.some((t) => {
        if (t.status === "analyzing") return true;
        if (!t.user_text.trim()) return false;
        if (t.status === "replying" && !t.ai_reply.trim()) return true;
        const hud = t.hud;
        if (
          !hud
          || (
            !hud.main_expression
            && !hud.corrected_sentence
            && !(hud.grammar_tips?.length)
            && !(hud.patterns_v2?.length)
          )
        ) {
          return t.status !== "ready";
        }
        return false;
      });
      if (!pending) return;
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
  }

  const connect = useCallback((): Promise<WebSocket> => {
    const token = getToken();
    if (!token) {
      return Promise.reject(new Error("请先登录后再使用 Voice Coach"));
    }
    const apiOrigin = API_BASE_URL || window.location.origin;
    const wsBase = toWebSocketBase(apiOrigin);
    const modeIdx = activeModeRef.current;
    const wsMode = modeIdx === 2 ? "interview" : modeIdx === 3 ? "group" : "free";
    const params = new URLSearchParams({ token, mode: wsMode });
    if (wsMode === "interview") {
      params.set("industry", interviewIndustryRef.current);
      params.set("ielts_band", ieltsBandRef.current);
    }
    if (wsMode === "group" && groupRoomIdRef.current) {
      params.set("room_id", groupRoomIdRef.current);
    }
    const ws = new WebSocket(`${wsBase}/api/voice/realtime?${params}`);
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
        if (!settled) {
          // Handshake never completed; the connect() rejection drives the UI.
          return;
        }
        // A fresh connect() may have already replaced wsRef with a new socket
        // (during auto-reconnect). Ignore stale close events from old sockets.
        if (wsRef.current && wsRef.current !== ws) return;

        captureRef.current?.stop();
        captureRef.current = null;

        if (manualCloseRef.current) {
          setInCall(false);
          return;
        }

        if (inCallRef.current) {
          // Unexpected drop mid-call — try to silently reconnect instead of
          // ending the session.
          reconnectVoiceRef.current();
          return;
        }

        setInCall(false);
        appendBubble({
          id: bubbleId("sys"),
          role: "system",
          text: "通话已结束",
          status: "final",
        });
      };
      ws.onmessage = (event) => {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data) as Record<string, unknown>;
        } catch {
          return;
        }

        if (data.type === "session") {
          const ready = data.ready !== false;
          const connectionError = typeof data.connection_error === "string" ? data.connection_error.trim() : "";
          if (!ready) {
            if (!settled) {
              settled = true;
              window.clearTimeout(timeout);
              ws.close();
              reject(new Error(connectionError || "语音服务连接失败，请稍后重试"));
            }
            return;
          }
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
          markUserSpeaking(false);
          if (tapAckTimerRef.current) window.clearTimeout(tapAckTimerRef.current);
          tapAckTimerRef.current = window.setTimeout(() => setTapAck(false), 1500);
          return;
        }

        if (data.type === "interrupted") {
          stopOmniPlayback();
          assistantBubbleIdRef.current = null;
          return;
        }

        if (data.type === "omni_closed") {
          sendWsControl({ type: "audio", action: "start" });
          void captureRef.current?.resume?.();
          return;
        }

        if (data.type === "pong") {
          return;
        }

        if (data.type === "speech_started") {
          triggerBargeInRef.current();
          markUserSpeaking(true);
          return;
        }

        if (data.type === "speech_stopped") {
          if (!userBubbleIdRef.current) {
            markUserSpeaking(false);
          }
          return;
        }

        if (data.type === "response_done") {
          void captureRef.current?.resume?.();
          return;
        }

        if (data.type === "transcript" && typeof data.text === "string") {
          scheduleTranscriptUpdate(data.text, Boolean(data.is_final));
          return;
        }

        if (data.type === "thinking") {
          aiSpeakingRef.current = true;
          setAiSpeaking(true);
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
          aiSpeakingRef.current = true;
          setAiSpeaking(true);
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
          aiSpeakingRef.current = true;
          setAiSpeaking(true);
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
  }, [activeMode, appendBubble, applyHudToCurrentTurn, markUserSpeaking, patchCurrentTurn, scheduleTranscriptUpdate, sendWsControl, stopOmniPlayback, t, upsertBubble]);

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
      omniSourcesRef.current.push(source);
      source.onended = () => {
        omniSourcesRef.current = omniSourcesRef.current.filter((node) => node !== source);
        if (omniSourcesRef.current.length === 0) {
          aiSpeakingRef.current = false;
          setAiSpeaking(false);
          void captureRef.current?.resume?.();
          if (userSpeakingRef.current && !userBubbleIdRef.current) {
            markUserSpeaking(false);
          }
        }
      };
      const startAt = Math.max(ctx.currentTime, omniPlayTimeRef.current);
      source.start(startAt);
      omniPlayTimeRef.current = startAt + buffer.duration;
    } catch {
      /* ignore playback errors */
    }
  }

  useEffect(() => () => {
    manualCloseRef.current = true;
    captureRef.current?.stop();
    stopOmniPlayback();
    wsRef.current?.close();
    if (tapAckTimerRef.current) window.clearTimeout(tapAckTimerRef.current);
    if (transcriptFlushRef.current !== null) window.cancelAnimationFrame(transcriptFlushRef.current);
    if (wsFlushTimerRef.current !== null) window.clearTimeout(wsFlushTimerRef.current);
  }, [stopOmniPlayback]);

  useEffect(() => {
    if (!inCall) return;
    const timer = window.setInterval(() => {
      const startedAt = speechStartedAtRef.current;
      if (!startedAt || !userSpeakingRef.current) return;
      if (Date.now() - startedAt < 55_000) return;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      sendWsControl({ type: "turn_complete" });
      speechStartedAtRef.current = Date.now();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [inCall, sendWsControl]);

  async function startMicStream(force = false) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (captureRef.current) {
      if (!force) return;
      captureRef.current.stop();
      captureRef.current = null;
    }
    sendWsControl({ type: "audio", action: "start" });
    const capture = await startPcmCapture(({ base64, sampleRate }) => {
      const coachPlaying = coachAudioPlaying(
        omniSourcesRef.current.length,
        omniAudioCtxRef.current,
        omniPlayTimeRef.current,
      );
      const rms = pcm16Base64Rms(base64);
      if (coachPlaying) {
        if (rms >= BARGE_IN_RMS) {
          bargeInStreakRef.current += 1;
          if (bargeInStreakRef.current >= BARGE_IN_FRAMES) {
            triggerBargeInRef.current();
          }
        } else {
          bargeInStreakRef.current = 0;
          return;
        }
      } else {
        bargeInStreakRef.current = 0;
      }
      sendPcmAudio(JSON.stringify({
        type: "audio",
        format: "pcm16",
        sample_rate: sampleRate,
        data: base64,
      }));
    }, {
      gateSilence: false,
      sendBatchMs: 20,
      maxPendingFrames: 3,
    });
    captureRef.current = capture;
    lastAudioSentAtRef.current = Date.now();
  }

  const ensureCallAlive = useCallback(async () => {
    if (!inCallRef.current) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      ws.send(JSON.stringify({ type: "ping" }));
    } catch {
      /* ignore */
    }

    void captureRef.current?.resume?.();

    const capture = captureRef.current;
    if (!capture?.isHealthy?.()) {
      await startMicStream(true);
      return;
    }

    const coachPlaying = coachAudioPlaying(
      omniSourcesRef.current.length,
      omniAudioCtxRef.current,
      omniPlayTimeRef.current,
    );
    if (!coachPlaying && Date.now() - lastAudioSentAtRef.current > 5000) {
      sendPcmAudio(JSON.stringify({
        type: "audio",
        format: "pcm16",
        sample_rate: 16000,
        data: pcm16SilenceBase64(120),
      }));
    }
  }, [sendPcmAudio]);

  useEffect(() => {
    if (!inCall) return;
    const timer = window.setInterval(() => {
      void ensureCallAlive();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [inCall, ensureCallAlive]);

  const finalizeDisconnect = useCallback(() => {
    setInCall(false);
    setConnected(false);
    captureRef.current?.stop();
    captureRef.current = null;
    setDisconnectFlash(true);
    window.setTimeout(() => setDisconnectFlash(false), 3200);
    appendBubble({
      id: bubbleId("sys"),
      role: "system",
      text: "通话已断开",
      status: "error",
    });
    void finishCallSummaryRef.current();
  }, [appendBubble]);

  async function attemptReconnect() {
    if (manualCloseRef.current || !inCallRef.current) return;
    if (reconnectAttemptsRef.current >= 3) {
      finalizeDisconnect();
      return;
    }
    reconnectAttemptsRef.current += 1;
    captureRef.current?.stop();
    captureRef.current = null;
    upsertBubble({
      id: CONNECTION_STATUS_BUBBLE_ID,
      role: "system",
      text: `连接中断，正在自动重连…（${reconnectAttemptsRef.current}/3）`,
      status: "streaming",
    });
    try {
      await connect();
      if (manualCloseRef.current || !inCallRef.current) return;
      reconnectAttemptsRef.current = 0;
      await startMicStream(true);
      upsertBubble({
        id: CONNECTION_STATUS_BUBBLE_ID,
        role: "system",
        text: "已重新接通，请继续说话",
        status: "final",
      });
    } catch {
      if (manualCloseRef.current || !inCallRef.current) return;
      window.setTimeout(() => reconnectVoiceRef.current(), 1500);
    }
  }

  useEffect(() => {
    reconnectVoiceRef.current = () => void attemptReconnect();
  });

  function signalTurnComplete() {
    if (!inCall || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (sessionVoiceUiRef.current?.tap_to_end === false) return;
    const now = Date.now();
    if (now - lastTapAtRef.current < 900) return;
    lastTapAtRef.current = now;
    sendWsControl({ type: "turn_complete" });
  }

  async function startCall() {
    if (connecting || inCall) return;
    if (isLoggedIn && !userHydrated) await loadUser();
    const fresh = useAuthStore.getState();
    if (isVoiceCoachBlocked(fresh.isLoggedIn, fresh.userHydrated, fresh.user)) {
      setShowVipVoicePrompt(true);
      return;
    }
    summaryOnceRef.current = false;
    manualCloseRef.current = false;
    reconnectAttemptsRef.current = 0;
    setConnecting(true);
    setTurns([]);
    setActiveTurnId(null);
    setPinnedTurnId(null);
    currentTurnIdRef.current = null;
    setCoachBriefing(null);
    upsertBubble({
      id: CONNECTION_STATUS_BUBBLE_ID,
      role: "system",
      text: "正在连接语音教练…",
      status: "streaming",
    });
    try {
      await connect();
      setConnecting(false);
      setInCall(true);
      setCallSeconds(0);
      const silenceSec = ((sessionVoiceUiRef.current?.silence_ms ?? 1000) / 1000).toFixed(1);
      const tapHint = sessionVoiceUiRef.current?.tap_to_end !== false
        ? `说完可轻点屏幕，或停顿约 ${silenceSec} 秒`
        : `说完后停顿约 ${silenceSec} 秒即可`;
      upsertBubble({
        id: CONNECTION_STATUS_BUBBLE_ID,
        role: "system",
        text: `通话已接通 · ${tapHint}，点击红色挂断结束`,
        status: "final",
      });
      await startMicStream();
    } catch (err) {
      captureRef.current?.stop();
      captureRef.current = null;
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
      setInCall(false);
      upsertBubble({
        id: CONNECTION_STATUS_BUBBLE_ID,
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

    const modeIdx = activeModeRef.current;
    const wsMode = modeIdx === 2 ? "interview" : modeIdx === 3 ? "group" : "free";
    let topic: string | undefined;
    if (wsMode === "interview") {
      topic = `English job interview — ${interviewIndustryRef.current} — IELTS ${ieltsBandRef.current}`;
    } else if (wsMode === "group") {
      topic = groupRoomIdRef.current
        ? `group voice room ${groupRoomIdRef.current}`
        : "group voice practice";
    }
    const payload = {
      duration_seconds: Math.max(1, callSecondsRef.current),
      mode: wsMode,
      provider: sessionInfoRef.current?.provider ?? "qwen-omni-realtime",
      topic,
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

  finishCallSummaryRef.current = async () => {
    if (summaryOnceRef.current) return;
    summaryOnceRef.current = true;
    await waitForPendingAnalysis();
    await fetchCallSummary();
  };

  async function endCall() {
    manualCloseRef.current = true;
    captureRef.current?.stop();
    captureRef.current = null;
    stopOmniPlayback();
    userBubbleIdRef.current = null;
    assistantBubbleIdRef.current = null;
    markUserSpeaking(false);
    wsSendQueueRef.current = [];
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "audio", action: "end" }));
      wsRef.current.send(JSON.stringify({ type: "close" }));
      wsRef.current.close();
    }
    wsRef.current = null;
    setInCall(false);
    setConnected(false);
    setConnecting(false);
    await waitForPendingAnalysis();
    void finishCallSummaryRef.current();
  }

  async function loadVoiceHistory() {
    setHistoryLoading(true);
    try {
      const rows = await listVoiceSessions();
      setVoiceHistory(
        rows.filter((row) => {
          const analysis = row.analysis || {};
          return Boolean(analysis.realtime_summary || analysis.report);
        }),
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  function continueFromHistory(session: VoiceSessionRecord) {
    const analysis = session.analysis || {};
    const mode = typeof analysis.mode === "string" ? analysis.mode : "free";
    if (mode === "interview") setActiveMode(2);
    else if (mode === "group") setActiveMode(3);
    else setActiveMode(0);
    setHistoryOpen(false);
    void startCall();
  }

  async function startGroupMatch() {
    if (connecting || inCall || groupMatching) return;
    if (isLoggedIn && !userHydrated) await loadUser();
    const fresh = useAuthStore.getState();
    if (isVoiceCoachBlocked(fresh.isLoggedIn, fresh.userHydrated, fresh.user)) {
      setShowVipVoicePrompt(true);
      return;
    }
    if (presetGroupRoom || groupRoomIdRef.current) {
      if (!hasProAccess(fresh.user)) {
        setShowVipVoicePrompt(true);
        return;
      }
      await startCall();
      return;
    }
    setGroupMatching(true);
    setGroupMatchStatus("正在匹配小组…");
    try {
      let status = await joinVoiceGroupMatch();
      setGroupMatchStatus(status.message || "匹配中…");
      if (status.status === "ready" && status.room_id) {
        setGroupRoomId(status.room_id);
        await startCall();
        return;
      }
      const deadline = Date.now() + 11000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        status = await pollVoiceGroupMatch();
        setGroupMatchStatus(status.message || "匹配中…");
        if (status.status === "ready" && status.room_id) {
          setGroupRoomId(status.room_id);
          await startCall();
          return;
        }
        if (status.status === "timeout" || status.status === "idle") {
          setGroupMatchStatus(status.message || "10 秒内未凑齐 3 人");
          break;
        }
      }
    } finally {
      setGroupMatching(false);
      void leaveVoiceGroupMatch();
    }
  }

  function interruptAi() {
    const now = Date.now();
    if (now - lastInterruptAtRef.current < 350) return;
    lastInterruptAtRef.current = now;

    stopOmniPlayback();
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (userSpeakingRef.current || userBubbleIdRef.current) {
      sendWsControl({ type: "turn_complete" });
      return;
    }

    sendWsControl({ type: "interrupt" });
    if (assistantBubbleIdRef.current) {
      setMessages((prev) => prev.map((msg) => (
        msg.id === assistantBubbleIdRef.current && msg.status === "streaming"
          ? { ...msg, status: "final" as const }
          : msg
      )));
    }
  }

  const statusLabel = connecting
    ? "连接中…"
    : inCall
    ? "通话中"
    : connected
    ? "已连接"
    : "未连接";

  const silenceMs = sessionInfo?.voice_ui?.silence_ms ?? 1000;
  const coachMarqueeLine = useMemo(
    () => buildCoachMarqueeLine(
      coachBriefing,
      silenceMs,
      sessionInfo?.voice_ui?.tap_to_end !== false,
      tapAck,
      activeMode === 2,
    ),
    [coachBriefing, silenceMs, sessionInfo?.voice_ui?.tap_to_end, tapAck, activeMode],
  );

  const shellClass = [
    "premium voice-chat-shell fixed inset-0 bg-surface text-on-surface flex flex-col overflow-hidden",
    inCall ? "voice-chat-shell--live" : "",
    connecting ? "voice-chat-shell--connecting" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={shellClass}>
      <AmbientScene mood={petMood} energized={inCall || connecting} live={inCall} connecting={connecting} />

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
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
          inCall
            ? "voice-call-live-badge voice-call-live-pulse"
            : connecting
              ? "voice-call-connecting-badge"
              : "bg-surface-container-high border-outline-variant/30"
        }`}>
          <span className={`material-symbols-outlined ${inCall ? "" : connecting ? "text-[18px]" : "text-[16px] text-on-surface-variant"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {inCall ? "call" : connecting ? "sync" : "call_end"}
          </span>
          <span className={`font-bold ${inCall ? "text-[14px]" : connecting ? "text-[14px] text-[#e11d48]" : "text-[12px] text-on-surface-variant"}`}>
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

      {!inCall && activeMode === 2 && (
        <div className="flex-shrink-0 mx-margin-mobile mt-3 p-3 rounded-xl bg-surface-container border border-outline-variant/20 space-y-3">
          <p className="text-[12px] font-semibold text-on-surface">面试设定</p>
          <div className="flex flex-wrap gap-2">
            {INTERVIEW_INDUSTRIES.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => setInterviewIndustry(ind)}
                className={
                  "px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors " +
                  (interviewIndustry === ind
                    ? "bg-primary text-white border-primary"
                    : "bg-surface-container-high text-on-surface-variant border-outline-variant/30")
                }
              >
                {ind}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-outline">雅思难度</span>
            {IELTS_BANDS.map((band) => (
              <button
                key={band}
                type="button"
                onClick={() => setIeltsBand(band)}
                className={
                  "px-2.5 py-1 rounded-lg text-[12px] font-bold " +
                  (ieltsBand === band ? "bg-tertiary-fixed text-tertiary-container" : "text-outline")
                }
              >
                {band}
              </button>
            ))}
          </div>
        </div>
      )}

      {!inCall && activeMode === 3 && (
        <div className="flex-shrink-0 mx-margin-mobile mt-3 p-3 rounded-xl bg-surface-container border border-outline-variant/20">
          <p className="text-[12px] text-on-surface-variant leading-relaxed">
            {presetGroupRoom
              ? "与语伴 + AI 语音群练（双方 Pro）。点击开始即可，无需等待第三人匹配。"
              : "小组语音：进入后自动匹配，至少 3 人、最多 5 人；10 秒内未凑齐则放弃。匹配成功后与 AI 一起群聊练习。"}
          </p>
          {groupMatchStatus && (
            <p className="text-[12px] font-semibold text-primary mt-2">{groupMatchStatus}</p>
          )}
        </div>
      )}

      {inCall && (
        <div className="voice-coach-marquee mt-1 mb-1">
          <div className="voice-coach-marquee-track">
            <span><strong>{activeMode === 2 ? "面试场景" : "教练了解你"}</strong> · {coachMarqueeLine}</span>
            <span aria-hidden><strong>{activeMode === 2 ? "面试场景" : "教练了解你"}</strong> · {coachMarqueeLine}</span>
          </div>
        </div>
      )}

      {!inCall && !connecting && <CompanionPet mood="idle" playRandomIdle />}

      {connecting && (
        <div className="voice-connecting-overlay" aria-live="polite">
          <div className="voice-pet-center-stage">
            <CompanionPet mood="thinking" playRandomIdle />
          </div>
          <div className="voice-status-pulse">
            <span className="material-symbols-outlined">sync</span>
            <p>连接中…</p>
            <p className="voice-status-sub">正在接通语音教练</p>
          </div>
        </div>
      )}

      {disconnectFlash && !inCall && !connecting && (
        <div className="voice-connecting-overlay" aria-live="assertive">
          <div className="voice-status-pulse voice-status-pulse--disconnect">
            <span className="material-symbols-outlined">call_end</span>
            <p>通话已断开</p>
            <p className="voice-status-sub">可点击下方重新开始</p>
          </div>
        </div>
      )}

      <div className="voice-chat-layout chat-detail-layout flex-1 min-h-0 flex flex-col">
        {(turns.length > 0) && (
          <div className={`voice-hud-strip${inCall ? " voice-hud-strip--in-call" : ""}${connecting ? " voice-hud-strip--connecting" : ""}`}>
            <TurnSelector
              turns={selectorTurns}
              activeTurnId={activeTurnId}
              pinnedTurnId={pinnedTurnId}
              onSelect={setActiveTurn}
              onPin={pinTurn}
              onUnpin={unpinTurn}
              minTurns={1}
            />
            <p className="voice-hud-hint">
              {inCall ? "实时学习要点 · 每轮异步生成" : "本轮学习要点（横滑）· 点击色块回顾历史轮次"}
            </p>
            <LearningHUD
              hud={displayHud}
              streamPhase={displayPhase}
              speak={speak}
              onTokenClick={(token, context) => setExplainToken({ token, context })}
              className="voice-learning-hud"
            />
          </div>
        )}

        <div className="voice-feed-stage flex-1 min-h-0 flex flex-col">
          {inCall && (
            <div className="voice-pet-float" aria-hidden>
              <CompanionPet mood={petMood} compact playRandomIdle />
            </div>
          )}
          <VoiceConversationFeed
            messages={messages}
            turns={turns}
            activeTurnId={activeTurnId}
            inCall={inCall}
            connecting={connecting}
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
      </div>

      {/* Bottom call controls — phone metaphor */}
      <div className="flex-shrink-0 px-margin-mobile py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-surface/90 backdrop-blur-xl border-t border-outline-variant/20 flex items-end justify-center gap-10 z-50">
        {!inCall ? (
          <>
            <button
              type="button"
              onClick={() => { setHistoryOpen(true); void loadVoiceHistory(); }}
              className="flex flex-col items-center gap-2 touch-manipulation active:scale-95 transition-transform"
            >
              <span className="w-14 h-14 rounded-full glass-panel border border-outline-variant/30 flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-[26px]">history</span>
              </span>
              <span className="text-[13px] font-bold text-primary">历史通话</span>
            </button>

            <button
              type="button"
              onClick={() => void (activeMode === 3 ? startGroupMatch() : startCall())}
              disabled={connecting || groupMatching || !membershipReady || voiceBlocked}
              className="flex flex-col items-center gap-2 touch-manipulation disabled:opacity-60"
            >
              <span className="w-[72px] h-[72px] rounded-full bg-primary text-white flex items-center justify-center shadow-[0_8px_32px_rgba(99,14,212,0.45)] active:scale-95 transition-transform">
                {connecting || groupMatching ? (
                  <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[32px]">call</span>
                )}
              </span>
              <span className="text-[15px] font-extrabold text-primary">
                {connecting ? "连接中…" : groupMatching ? "匹配中…" : activeMode === 3 ? (presetGroupRoom ? "开始群练" : "开始匹配") : "开始通话"}
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                interruptAi();
              }}
              onClick={interruptAi}
              className={`flex flex-col items-center gap-1 touch-manipulation active:scale-95 transition-transform voice-interrupt-btn${aiSpeaking || userSpeaking ? " voice-interrupt-btn--active" : ""}`}
              aria-label={userSpeaking ? "结束说话并发送" : "打断 AI 说话"}
            >
              <span className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined">{userSpeaking ? "done" : "front_hand"}</span>
              </span>
              <span className="text-[11px] text-outline">{userSpeaking ? "发送" : "打断"}</span>
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
              onClick={() => {
                stickToBottomRef.current = true;
                scrollFeedToBottom(true);
              }}
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

      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setHistoryOpen(false)}>
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[18px] text-on-surface">历史通话</h3>
              <button type="button" onClick={() => setHistoryOpen(false)} className="material-symbols-outlined text-on-surface-variant">close</button>
            </div>
            {historyLoading && <p className="text-[13px] text-outline py-4">加载中…</p>}
            {!historyLoading && voiceHistory.length === 0 && (
              <p className="text-[13px] text-outline py-4">暂无通话记录，完成一次语音练习后会出现在这里。</p>
            )}
            {!historyLoading && voiceHistory.map((session) => {
              const analysis = session.analysis || {};
              const report = (analysis.report || {}) as Record<string, unknown>;
              const mode = typeof analysis.mode === "string" ? analysis.mode : "free";
              const modeLabel = mode === "interview" ? "面试练习" : mode === "group" ? "小组语音" : "自由对话";
              const summary = typeof report.summary === "string" ? report.summary : "";
              const turnCount = typeof report.turn_count === "number" ? report.turn_count : 0;
              const created = session.created_at ? new Date(session.created_at).toLocaleString() : "";
              return (
                <div key={session.id} className="mb-3 p-4 rounded-2xl bg-surface-container border border-outline-variant/20">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-bold text-primary">{modeLabel}</span>
                    <span className="text-[11px] text-outline">{created}</span>
                  </div>
                  <p className="text-[12px] text-on-surface-variant line-clamp-2 mb-2">
                    {summary || `时长 ${formatCallDuration(session.duration_seconds)} · ${turnCount} 轮`}
                  </p>
                  <button
                    type="button"
                    onClick={() => continueFromHistory(session)}
                    className="text-[12px] font-bold text-primary"
                  >
                    继续练习 →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
