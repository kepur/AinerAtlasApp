import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiRequest, API_BASE_URL, getToken } from "../api";
import { LearningHUD } from "../components/learning/LearningHUD";
import type { HudData } from "../stores/chatStore";
import { useAuthStore } from "../stores/authStore";

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

type GrammarTip = { pattern: string; explanation: string };
type DebateScore = { pro_score: number; con_score: number; pro_count: number; con_count: number };

function readGrammarTips(analysis: Record<string, unknown>): GrammarTip[] {
  const value = analysis.grammar_tips;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (tip): tip is GrammarTip =>
      typeof tip === "object" &&
      tip !== null &&
      typeof (tip as { pattern?: unknown }).pattern === "string" &&
      typeof (tip as { explanation?: unknown }).explanation === "string"
  );
}

function analysisToHud(analysis: Record<string, unknown>, translated: string): HudData {
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

function speak(text: string, lang = "en-US") {
  if (!window.speechSynthesis || !text.trim()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  window.speechSynthesis.speak(u);
}

export default function CircleRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [room, setRoom] = useState<CircleRoom | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [debateScore, setDebateScore] = useState<DebateScore | null>(null);
  const [lastHud, setLastHud] = useState<HudData>(null);
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
            const data = JSON.parse(ev.data) as { type?: string; message?: CircleMessage };
            if (data.type === "message" && data.message) {
              const msg = data.message;
              setRoom((prev) => {
                if (!prev) return prev;
                if (prev.messages.some((m) => m.id === msg.id)) return prev;
                return { ...prev, messages: [...prev.messages, msg] };
              });
            }
          } catch {
            /* ignore */
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
      cancelled = true;
      ws?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [roomId, searchParams, navigate, loadRoom, ensureJoined]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.messages.length]);

  const ownLatestHud = useMemo(() => {
    if (!room || !currentUserId) return lastHud;
    const ownMessages = room.messages.filter((m) => m.role === "user" && m.user_id === currentUserId);
    const latest = ownMessages[ownMessages.length - 1];
    if (!latest) return lastHud;
    return analysisToHud(latest.analysis, latest.translated_content) || lastHud;
  }, [room, currentUserId, lastHud]);

  async function sendMessage() {
    if (!input.trim() || !roomId || roomId === "new" || sending) return;
    setSending(true);
    setAnalyzing(true);
    setSendError(null);
    try {
      const msg = await apiRequest<CircleMessage>(`/api/circles/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: input, content_language: "zh" }),
      });
      setInput("");
      setLastHud(analysisToHud(msg.analysis, msg.translated_content));
      await loadRoom(roomId);
    } catch {
      setSendError("发送失败：请先确认已加入讨论室，或稍后重试");
    } finally {
      setSending(false);
      setAnalyzing(false);
    }
  }

  async function bookmarkMessage(msgId: string) {
    if (!roomId) return;
    try {
      await apiRequest(`/api/circles/${roomId}/messages/${msgId}/bookmark`, { method: "POST" });
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
    <div className="premium fixed inset-0 bg-surface text-on-surface flex flex-col overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <header className="flex-shrink-0 flex items-center justify-between px-margin-mobile h-touch-target-min bg-surface/80 backdrop-blur-xl border-b border-white/20 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/home#today-topics")} className="material-symbols-outlined text-primary">arrow_back</button>
          <div className="min-w-0">
            <h2 className="font-bold text-[15px] text-on-surface truncate">{room?.title || "小组讨论"}</h2>
            <p className="text-[11px] text-on-surface-variant">
              {room?.status === "active" ? "进行中" : room?.status ?? "加载中..."}
              {room?.members.length ? ` · ${room.members.length} 成员` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/circles/summary/${roomId}`)}
            className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">auto_stories</span>
            总结
          </button>
        </div>
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
              style={{ width: `${debateScore.pro_score + debateScore.con_score > 0 ? Math.round(debateScore.pro_score / (debateScore.pro_score + debateScore.con_score) * 100) : 50}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto hide-scrollbar px-margin-mobile py-4 space-y-4">
        {!room?.messages.length && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant">forum</span>
            <p className="text-[14px] text-on-surface-variant">发表你的第一条观点，AI 会给出学习要点</p>
          </div>
        )}
        {room?.messages.map((msg) => {
          const isAI = msg.role === "assistant";
          const isOwn = !isAI && !!msg.user_id && msg.user_id === currentUserId;
          const grammarTips = isAI || isOwn ? readGrammarTips(msg.analysis) : [];
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
              <div className={`max-w-[85%] ${isAI ? "ai-message-gradient rounded-2xl rounded-tl-none border border-white/50" : "user-message-gradient rounded-2xl rounded-br-none"} p-4 shadow-sm`}>
                <p className={`text-[15px] leading-relaxed ${isAI ? "text-on-surface" : "text-white"}`}>{msg.content}</p>
                {msg.translated_content && (
                  <p className={`text-[12px] mt-1 italic ${isAI ? "text-on-surface-variant" : "text-white/70"}`}>{msg.translated_content}</p>
                )}
              </div>
              {grammarTips.length > 0 && (
                <div className="max-w-[85%] flex flex-col gap-1.5 items-end">
                  {isOwn && (
                    <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                      <span className="material-symbols-outlined text-[12px]">lock</span> 仅你可见的纠错
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {grammarTips.map((tip, i) => (
                      <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary text-[11px] rounded-full font-medium">
                        {tip.pattern}: {tip.explanation}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {isOwn && (
                <button
                  onClick={() => void bookmarkMessage(msg.id)}
                  className="flex items-center gap-1 text-[12px] text-on-surface-variant active:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">bookmark</span>
                  收藏到思想库
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t border-white/20 bg-surface/95 backdrop-blur-xl">
        <div className="px-margin-mobile pt-2 max-h-[38vh] overflow-y-auto hide-scrollbar">
          <LearningHUD
            hud={ownLatestHud}
            streamPhase={analyzing ? "analyzing" : null}
            speak={speak}
            onTokenClick={() => {}}
            className="circle-learning-hud"
          />
        </div>
        {sendError && (
          <p className="px-margin-mobile text-[12px] text-error pb-1">{sendError}</p>
        )}
        <div className="flex items-center gap-3 px-margin-mobile py-3">
          <div className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="发表你的观点..."
              onKeyDown={(e) => e.key === "Enter" && void sendMessage()}
              disabled={sending || room?.status !== "active"}
              className="w-full bg-transparent border-none outline-none text-[15px] text-on-surface placeholder:text-on-surface-variant/50 disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => void sendMessage()}
            disabled={sending || !input.trim() || room?.status !== "active"}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
