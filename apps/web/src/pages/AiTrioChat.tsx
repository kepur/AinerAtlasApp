import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest, API_BASE_URL, enableFriendRoomAi, getToken } from "../api";
import { LearningHUD, TokenExplainSheet, TurnSelector, useTts } from "../components/learning";
import { countFocusPoints } from "../lib/voiceTurnHelpers";
import { hasProAccess } from "../lib/membership";
import { useAuthStore } from "../stores/authStore";
import type { HudData } from "../stores/chatStore";

type CircleMsg = {
  id: string;
  role: string;
  content: string;
  translated_content: string;
  user_id: string | null;
  analysis?: Record<string, unknown>;
  created_at?: string;
};

type CircleRoom = {
  id: string;
  title: string;
  status: string;
  room_type: string;
  summary?: Record<string, unknown>;
  messages: CircleMsg[];
  members: { user_id: string; role: string }[];
};

type ChatTurn = {
  turn_id: string;
  message_id: string;
  user_text: string;
  hud: HudData | null;
  status: "analyzing" | "ready";
  label: string;
  focusCount: number;
};

const QUICK_CHIPS = ["In my view...", "Building on that...", "Contrarily...", "Precisely."];

function analysisToHud(analysis: Record<string, unknown> | undefined): HudData | null {
  if (!analysis) return null;
  if (analysis.analysis_status === "pending") return null;
  if (analysis.main_expression || analysis.v2) return analysis as HudData;
  return null;
}

function mergeMessage(prev: CircleMsg[], incoming: CircleMsg): CircleMsg[] {
  const idx = prev.findIndex((m) => m.id === incoming.id);
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = { ...next[idx], ...incoming };
    return next;
  }
  return [...prev, incoming];
}

export default function AiTrioChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room");
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? "";

  const [room, setRoom] = useState<CircleRoom | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [aiHost, setAiHost] = useState(false);
  const [enablingAi, setEnablingAi] = useState(false);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [explainToken, setExplainToken] = useState<{ token: string; context: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { speak } = useTts();

  const isPro = hasProAccess(user);
  const aiEnabled = aiHost || room?.room_type === "language_circle" || Boolean(room?.summary?.ai_host);

  const loadRoom = useCallback(() => {
    if (!roomId) return;
    apiRequest<CircleRoom>(`/api/circles/${roomId}`)
      .then((r) => {
        setRoom(r);
        setAiHost(Boolean(r.summary?.ai_host) || r.room_type === "language_circle");
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed((prev) => prev || room === null));
  }, [roomId, room]);

  useEffect(() => {
    if (!roomId) return;
    loadRoom();
    apiRequest<CircleRoom>(`/api/circles/${roomId}/join`, { method: "POST" })
      .then((r) => {
        setRoom(r);
        setAiHost(Boolean(r.summary?.ai_host) || r.room_type === "language_circle");
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true));

    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(loadRoom, 4000);
    };

    const token = getToken();
    if (token) {
      const wsBase = (API_BASE_URL || window.location.origin).replace(/^http/i, "ws");
      const wsUrl = `${wsBase}/api/circles/ws/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
        };
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data) as {
              type?: string;
              message?: CircleMsg;
              ai_host?: boolean;
            };
            if (data.type === "room_updated" && data.ai_host) {
              setAiHost(true);
              return;
            }
            if (data.type === "message" && data.message) {
              const msg = data.message;
              setRoom((prev) => {
                if (!prev) return prev;
                return { ...prev, messages: mergeMessage(prev.messages, msg) };
              });
              return;
            }
            if (data.type === "message_updated" && data.message) {
              const msg = data.message;
              setRoom((prev) => {
                if (!prev) return prev;
                return { ...prev, messages: mergeMessage(prev.messages, msg) };
              });
            }
          } catch {
            /* ignore malformed frames */
          }
        };
        ws.onerror = () => startPolling();
        ws.onclose = () => startPolling();
      } catch {
        startPolling();
      }
    } else {
      startPolling();
    }

    return () => {
      ws?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [roomId, loadRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.messages.length]);

  const myTurns = useMemo((): ChatTurn[] => {
    if (!room || !currentUserId) return [];
    return room.messages
      .filter((m) => m.role === "user" && m.user_id === currentUserId)
      .map((m, idx) => {
        const hud = analysisToHud(m.analysis);
        const pending = m.analysis?.analysis_status === "pending";
        return {
          turn_id: m.id,
          message_id: m.id,
          user_text: m.content,
          hud,
          status: pending ? "analyzing" as const : "ready" as const,
          label: hud?.main_expression ? String(hud.main_expression).slice(0, 24) : `第 ${idx + 1} 轮`,
          focusCount: hud ? countFocusPoints(hud) : 0,
        };
      });
  }, [room, currentUserId]);

  const hudTurn = useMemo(() => {
    if (activeTurnId) return myTurns.find((t) => t.turn_id === activeTurnId) ?? null;
    return myTurns[myTurns.length - 1] ?? null;
  }, [myTurns, activeTurnId]);

  const selectorTurns = useMemo(
    () => myTurns.map((t) => ({
      turn_id: t.turn_id,
      user_message_id: t.message_id,
      assistant_message_id: "",
      user_text: t.user_text,
      ai_reply: "",
      hud: t.hud,
      status: t.status,
      label: t.label,
      pinned: false,
      focusCount: t.focusCount,
    })),
    [myTurns],
  );

  if (!roomId || (loadFailed && !room)) {
    return (
      <div className="premium fixed inset-0 bg-surface-bright text-on-surface flex flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">forum</span>
        <p className="text-on-surface-variant text-[15px]">
          {!roomId ? "没有指定对话房间，先去匹配一位语伴吧。" : "无法进入这个对话房间，可能已结束或不存在。"}
        </p>
        <div className="flex gap-3">
          {roomId && (
            <button
              onClick={() => { setLoadFailed(false); loadRoom(); }}
              className="px-5 py-2.5 rounded-full border border-primary/30 text-primary font-bold text-[14px] active:scale-95 transition-transform"
            >
              重试
            </button>
          )}
          <button
            onClick={() => navigate("/match")}
            className="px-5 py-2.5 rounded-full bg-primary text-white font-bold text-[14px] active:scale-95 transition-transform"
          >
            去匹配语伴
          </button>
        </div>
      </div>
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !roomId || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: CircleMsg = {
      id: tempId,
      role: "user",
      content: text,
      translated_content: "",
      user_id: currentUserId,
      analysis: { analysis_status: "pending" },
    };
    setRoom((prev) => (prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev));
    setInput("");
    setActiveTurnId(tempId);
    setSending(true);

    try {
      const msg = await apiRequest<CircleMsg>(`/api/circles/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text, content_language: "en" }),
      });
      setRoom((prev) => {
        if (!prev) return prev;
        const withoutTemp = prev.messages.filter((m) => m.id !== tempId);
        return { ...prev, messages: mergeMessage(withoutTemp, { ...msg, analysis: { analysis_status: "pending" } }) };
      });
      setActiveTurnId(msg.id);
    } catch {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) };
      });
    } finally {
      setSending(false);
    }
  }

  async function handleEnableAi() {
    if (!roomId || enablingAi || aiEnabled) return;
    if (!isPro) {
      navigate("/membership");
      return;
    }
    setEnablingAi(true);
    try {
      await enableFriendRoomAi(roomId);
      setAiHost(true);
      loadRoom();
    } catch {
      /* ignore */
    } finally {
      setEnablingAi(false);
    }
  }

  function handleChip(chip: string) {
    setInput((prev) => (prev ? `${prev} ${chip}` : chip));
    textareaRef.current?.focus();
  }

  const messages = room?.messages ?? [];
  const partnerMember = room?.members.find((m) => m.user_id !== currentUserId);

  return (
    <div className="premium fixed inset-0 bg-surface-bright text-on-surface flex flex-col overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-48 h-48 rounded-full bg-tertiary-fixed/20 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/40 to-surface" />
      </div>

      <header className="flex-shrink-0 flex items-center justify-between px-margin-mobile h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 z-50">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-on-surface-variant active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-bold text-[17px] text-primary tracking-tight leading-tight">
            {room?.title || "语伴对话"}
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-outline font-bold">
            {aiEnabled ? "好友 + AI" : "好友私聊"}
          </span>
        </div>
        <div className="flex gap-1">
          {aiEnabled && isPro && (
            <button
              type="button"
              onClick={() => navigate(`/voice?groupRoom=${roomId}`)}
              className="material-symbols-outlined text-primary text-[22px]"
              aria-label="语音群练"
            >
              call
            </button>
          )}
        </div>
      </header>

      {myTurns.length > 0 && (
        <div className="flex-shrink-0 px-margin-mobile pt-2 pb-1 border-b border-outline-variant/20 bg-surface/70">
          <TurnSelector
            turns={selectorTurns}
            activeTurnId={activeTurnId}
            pinnedTurnId={null}
            onSelect={setActiveTurnId}
            onPin={() => {}}
            onUnpin={() => {}}
            minTurns={1}
          />
          <LearningHUD
            hud={hudTurn?.hud ?? null}
            streamPhase={hudTurn?.status === "analyzing" ? "analyzing" : null}
            speak={speak}
            onTokenClick={(token, context) => setExplainToken({ token, context })}
            className="voice-learning-hud mt-2"
          />
        </div>
      )}

      {!aiEnabled && room?.room_type === "dm" && (
        <div className="mx-margin-mobile mt-2 p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between gap-3">
          <p className="text-[12px] text-on-surface-variant leading-snug flex-1">
            {isPro
              ? "邀请 AI 主持人加入，三人一起练表达（双方均需 Pro）"
              : "升级 Pro 后可与语伴一起邀请 AI 主持群聊"}
          </p>
          <button
            type="button"
            disabled={enablingAi || !isPro}
            onClick={() => void handleEnableAi()}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-primary text-white text-[12px] font-bold disabled:opacity-40"
          >
            {enablingAi ? "…" : "邀请 AI"}
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto hide-scrollbar px-margin-mobile space-y-4 py-4 pb-8">
        <div className="flex justify-center gap-8 pt-1 pb-1">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">我</div>
            <span className="text-[10px] text-outline">You</span>
          </div>
          {aiEnabled && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[18px]">smart_toy</span>
              </div>
              <span className="text-[10px] text-outline">AI</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed/30 flex items-center justify-center font-bold text-tertiary-container text-sm">
              {(partnerMember?.user_id ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <span className="text-[10px] text-outline">Partner</span>
          </div>
        </div>

        {messages.map((msg) => {
          const isAI = msg.role === "assistant";
          const isMine = msg.user_id === currentUserId;
          if (isAI) {
            return (
              <div key={msg.id} className="flex items-start gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
                </div>
                <div className="ai-message-gradient p-4 rounded-2xl rounded-tl-none shadow-sm border border-white/50">
                  <p className="text-[15px] text-on-surface leading-relaxed">{msg.content}</p>
                  {msg.translated_content && (
                    <p className="text-[12px] text-on-surface-variant mt-1 italic">{msg.translated_content}</p>
                  )}
                </div>
              </div>
            );
          }
          if (isMine) {
            const pending = msg.analysis?.analysis_status === "pending";
            return (
              <div key={msg.id} className="flex flex-col items-end gap-1">
                <div className="user-message-gradient p-4 rounded-2xl rounded-br-none shadow-lg max-w-[85%]">
                  <p className="text-[15px] text-white leading-relaxed">{msg.content}</p>
                </div>
                {pending && (
                  <span className="text-[11px] text-outline mr-1">学习分析中…</span>
                )}
                {msg.translated_content && (
                  <p className="text-[12px] text-on-surface-variant mr-1 italic max-w-[85%] text-right">{msg.translated_content}</p>
                )}
              </div>
            );
          }
          return (
            <div key={msg.id} className="flex items-start gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                P
              </div>
              <div className="bg-surface-container-low p-4 rounded-2xl rounded-tl-none shadow-sm border border-outline-variant/20">
                <p className="text-[15px] text-on-surface leading-relaxed">{msg.content}</p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </main>

      <div className="flex-shrink-0 z-40 bg-surface/90 backdrop-blur-2xl border-t border-outline-variant/30 px-margin-mobile pt-3 pb-6">
        <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Say something in English…"
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 resize-none min-h-[24px] max-h-32"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim()}
            className="flex-shrink-0 w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-md active:scale-95 transition-transform disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar -mx-2 px-2 pb-1">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              className="whitespace-nowrap px-4 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/20 text-[12px] text-on-surface-variant active:bg-primary-container/10 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

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
