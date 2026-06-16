import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2, Volume2, Lightbulb, ChevronUp, ChevronDown } from "lucide-react";
import { useGameStore, FeedItem, GameSession } from "../../stores/gameStore";

export default function UnifiedGameChat() {
  const { mode, id } = useParams<{ mode: string; id: string }>();
  const navigate = useNavigate();
  const {
    currentSession, feedItems, currentHud, turnLoading,
    createSession, loadSession, sendTurn, loadSummary, summary, clearCurrent,
  } = useGameStore();

  const [input, setInput] = useState("");
  const [hudOpen, setHudOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);

  useEffect(() => {
    return () => { clearCurrent(); };
  }, []);

  useEffect(() => {
    if (!id || !mode) return;
    if (initRef.current) return;
    initRef.current = true;
    const isUuid = /^[0-9a-f-]{36}$/.test(id);
    if (isUuid) {
      loadSession(id);
    } else {
      initGame(mode, id);
    }
  }, [mode, id]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedItems]);

  useEffect(() => {
    if (currentHud && Object.keys(currentHud).length > 0) {
      setHudOpen(true);
    }
  }, [currentHud]);

  const initGame = async (gameType: string, slug: string) => {
    setCreating(true);
    try {
      const sess = await createSession(gameType, slug, { case_id: slug, story_id: slug });
      await sendTurn(sess.id, "start");
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async () => {
    if (!currentSession || !input.trim() || turnLoading) return;
    const text = input.trim();
    setInput("");
    await sendTurn(currentSession.id, "message", text);
  };

  const handleChoice = async (action: string) => {
    if (!currentSession || turnLoading) return;
    await sendTurn(currentSession.id, "choice", action);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const phase = currentSession?.phase || "lobby";
  const view = (currentSession?.view || {}) as Record<string, unknown>;
  const hudMainExpr = ((currentHud?.main_expression || currentHud?.main_reply_target || "") as string);
  const hudMeaning = ((currentHud?.meaning_native || currentHud?.main_reply_native || "") as string);
  const lastChoices = feedItems.filter((f) => f.type === "choices").pop();
  const choices = (lastChoices?.choices as Array<{ label: string; action: string }>) || [];
  const inputMode = (currentSession?.view as Record<string, unknown>)?.input_mode || "mixed";

  if (creating) {
    return (
      <div className="w-full h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#8b5cf6]" />
          <span className="text-white/60 text-sm">正在创建游戏...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#0b0c10] flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,12px)] bg-[#0b0c10]/90 backdrop-blur-xl shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between h-12">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white bg-white/10 rounded-full">
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col items-center flex-1 px-4">
            <div className="font-bold text-white text-[14px]">{currentSession?.title || "游戏"}</div>
            <div className="text-[10px] text-white/50">{phase} · 回合 {currentSession?.turn_count || 0}</div>
          </div>
          <div className="w-8" />
        </div>

        {/* Character strip for roleplay */}
        {mode === "roleplay" && Array.isArray(view.characters) && (
          <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
            {(view.characters as Array<{ name: string; name_en: string; relationship: number }>).map((c, i) => (
              <div key={i} className="shrink-0 flex items-center gap-1.5 bg-white/5 rounded-full px-2.5 py-1 border border-white/10">
                <span className="text-white text-[10px] font-bold">{c.name}</span>
                <span className={`text-[9px] font-bold ${c.relationship >= 60 ? "text-[#34d399]" : c.relationship >= 40 ? "text-[#fbbf24]" : "text-[#f87171]"}`}>
                  ♥{c.relationship}
                </span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 flex flex-col gap-3 no-scrollbar">
        {feedItems.map((item, idx) => (
          <GameFeedItem key={idx} item={item} />
        ))}
        {turnLoading && (
          <div className="flex items-center gap-2 text-white/40 text-xs px-2">
            <Loader2 size={12} className="animate-spin" /> AI 思考中...
          </div>
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Learning HUD (collapsible) */}
      {currentHud && Object.keys(currentHud).length > 0 && (
        <div className={`bg-[#1f2937]/95 backdrop-blur-xl border-t border-[#8b5cf6]/30 z-40 transition-all ${hudOpen ? "max-h-[300px]" : "max-h-[36px]"} overflow-hidden`}>
          <button
            onClick={() => setHudOpen(!hudOpen)}
            className="w-full flex justify-between items-center px-4 py-2 text-[11px] font-bold text-[#c4b5fd]"
          >
            <span className="flex items-center gap-1.5">
              <Lightbulb size={12} className="text-[#8b5cf6]" /> 学习助手
            </span>
            {hudOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          {hudOpen && (
            <div className="px-4 pb-3 flex flex-col gap-2">
              {hudMainExpr && (
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-[14px] flex-1">{hudMainExpr}</h4>
                  <button className="w-7 h-7 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] flex items-center justify-center">
                    <Volume2 size={14} />
                  </button>
                </div>
              )}
              {hudMeaning && (
                <p className="text-white/50 text-[11px]">{hudMeaning}</p>
              )}
              {Array.isArray(currentHud.agents) && (currentHud.agents as Array<{ agent: string; result: string }>).map((a, i) => (
                <div key={i} className="text-[10px]">
                  <span className="text-[#8b5cf6] font-bold">{a.agent}：</span>
                  <span className="text-white/60">{a.result}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Choices */}
      {choices.length > 0 && phase === "playing" && (
        <div className="px-4 py-2 flex flex-col gap-1.5 bg-[#0b0c10]/90 border-t border-white/5">
          {choices.map((c, i) => (
            <button
              key={i}
              onClick={() => handleChoice(c.label || c.action)}
              disabled={turnLoading}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left text-white/80 text-[12px] font-medium hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      {phase !== "summary" && phase !== "lobby" && currentSession?.status === "active" && (
        <div className="w-full bg-[#0b0c10]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] z-50">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 bg-white/10 border border-white/20 rounded-full flex items-center px-4 focus-within:border-[#8b5cf6] focus-within:ring-1 focus-within:ring-[#8b5cf6] transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入对话..."
                className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-[#9ca3af]"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={turnLoading || !input.trim()}
              className="w-10 h-10 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.5)] active:scale-95 transition-transform disabled:opacity-40"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* Ended state */}
      {currentSession?.status === "ended" && !summary && (
        <div className="w-full bg-[#0b0c10]/95 border-t border-white/5 px-4 py-4 z-50 flex justify-center">
          <button
            onClick={() => currentSession && loadSummary(currentSession.id)}
            className="px-6 py-3 bg-[#8b5cf6] text-white rounded-full font-bold active:scale-95 transition-transform"
          >
            查看结算
          </button>
        </div>
      )}

      {/* Summary overlay */}
      {summary && (
        <div className="absolute inset-0 bg-[#0b0c10]/95 z-[100] flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 rounded-full bg-[#10b981] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
            <span className="text-white font-extrabold text-2xl">✓</span>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">{summary.summary}</h2>
          <p className="text-white/60 text-sm mb-6">得分：{summary.score}</p>

          {summary.expressions && summary.expressions.length > 0 && (
            <div className="w-full max-w-sm mb-4">
              <h4 className="text-white/80 text-xs font-bold mb-2">学到的表达</h4>
              {summary.expressions.slice(0, 5).map((e, i) => (
                <div key={i} className="text-white/60 text-[11px] py-1 border-b border-white/5">{e}</div>
              ))}
            </div>
          )}

          {summary.patterns && summary.patterns.length > 0 && (
            <div className="w-full max-w-sm mb-4">
              <h4 className="text-white/80 text-xs font-bold mb-2">学到的句型</h4>
              <div className="flex flex-wrap gap-1.5">
                {summary.patterns.map((p, i) => (
                  <span key={i} className="bg-[#8b5cf6]/20 text-[#c4b5fd] px-2 py-1 rounded-full text-[10px] font-bold">{p}</span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { clearCurrent(); navigate("/game"); }}
            className="mt-4 px-8 py-3 bg-[#8b5cf6] text-white rounded-full font-bold active:scale-95 transition-transform"
          >
            返回游戏大厅
          </button>
        </div>
      )}
    </div>
  );
}

function GameFeedItem({ item }: { item: FeedItem }) {
  switch (item.type) {
    case "narrator":
      return (
        <div className="px-2 py-2">
          <p className="text-white/50 text-[11px] italic leading-relaxed">{item.text}</p>
          {item.text_en && <p className="text-white/30 text-[10px] italic mt-0.5">{item.text_en}</p>}
        </div>
      );

    case "character":
      return (
        <div className="flex gap-2.5 items-start">
          <div className="w-8 h-8 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#c4b5fd]">
            {(item.speaker as string)?.charAt(0) || "?"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-white/80 text-[11px] font-bold">{item.speaker}</span>
              {item.emotion ? <span className="text-white/30 text-[9px]">{String(item.emotion)}</span> : null}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-3 py-2.5">
              <p className="text-white/90 text-[12px] leading-relaxed">{item.text}</p>
              {item.text_en && <p className="text-white/40 text-[10px] mt-1">{item.text_en}</p>}
            </div>
          </div>
        </div>
      );

    case "chapter_start":
      return (
        <div className="flex flex-col items-center py-4 gap-1">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/30 to-transparent" />
          <span className="text-[#c4b5fd] text-xs font-bold tracking-widest">
            {item.chapter as string}
          </span>
          {item.chapter_en ? <span className="text-white/30 text-[10px]">{String(item.chapter_en)}</span> : null}
          {item.goal ? <span className="text-white/40 text-[10px]">目标：{String(item.goal)}</span> : null}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/30 to-transparent" />
        </div>
      );

    case "chapter_end":
    case "story_end":
      return (
        <div className="flex flex-col items-center py-4 gap-2">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#10b981]/30 to-transparent" />
          <span className="text-[#34d399] text-xs font-bold">{item.text}</span>
          {item.text_en && <span className="text-white/30 text-[10px]">{item.text_en as string}</span>}
        </div>
      );

    case "choices":
      return null;

    case "case_briefing":
      return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="text-[#fbbf24] text-[10px] font-bold mb-2">案件简报</div>
          <p className="text-white/80 text-[12px] leading-relaxed">{item.text}</p>
          {item.text_en && <p className="text-white/40 text-[10px] mt-1">{item.text_en}</p>}
        </div>
      );

    case "suspects_intro":
      return (
        <div className="flex flex-col gap-1.5 px-1">
          <div className="text-[#fbbf24] text-[10px] font-bold">嫌疑人</div>
          {Array.isArray(item.suspects) && (item.suspects as Array<{ name: string; role: string }>).map((s, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/5">
              <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 flex items-center justify-center text-[9px] font-bold text-[#f87171]">
                {s.name.charAt(0)}
              </div>
              <span className="text-white/80 text-[11px] font-bold">{s.name}</span>
              <span className="text-white/40 text-[10px]">{s.role}</span>
            </div>
          ))}
        </div>
      );

    case "clue_discovered":
      return (
        <div className="bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
            <span className="text-[#fbbf24] text-[10px] font-bold">新线索发现</span>
            <span className="text-white/30 text-[9px] ml-auto">{item.total_discovered as number}/{item.total_clues as number}</span>
          </div>
          <p className="text-white/80 text-[11px] font-bold">{item.title as string}</p>
          <p className="text-white/50 text-[10px]">{item.desc as string}</p>
        </div>
      );

    case "suspect_answer":
      return (
        <div className="flex gap-2.5 items-start">
          <div className="w-8 h-8 rounded-full bg-[#ef4444]/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#f87171]">
            {((item.suspect_name as string) || "?").charAt(0)}
          </div>
          <div className="flex-1">
            <span className="text-white/80 text-[11px] font-bold">{item.suspect_name as string}</span>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-3 py-2.5 mt-1">
              <p className="text-white/90 text-[12px]">{item.text}</p>
              {item.text_native && <p className="text-white/40 text-[10px] mt-1">{item.text_native}</p>}
            </div>
          </div>
        </div>
      );

    case "user_question":
    case "user_deduction":
      return (
        <div className="flex justify-end">
          <div className="bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 rounded-2xl rounded-br-sm px-3 py-2.5 max-w-[80%]">
            <p className="text-white/90 text-[12px]">{item.text}</p>
          </div>
        </div>
      );

    case "verdict":
      return (
        <div className="flex flex-col items-center py-3 gap-2">
          <div className={`px-5 py-2.5 rounded-xl ${item.correct ? "bg-[#10b981]/20 border border-[#10b981]/40" : "bg-[#ef4444]/20 border border-[#ef4444]/40"}`}>
            <span className={`font-bold text-lg ${item.correct ? "text-[#34d399]" : "text-[#f87171]"}`}>
              {item.correct ? "推理正确！" : "推理有误"}
            </span>
          </div>
          {item.feedback ? <p className="text-white/50 text-[11px] text-center max-w-[85%]">{String(item.feedback)}</p> : null}
        </div>
      );

    case "truth_reveal":
      return (
        <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-2xl p-4">
          <div className="text-[#34d399] text-[10px] font-bold mb-2">真相揭晓</div>
          <p className="text-white/80 text-[12px] leading-relaxed">{item.text}</p>
          {item.text_en && <p className="text-white/40 text-[10px] mt-1">{item.text_en}</p>}
        </div>
      );

    default:
      return item.text ? (
        <div className="px-2 py-1">
          <p className="text-white/40 text-[10px]">{item.text}</p>
        </div>
      ) : null;
  }
}
