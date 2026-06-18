import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api";
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

export default function CircleRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [room, setRoom] = useState<CircleRoom | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [debateScore, setDebateScore] = useState<DebateScore | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roomId === "new") {
      const topicId = searchParams.get("topic");
      const title = searchParams.get("title") || "新小组讨论";
      apiRequest<CircleRoom>("/api/circles", {
        method: "POST",
        body: JSON.stringify({ title, topic_id: topicId, max_members: 8 })
      })
        .then((r) => navigate(`/circles/${r.id}`, { replace: true }))
        .catch(() => {});
      return;
    }
    if (!roomId) return;
    loadRoom(roomId);
    const interval = setInterval(() => loadRoom(roomId), 5000);
    return () => clearInterval(interval);
  }, [roomId, searchParams, navigate]);

  function loadRoom(id: string) {
    apiRequest<CircleRoom>(`/api/circles/${id}`)
      .then((r) => {
        setRoom(r);
        if (r.room_type === "debate_pk") {
          apiRequest<DebateScore>(`/api/circles/${id}/debate-score`).then(setDebateScore).catch(() => {});
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.messages.length]);

  async function sendMessage() {
    if (!input.trim() || !roomId || roomId === "new") return;
    setSending(true);
    try {
      await apiRequest(`/api/circles/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: input, content_language: "zh" })
      });
      setInput("");
      loadRoom(roomId);
    } catch { /* ignore */ }
    setSending(false);
  }

  async function bookmarkMessage(msgId: string) {
    if (!roomId) return;
    await apiRequest(`/api/circles/${roomId}/messages/${msgId}/bookmark`, { method: "POST" });
  }

  if (roomId === "new") {
    return (
      <div className="premium flex items-center justify-center min-h-screen bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-[14px] text-on-surface-variant">创建讨论室中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="premium fixed inset-0 bg-surface text-on-surface flex flex-col overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Header */}
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
            onClick={() => navigate(`/circles/${roomId}/summary`)}
            className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">auto_stories</span>
            总结
          </button>
        </div>
      </header>

      {/* Debate PK Score Panel */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-margin-mobile py-4 space-y-4">
        {!room?.messages.length && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant">forum</span>
            <p className="text-[14px] text-on-surface-variant">发表你的第一条观点</p>
          </div>
        )}
        {room?.messages.map((msg) => {
          const isAI = msg.role === "assistant";
          // Privacy: corrections are private to the author. Others only see the
          // natural translation + content, never the grammar/correction tips.
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
              {!isAI && msg.user_id && (
                <button
                  onClick={() => bookmarkMessage(msg.id)}
                  className="flex items-center gap-1 text-[12px] text-on-surface-variant active:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">bookmark</span>
                  收藏
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex items-center gap-3 px-margin-mobile py-3 bg-surface/90 backdrop-blur-xl border-t border-white/20">
        <div className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="发表你的观点..."
            onKeyDown={(e) => e.key === "Enter" && void sendMessage()}
            className="w-full bg-transparent border-none outline-none text-[15px] text-on-surface placeholder:text-on-surface-variant/50"
          />
        </div>
        <button
          onClick={() => void sendMessage()}
          disabled={sending || !input.trim()}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </div>
    </div>
  );
}
