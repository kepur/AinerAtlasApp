import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import UnifiedHeader from "../../components/game/unified/UnifiedHeader";
import UnifiedTurnSelector from "../../components/game/unified/UnifiedTurnSelector";
import UnifiedLearningHUD from "../../components/game/unified/UnifiedLearningHUD";
import UnifiedMainFeed from "../../components/game/unified/UnifiedMainFeed";
import AdaptiveActionPanel from "../../components/game/unified/AdaptiveActionPanel";

export default function UnifiedGameChat() {
  const { mode, id } = useParams<{ mode: string; id: string }>();
  const navigate = useNavigate();
  const {
    currentSession, feedItems, currentHud, turnLoading,
    createSession, loadSession, sendTurn, loadSummary, summary, clearCurrent,
  } = useGameStore();

  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [solveMode, setSolveMode] = useState(false);
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
    if (solveMode) {
      await sendTurn(currentSession.id, "solve", text);
      setSolveMode(false);
    } else {
      await sendTurn(currentSession.id, "message", text);
    }
  };

  const handleChoice = async (action: string) => {
    if (!currentSession || turnLoading) return;
    if (action === "deduce" || action === "solve") {
      setSolveMode(true);
      return;
    }
    await sendTurn(currentSession.id, action, input.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Derived state
  const phase = currentSession?.phase || "lobby";
  const view = (currentSession?.view || {}) as Record<string, unknown>;
  const cluesFound = Array.isArray(view.found_clues) ? (view.found_clues as unknown[]).length : 0;
  const lastClueItem = feedItems.filter((f) => f.type === "clue_found").pop();
  const totalClues = (lastClueItem?.total_clues as number) || 6;
  const questionsAsked = (view.questions_asked as number) || 0;
  const lastChoices = feedItems.filter((f) => f.type === "choices").pop();
  const choices = (lastChoices?.choices as Array<{ label: string; action: string }>) || [];
  const isActive = currentSession?.status === "active";
  const showInput = phase !== "summary" && phase !== "lobby" && isActive;

  /* ---- Loading state ---- */
  if (creating) {
    return (
      <div className="w-full h-screen bg-[#f8f9fc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#8b5cf6]" />
          <span className="text-[#6b7280] text-sm">正在创建游戏...</span>
        </div>
      </div>
    );
  }

  /* ---- Main layout: original 5-component composition ---- */
  return (
    <div className="w-full h-screen bg-[#f8f9fc] flex flex-col relative overflow-hidden">
      <UnifiedHeader
        mode={mode}
        title={currentSession?.title}
        phase={phase}
        turnCount={currentSession?.turn_count || 0}
      />

      <UnifiedTurnSelector
        mode={mode}
        feedItems={feedItems}
        phase={phase}
      />

      <UnifiedMainFeed
        mode={mode}
        feedItems={feedItems}
        turnLoading={turnLoading}
        cluesFound={cluesFound}
        totalClues={totalClues}
        hudSlot={
          <UnifiedLearningHUD
            mode={mode}
            hud={currentHud}
            sessionTitle={currentSession?.title}
            questionsAsked={questionsAsked}
            cluesFound={cluesFound}
            totalClues={totalClues}
          />
        }
      />

      {showInput && (
        <AdaptiveActionPanel
          mode={mode}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onChoice={handleChoice}
          onSolve={mode === "turtle_soup" ? () => setSolveMode(!solveMode) : undefined}
          onKeyDown={handleKeyDown}
          turnLoading={turnLoading}
          choices={choices}
          disabled={!isActive}
          placeholder={solveMode ? "输入你的推理答案..." : undefined}
        />
      )}

      {/* Game ended → show summary button */}
      {currentSession?.status === "ended" && !summary && (
        <div className="w-full bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-4 z-50 flex justify-center">
          <button
            onClick={() => currentSession && loadSummary(currentSession.id)}
            className="px-6 py-3 bg-[#8b5cf6] text-white rounded-full font-bold active:scale-95 transition-transform shadow-md"
          >
            查看结算
          </button>
        </div>
      )}

      {/* Summary overlay — white theme */}
      {summary && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 rounded-full bg-[#10b981] flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white font-extrabold text-2xl">✓</span>
          </div>
          <h2 className="text-[#111827] text-xl font-bold mb-2">{summary.summary}</h2>
          <p className="text-[#6b7280] text-sm mb-6">得分：{summary.score}</p>

          {summary.expressions && summary.expressions.length > 0 && (
            <div className="w-full max-w-sm mb-4">
              <h4 className="text-[#111827] text-xs font-bold mb-2">学到的表达</h4>
              {summary.expressions.slice(0, 5).map((e, i) => (
                <div key={i} className="text-[#6b7280] text-[11px] py-1 border-b border-gray-100">{e}</div>
              ))}
            </div>
          )}

          {summary.patterns && summary.patterns.length > 0 && (
            <div className="w-full max-w-sm mb-4">
              <h4 className="text-[#111827] text-xs font-bold mb-2">学到的句型</h4>
              <div className="flex flex-wrap gap-1.5">
                {summary.patterns.map((p, i) => (
                  <span key={i} className="bg-[#f5f3ff] text-[#8b5cf6] px-2 py-1 rounded-full text-[10px] font-bold border border-[#ede9fe]">{p}</span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { clearCurrent(); navigate("/game"); }}
            className="mt-4 px-8 py-3 bg-[#8b5cf6] text-white rounded-full font-bold active:scale-95 transition-transform shadow-md"
          >
            返回游戏大厅
          </button>
        </div>
      )}
    </div>
  );
}
