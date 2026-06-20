import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiRequest, API_BASE_URL, getToken } from "../api";
import { AmbientScene, CompanionPet, deriveChatSceneMood } from "../components/ambient";
import "../components/ambient/ambient.css";
import { LearningHUD, TurnSelector, useTts } from "../components/learning";
import type { HudData } from "../stores/chatStore";
import type { DialogueTurn } from "../stores/chatStore";
import { useAuthStore } from "../stores/authStore";
import "../MessageBubble.css";

type CircleMessage = {
  id: string;
  role: string;
  content: string;
  translated_content: string;
  analysis: Record<string, unknown>;
  user_id: string | null;
  created_at: string;
};

type CircleRoom = {
  id: string;
  title: string;
  status: string;
  room_type: string;
  messages: CircleMessage[];
  members: { user_id: string; role: string }[];
};

type DebateScore = { pro_score: number; con_score: number; pro_count: number; con_count: number };

function isAnalysisPending(analysis: Record<string, unknown>): boolean {
  return analysis?.analysis_status === "pending";
}

function analysisToHud(analysis: Record<string, unknown>, translated: string): HudData {
  if (isAnalysisPending(analysis)) return null;
  if (analysis.v2 && analysis.main_expression) {
    return analysis as HudData;
  }
  const main = (analysis.main_expression as string) || translated || "";
  if (!main) return null;
  const tips = readGrammarTips(analysis);
  return {
    main_expression: main,
    variants: (analysis.variants as Record<string, string>) || { natural_spoken: main },
    grammar_tips: tips,
    patterns_v2: Array.isArray(analysis.patterns_v2) ? analysis.patterns_v2 : [],
    vocabulary: Array.isArray(analysis.vocabulary) ? analysis.vocabulary : [],
    why_this_expression: Array.isArray(analysis.why_this_expression) ? analysis.why_this_expression : [],
    agents: Array.isArray(analysis.agents) ? analysis.agents : [],
  } as HudData;
}

function readGrammarTips(analysis: Record<string, unknown>) {
  const value = analysis.grammar_tips;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (tip): tip is { pattern: string; explanation: string } =>
      typeof tip === "object" &&
      tip !== null &&
      typeof (tip as { pattern?: unknown }).pattern === "string" &&
      typeof (tip as { explanation?: unknown }).explanation === "string"
  );
}

function mergeMessage(list: CircleMessage[], msg: CircleMessage): CircleMessage[] {
  const idx = list.findIndex((m) => m.id === msg.id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = msg;
    return next;
  }
  if (list.some((m) => m.id === msg.id)) return list;
  return [...list, msg];
}

export default function CircleRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { speak } = useTts();
  const [room, setRoom] = useState<CircleRoom | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [debateScore, setDebateScore] = useState<DebateScore | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [analyzingMessageId, setAnalyzingMessageId] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadRoom = useCallback((id: string) => {
    return apiRequest<CircleRoom>(`/api/circles/${id}`)
      .then((r) => {
        setRoom(r);
        setLoadError(null);
        if (r.room_type === "debate_pk") {
          apiRequest<DebateScore>(`/api/circles/${id}/debate-score`).then(setDebateScore).catch(() => {});
        }
        return r;
      })
      .catch(() => {
        setLoadError("无法加载讨论室");
        return null;
      });
  }, []);

  const ensureJoined = useCallback(async (id: string) => {
    try {
      const r = await apiRequest<CircleRoom>(`/api/circles/${id}/join`, { method: "POST" });
      setRoom(r);
      setLoadError(null);
      return r;
    } catch {
      setLoadError("无法加入讨论室，可能已满或已结束");
      return null;
    }
  }, []);

  const applyWsMessage = useCallback((msg: CircleMessage) => {
    setRoom((prev) => {
      if (!prev) return prev;
      return { ...prev, messages: mergeMessage(prev.messages, msg) };
    });
    if (msg.user_id === currentUserId && !isAnalysisPending(msg.analysis)) {
      setAnalyzingMessageId((cur) => (cur === msg.id ? null : cur));
    }
  }, [currentUserId]);

  useEffect(() => {
    if (roomId === "new") {
      const topicId = searchParams.get("topic");
      const title = searchParams.get("title") || "新小组讨论";
      if (topicId) {
        apiRequest<CircleRoom>("/api/circles/join-topic", {
          method: "POST",
          body: JSON.stringify({ topic_id: topicId }),
        })
          .then((r) => navigate(`/circles/${r.id}`, { replace: true }))
          .catch(() => setLoadError("无法加入话题讨论"));
        return;
      }
      apiRequest<CircleRoom>("/api/circles", {
        method: "POST",
        body: JSON.stringify({ title, topic_id: topicId, max_members: 8 }),
      })
        .then((r) => navigate(`/circles/${r.id}`, { replace: true }))
        .catch(() => setLoadError("无法创建讨论室"));
      return;
    }
    if (!roomId) return;

    let cancelled = false;
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => void loadRoom(roomId), 5000);
    };

    void (async () => {
      await loadRoom(roomId);
      if (cancelled) return;
      await ensureJoined(roomId);
    })();

    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
    const clearPing = () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    };
    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      attempts += 1;
      const delay = Math.min(1000 * 2 ** Math.min(attempts, 4), 15_000);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (cancelled) return;
      const token = getToken();
      if (!token) {
        startPolling();
        return;
      }
      const wsBase = (API_BASE_URL || window.location.origin).replace(/^http/i, "ws");
      const wsUrl = `${wsBase}/api/circles/ws/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        startPolling();
        scheduleReconnect();
        return;
      }
      ws.onopen = () => {
        attempts = 0;
        stopPolling();
        void loadRoom(roomId);
        clearPing();
        pingTimer = setInterval(() => {
          try {
            if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
          } catch { /* ignore */ }
        }, 25_000);
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as {
            type?: string;
            message?: CircleMessage;
          };
          if (!data.message) return;
          if (data.type === "message" || data.type === "message_updated") {
            applyWsMessage(data.message);
          }
        } catch {
          /* ignore */
        }
      };
      ws.onerror = () => startPolling();
      ws.onclose = () => {
        clearPing();
        if (cancelled) return;
        startPolling();
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearPing();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopPolling();
      ws?.close();
    };
  }, [roomId, searchParams, navigate, loadRoom, ensureJoined, applyWsMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.messages.length]);

  useEffect(() => {
    if (!analyzingMessageId || !roomId) return;
    const timer = setInterval(() => {
      void loadRoom(roomId).then((r) => {
        const msg = r?.messages.find((m) => m.id === analyzingMessageId);
        if (msg && !isAnalysisPending(msg.analysis)) {
          setAnalyzingMessageId(null);
        }
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [analyzingMessageId, roomId, loadRoom]);

  const ownMessages = useMemo(() => {
    if (!room || !currentUserId) return [];
    return room.messages.filter((m) => m.role === "user" && m.user_id === currentUserId);
  }, [room, currentUserId]);

  useEffect(() => {
    if (!ownMessages.length) return;
    setActiveMessageId((cur) => {
      if (cur && ownMessages.some((m) => m.id === cur)) return cur;
      return ownMessages[ownMessages.length - 1].id;
    });
  }, [ownMessages]);

  const circleTurns: DialogueTurn[] = useMemo(() => {
    return ownMessages.map((m, idx) => {
      const hud = analysisToHud(m.analysis, m.translated_content);
      const pending = isAnalysisPending(m.analysis);
      return {
        turn_id: m.id,
        user_message_id: m.id,
        assistant_message_id: "",
        user_text: m.content,
        ai_reply: "",
        hud,
        status: pending ? "analyzing" : "ready",
        label: pending
          ? (m.content.length > 10 ? `${m.content.slice(0, 10)}…` : m.content) || `T${idx + 1}`
          : (hud?.main_expression?.slice(0, 14) || m.content.slice(0, 10) || `T${idx + 1}`),
        pinned: m.id === pinnedMessageId,
        focusCount: hud ? (Array.isArray(hud.patterns_v2) ? hud.patterns_v2.length : 0) : 0,
      };
    });
  }, [ownMessages, pinnedMessageId]);

  const activeHud = useMemo(() => {
    const targetId = pinnedMessageId ?? activeMessageId;
    const msg = ownMessages.find((m) => m.id === targetId) ?? ownMessages[ownMessages.length - 1];
    if (!msg) return null;
    return analysisToHud(msg.analysis, msg.translated_content);
  }, [ownMessages, activeMessageId, pinnedMessageId]);

  const hudStreamPhase = useMemo(() => {
    const targetId = pinnedMessageId ?? activeMessageId ?? analyzingMessageId;
    if (!targetId) return null;
    const msg = ownMessages.find((m) => m.id === targetId);
    if (msg && isAnalysisPending(msg.analysis)) return "analyzing" as const;
    if (analyzingMessageId === targetId) return "analyzing" as const;
    return null;
  }, [ownMessages, activeMessageId, pinnedMessageId, analyzingMessageId]);

  const petMood = deriveChatSceneMood({
    sending,
    streamPhase: hudStreamPhase,
    turns: circleTurns,
    draft: input,
  });
  const sceneEnergized = sending || input.trim().length > 0 || !!hudStreamPhase;

  async function sendMessage() {
    const text = input.trim();
    if (!text || !roomId || roomId === "new" || sending) return;

    const content = text;
    setInput("");
    setSending(true);
    setSendError(null);

    const tempId = `temp-${Date.now()}`;
    const optimistic: CircleMessage = {
      id: tempId,
      role: "user",
      content,
      translated_content: "",
      analysis: { analysis_status: "pending" },
      user_id: currentUserId ?? null,
      created_at: new Date().toISOString(),
    };

    setRoom((prev) => (prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev));
    setActiveMessageId(tempId);
    setAnalyzingMessageId(tempId);

    try {
      const msg = await apiRequest<CircleMessage>(`/api/circles/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, content_language: "zh" }),
      });
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) => (m.id === tempId ? msg : m)),
        };
      });
      setActiveMessageId(msg.id);
      setAnalyzingMessageId(msg.id);
    } catch {
      setRoom((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) } : prev,
      );
      setInput(content);
      setSendError("发送失败：请先确认已加入讨论室，或稍后重试");
      setAnalyzingMessageId(null);
    } finally {
      setSending(false);
    }
  }

  async function bookmarkMessage(msgId: string) {
    if (!roomId || bookmarkedIds.has(msgId)) return;
    try {
      await apiRequest(`/api/circles/${roomId}/messages/${msgId}/bookmark`, { method: "POST" });
      setBookmarkedIds((prev) => new Set(prev).add(msgId));
    } catch {
      setSendError("收藏失败，请稍后重试");
    }
  }

  if (roomId === "new") {
    return (
      <div className="premium flex items-center justify-center min-h-screen bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-[14px] text-on-surface-variant">
            {loadError || "进入讨论室中..."}
          </p>
        </div>
      </div>
    );
  }

  if (loadError && !room) {
    return (
      <div className="premium flex flex-col items-center justify-center min-h-screen bg-surface gap-4 px-8 text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">forum</span>
        <p className="text-[15px] text-on-surface-variant">{loadError}</p>
        <button
          onClick={() => navigate("/home#today-topics")}
          className="px-5 py-2.5 rounded-full bg-primary text-white font-bold text-[14px]"
        >
          返回话题广场
        </button>
      </div>
    );
  }

  return (
    <div className="chat-detail-layout ambient-shell circle-room-layout fixed inset-0 overflow-hidden">
      <AmbientScene mood={petMood} energized={sceneEnergized} />

      <div className="chat-detail-ambient-body flex flex-col min-h-0">
        <header className="flex-shrink-0 flex items-center justify-between px-margin-mobile h-touch-target-min bg-surface/80 backdrop-blur-xl border-b border-white/20 z-40">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/home#today-topics")} className="material-symbols-outlined text-primary flex-shrink-0">
              arrow_back
            </button>
            <div className="min-w-0">
              <h2 className="font-bold text-[15px] text-on-surface truncate">{room?.title || "小组讨论"}</h2>
              <p className="text-[11px] text-on-surface-variant">
                {room?.status === "active" ? "进行中" : room?.status ?? "加载中..."}
                {room?.members.length ? ` · ${room.members.length} 成员` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/circles/summary/${roomId}`)}
            className="flex-shrink-0 flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">auto_stories</span>
            总结
          </button>
        </header>

        {room?.room_type === "debate_pk" && debateScore && (
          <div className="flex-shrink-0 px-margin-mobile py-2 bg-surface/60 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">PRO 正方</p>
                <p className="font-bold text-[22px] text-primary">{debateScore.pro_score}</p>
                <p className="text-[10px] text-on-surface-variant">{debateScore.pro_count} 条论点</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">gavel</span>
                <span className="text-[10px] text-on-surface-variant font-bold">VS</span>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[10px] font-bold text-error uppercase tracking-wider mb-1">CON 反方</p>
                <p className="font-bold text-[22px] text-error">{debateScore.con_score}</p>
                <p className="text-[10px] text-on-surface-variant">{debateScore.con_count} 条论点</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full bg-error/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${
                    debateScore.pro_score + debateScore.con_score > 0
                      ? Math.round((debateScore.pro_score / (debateScore.pro_score + debateScore.con_score)) * 100)
                      : 50
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        <p className="flex-shrink-0 px-4 py-1 text-[11px] text-on-surface-variant">
          本轮学习要点（实时）· 消息先发群聊，分析在后台进行
        </p>

        <TurnSelector
          turns={circleTurns}
          activeTurnId={pinnedMessageId ?? activeMessageId}
          pinnedTurnId={pinnedMessageId}
          onSelect={setActiveMessageId}
          onPin={setPinnedMessageId}
          onUnpin={() => setPinnedMessageId(null)}
          minTurns={1}
        />

        <LearningHUD
          hud={activeHud}
          streamPhase={hudStreamPhase}
          speak={speak}
          onTokenClick={() => {}}
          className="circle-learning-hud flex-shrink-0"
        />

        <div className="flex-1 overflow-y-auto hide-scrollbar px-margin-mobile py-4 space-y-4 min-h-0">
          {!room?.messages.length && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant">forum</span>
              <p className="text-[14px] text-on-surface-variant">发表你的第一条观点，AI 会给出学习要点</p>
            </div>
          )}
          {room?.messages.map((msg) => {
            const isAI = msg.role === "assistant";
            const isOwn = !isAI && !!msg.user_id && msg.user_id === currentUserId;
            const pending = isOwn && isAnalysisPending(msg.analysis);
            return (
              <div key={msg.id} className={`flex flex-col gap-2 ${isAI ? "items-start" : "items-end"}`}>
                {isAI && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[14px]">smart_toy</span>
                    </div>
                    <span className="text-[11px] font-bold text-primary">AinerWise AI</span>
                  </div>
                )}
                {!isAI && !isOwn && msg.user_id && (
                  <span className="text-[10px] text-on-surface-variant">成员</span>
                )}
                <div
                  className={`max-w-[85%] ${
                    isAI
                      ? "ai-message-gradient rounded-2xl rounded-tl-none border border-white/50"
                      : "user-message-gradient rounded-2xl rounded-br-none"
                  } p-4 shadow-sm ${pending ? "opacity-90" : ""}`}
                >
                  <p className={`text-[15px] leading-relaxed ${isAI ? "text-on-surface" : "text-white"}`}>
                    {msg.content}
                  </p>
                  {msg.translated_content && !pending && (
                    <p className={`text-[12px] mt-1 italic ${isAI ? "text-on-surface-variant" : "text-white/70"}`}>
                      {msg.translated_content}
                    </p>
                  )}
                  {pending && (
                    <p className={`text-[11px] mt-1 ${isAI ? "text-on-surface-variant" : "text-white/60"}`}>
                      已发送 · 学习分析中…
                    </p>
                  )}
                  {isAI && msg.translated_content && (
                    <p className="text-[11px] mt-2 text-on-surface-variant/80 italic">{msg.translated_content}</p>
                  )}
                </div>
                {isOwn && !pending && (
                  <button
                    type="button"
                    onClick={() => void bookmarkMessage(msg.id)}
                    disabled={bookmarkedIds.has(msg.id)}
                    className={`as-chip as-chip--sm ${bookmarkedIds.has(msg.id) ? "as-chip--saved" : "as-chip--accent"}`}
                    title={bookmarkedIds.has(msg.id) ? "已加入思想库" : "收藏到思想库"}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={bookmarkedIds.has(msg.id) ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      bookmark
                    </span>
                    {bookmarkedIds.has(msg.id) ? "已收藏" : "收藏到思想库"}
                  </button>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <CompanionPet mood={petMood} compact />

        <div className="flex-shrink-0 border-t border-white/20 bg-surface/95 backdrop-blur-xl">
          {sendError && (
            <p className="px-margin-mobile pt-2 text-[12px] text-error">{sendError}</p>
          )}
          <div className="flex items-center gap-3 px-margin-mobile py-3">
            <div className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="发表你的观点..."
                onKeyDown={(e) => e.key === "Enter" && void sendMessage()}
                disabled={room?.status !== "active"}
                className="w-full bg-transparent border-none outline-none text-[15px] text-on-surface placeholder:text-on-surface-variant/50 disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => void sendMessage()}
              disabled={sending || !input.trim() || room?.status !== "active"}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
