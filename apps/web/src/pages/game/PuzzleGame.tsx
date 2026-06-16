import { useState, useEffect, useRef } from "react";
import "../../game.css";
import GameShell from "../../components/game/GameShell";
import GameStatusBar from "../../components/game/GameStatusBar";
import SpeechFeed from "../../components/game/SpeechFeed";
import AIHostCard from "../../components/game/AIHostCard";
import UserSpeechCard from "../../components/game/UserSpeechCard";
import GameSummary from "../../components/game/GameSummary";
import { useNavigate, useParams } from "react-router-dom";
import { Brain, Send, Lightbulb, Loader2 } from "lucide-react";
import { useGameStore, FeedItem } from "../../stores/gameStore";

export default function PuzzleGame() {
  const navigate = useNavigate();
  const { id: templateSlug } = useParams<{ id: string }>();
  const {
    currentSession, feedItems, currentHud, turnLoading, summary,
    createSession, sendTurn, loadSummary, clearCurrent,
  } = useGameStore();

  const [input, setInput] = useState("");
  const [solveMode, setSolveMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const phase = currentSession?.phase || "lobby";
  const view = (currentSession?.view || {}) as Record<string, unknown>;

  useEffect(() => { return () => clearCurrent(); }, []);
  useEffect(() => { feedEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [feedItems]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createSession("turtle_soup", templateSlug || "passenger", { case_id: templateSlug || "passenger" });
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async () => {
    if (!currentSession) return;
    await sendTurn(currentSession.id, "start");
  };

  const handleQuestion = async () => {
    if (!currentSession || !input.trim()) return;
    const q = input.trim();
    setInput("");
    await sendTurn(currentSession.id, solveMode ? "solve" : "question", q);
  };

  const handleChip = (chip: string) => {
    setInput(chip);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuestion();
    }
  };

  const questionsAsked = (view.questions_asked as number) || 0;
  const maxQuestions = (view.max_questions as number) || 15;
  const foundClues = ((view.found_clues as unknown[]) || []).length;
  const totalClues = 6;
  const surface = (view.surface as string) || "";
  const surfaceEn = (view.surface_en as string) || "";

  return (
    <GameShell>
      {["story_reveal", "questioning", "solve"].includes(phase) && (
        <GameStatusBar
          roundTitle={phase === "story_reveal" ? "听题阶段" : phase === "solve" ? "真相大白" : `第 ${questionsAsked} 轮提问`}
          aliveCount={foundClues}
          totalCount={totalClues}
          userRole="侦探"
          onBack={() => navigate(-1)}
        />
      )}

      <div className="flex-1 w-full h-full relative overflow-y-auto no-scrollbar flex flex-col">

        {phase === "lobby" && (
          <div className="flex-1 flex flex-col items-center justify-center relative p-5">
            <Brain size={80} className="text-[#3b82f6] mb-6 opacity-80" />
            <h2 className="text-2xl font-bold text-white tracking-widest mb-2">
              {currentSession?.title || "海龟汤"}
            </h2>
            <p className="text-[#a5b4fc] text-sm mb-10">海龟汤 · Situation Puzzle · Solo</p>
            {!currentSession ? (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full max-w-[200px] h-[56px] bg-[#3b82f6] text-white rounded-full font-bold shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 size={18} className="animate-spin" /> : null}
                {creating ? "创建中..." : "准备好发车"}
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={turnLoading}
                className="w-full max-w-[200px] h-[56px] bg-[#3b82f6] text-white rounded-full font-bold shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 transition-transform disabled:opacity-50"
              >
                {turnLoading ? "加载中..." : "开始游戏"}
              </button>
            )}
          </div>
        )}

        {phase === "story_reveal" && (
          <div className="flex-1 flex flex-col items-center justify-center p-5 relative">
            <div className="absolute inset-0 bg-black/60 z-0"></div>
            <div className="z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl w-[90%] flex flex-col items-center text-center animate-[glow-burst_1s_ease-out]">
              <div className="w-12 h-12 rounded-full bg-[#3b82f6] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <Brain size={24} className="text-white" />
              </div>
              <h3 className="text-[#bfdbfe] text-xs font-bold mb-2 tracking-widest">【汤面 (Surface Story)】</h3>
              <p className="text-white text-lg font-bold leading-relaxed mb-2">{surface}</p>
              {surfaceEn && <p className="text-white/60 text-sm leading-relaxed mb-6">{surfaceEn}</p>}
              <button
                onClick={async () => {
                  if (currentSession) await sendTurn(currentSession.id, "question", "");
                }}
                disabled={turnLoading}
                className="px-8 py-3 bg-white text-[#3b82f6] rounded-full font-bold active:scale-95 transition-transform"
              >
                开始提问
              </button>
            </div>
          </div>
        )}

        {(phase === "questioning" || (phase === "solve" && !view.solved)) && (
          <div className="flex flex-col h-full w-full">
            <SpeechFeed>
              {feedItems.map((item: FeedItem, idx: number) => (
                <FeedItemRenderer key={idx} item={item} />
              ))}
              {turnLoading && (
                <div className="w-full flex justify-center my-3">
                  <div className="flex items-center gap-2 text-white/50 text-xs">
                    <Loader2 size={14} className="animate-spin" /> AI 思考中...
                  </div>
                </div>
              )}
              <div ref={feedEndRef} />
            </SpeechFeed>

            <div className="w-full bg-[#202124]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,20px)+20px)] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <div className="text-xs font-bold text-[#e8eaed]">
                    {solveMode ? "提交你的推理" : "提出一个是/否问题"}
                  </div>
                  <button
                    onClick={() => setSolveMode(!solveMode)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                      solveMode
                        ? "bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/40"
                        : "bg-white/5 text-white/50 border border-white/10"
                    }`}
                  >
                    <Lightbulb size={10} />
                    {solveMode ? "推理模式" : "切换到推理"}
                  </button>
                </div>

                {!solveMode && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {["Did he...?", "Was he...?", "Had he... before?", "Is it related to...?"].map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => handleChip(chip)}
                        className="shrink-0 px-3 py-1.5 bg-[#3b82f6]/20 text-[#93c5fd] border border-[#3b82f6]/40 rounded-full text-[11px] font-bold shadow-sm active:scale-95 transition-transform"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-10 bg-white/10 border border-white/20 rounded-full flex items-center px-4 shadow-inner focus-within:border-[#3b82f6] focus-within:ring-1 focus-within:ring-[#3b82f6] transition-all">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={solveMode ? "输入你的推理..." : "输入英文或中文..."}
                      className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-[#9ca3af]"
                    />
                  </div>
                  <button
                    onClick={handleQuestion}
                    disabled={turnLoading || !input.trim()}
                    className="w-10 h-10 rounded-full bg-[#3b82f6] text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.5)] active:scale-95 transition-transform disabled:opacity-40"
                  >
                    <Send size={16} className="ml-0.5" />
                  </button>
                </div>

                <div className="flex justify-between items-center px-1 mt-1">
                  <span className="text-[10px] text-white/40">
                    提问 {questionsAsked}/{maxQuestions}
                  </span>
                  <span className="text-[10px] text-[#fcd34d]">
                    线索 {foundClues}/{totalClues}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === "solve" && (view.solved as boolean) && (
          <div className="flex-1 flex flex-col items-center justify-center p-5 relative">
            <div className="absolute inset-0 bg-black/60 z-0"></div>
            <div className="z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl w-[90%] flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                <span className="text-white font-extrabold text-xl">✓</span>
              </div>
              <h3 className="text-[#6ee7b7] text-xs font-bold mb-2 tracking-widest">【汤底 (The Truth)】</h3>
              {feedItems.filter((f) => f.type === "truth_reveal").map((f, i) => (
                <div key={i}>
                  <p className="text-white text-sm leading-relaxed mb-2">{f.text}</p>
                  {f.text_en && <p className="text-white/60 text-xs leading-relaxed mb-4">{f.text_en}</p>}
                </div>
              ))}
              <button
                onClick={async () => {
                  if (currentSession) await loadSummary(currentSession.id);
                }}
                className="px-8 py-3 bg-[#10b981] text-white rounded-full font-bold active:scale-95 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                查看结算
              </button>
            </div>
          </div>
        )}

        {summary && (
          <GameSummary
            victory={summary.solved || false}
            score={summary.score}
            highlightSpeech={summary.expressions?.[0] || ""}
            learnedPatterns={summary.patterns || []}
            onPlayAgain={() => {
              clearCurrent();
              navigate("/game");
            }}
          />
        )}
      </div>
    </GameShell>
  );
}

function FeedItemRenderer({ item }: { item: FeedItem }) {
  switch (item.type) {
    case "narrator":
      return <AIHostCard text={item.text || ""} />;

    case "story":
      return (
        <div className="w-full px-4 py-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-[#bfdbfe] text-[10px] font-bold mb-2 tracking-widest">【汤面】</div>
            <p className="text-white text-sm leading-relaxed">{item.text}</p>
            {item.text_en && <p className="text-white/50 text-xs mt-2">{item.text_en}</p>}
          </div>
        </div>
      );

    case "user_question":
      return (
        <UserSpeechCard
          englishText={item.text || ""}
          chineseGloss=""
          onShowLearningPoints={() => {}}
        />
      );

    case "judge_answer": {
      const answer = (item.answer as string) || "IRRELEVANT";
      const colorMap: Record<string, string> = {
        YES: "bg-[#10b981]/20 border-[#10b981]/40 text-[#34d399]",
        NO: "bg-[#ef4444]/20 border-[#ef4444]/40 text-[#f87171]",
        IRRELEVANT: "bg-[#6b7280]/20 border-[#6b7280]/40 text-[#9ca3af]",
      };
      return (
        <div className="w-full flex flex-col items-center my-3 gap-2">
          <div className={`px-6 py-3 rounded-2xl text-center border shadow-md ${colorMap[answer] || colorMap.IRRELEVANT}`}>
            <span className="font-extrabold text-2xl tracking-widest uppercase">{answer}</span>
          </div>
          {(item.comment || item.comment_en) ? (
            <p className="text-white/40 text-[10px] text-center max-w-[80%]">
              {String(item.comment || "")}{item.comment_en ? ` — ${String(item.comment_en)}` : ""}
            </p>
          ) : null}
        </div>
      );
    }

    case "clue_found":
      return (
        <div className="w-full flex justify-center my-2 opacity-80">
          <div className="px-4 py-2 bg-[#fcd34d]/10 border border-[#fcd34d]/30 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#fcd34d]"></span>
            <span className="text-[#fcd34d] text-xs font-bold">
              新线索：{item.text}
            </span>
            <span className="text-white/40 text-[10px]">
              ({item.total_found as number}/{item.total_clues as number})
            </span>
          </div>
        </div>
      );

    case "user_solve":
      return (
        <div className="w-full flex justify-end px-4 my-2">
          <div className="bg-[#3b82f6]/20 border border-[#3b82f6]/40 rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%]">
            <div className="text-[#93c5fd] text-[10px] font-bold mb-1">我的推理</div>
            <p className="text-white text-sm">{item.text}</p>
          </div>
        </div>
      );

    case "verdict": {
      const v = (item.verdict as string) || "WRONG";
      const isCorrect = v === "CORRECT" || v === "PARTIAL";
      return (
        <div className="w-full flex flex-col items-center my-4 gap-2">
          <div className={`px-6 py-3 rounded-2xl text-center border shadow-md ${
            isCorrect ? "bg-[#10b981]/20 border-[#10b981]/40" : "bg-[#ef4444]/20 border-[#ef4444]/40"
          }`}>
            <span className={`font-extrabold text-xl ${isCorrect ? "text-[#34d399]" : "text-[#f87171]"}`}>
              {v === "CORRECT" ? "正确！" : v === "PARTIAL" ? "部分正确" : "不正确"}
            </span>
          </div>
          {item.explanation ? (
            <p className="text-white/60 text-xs text-center max-w-[85%]">{String(item.explanation)}</p>
          ) : null}
        </div>
      );
    }

    case "truth_reveal":
      return null;

    default:
      return item.text ? <AIHostCard text={item.text} /> : null;
  }
}
