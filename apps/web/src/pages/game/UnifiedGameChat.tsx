import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { saveGameToAssets, addPatternsToCrush } from "../../lib/gameLearning";
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
  const [createError, setCreateError] = useState<string | null>(null);
  const [solveMode, setSolveMode] = useState(false);
  const [savedAssets, setSavedAssets] = useState(false);
  const [savingAssets, setSavingAssets] = useState(false);

  useEffect(() => {
    if (!id || !mode) return;
    
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(id);
    if (isUuid) {
      loadSession(id);
    } else {
      initGame(mode, id);
    }

    return () => clearCurrent();
  }, [id, mode]);

  const initGame = async (gameType: string, slug: string) => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sess = await createSession(gameType, slug, { case_id: slug, story_id: slug });

      if (!sess.turns || sess.turns.length === 0) {
        try {
          await sendTurn(sess.id, "start");
        } catch {
          /* first turn may fail if LLM unavailable */
        }
      }
      navigate(`/game/play/${gameType}/${sess.id}`, { replace: true });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "创建游戏失败，请检查 LLM 配置。");
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
    // Roleplay choices pass their label text — send it as the player's action.
    await sendTurn(currentSession.id, "message", action);
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
  const characters = (Array.isArray(view.characters) ? view.characters : []) as any[];

  /* ---- Create error ---- */
  if (createError) {
    return (
      <div className="premium w-full h-full bg-[#f8f9fc] flex flex-col items-center justify-center px-6 text-center gap-4 font-sans">
        <p className="text-red-600 text-sm leading-relaxed max-w-sm">{createError}</p>
        <button
          type="button"
          onClick={() => navigate("/game")}
          className="px-6 py-2.5 rounded-xl bg-[#8b5cf6] text-white text-sm font-bold"
        >
          返回游戏主页
        </button>
      </div>
    );
  }

  /* ---- Loading state ---- */
  if (creating) {
    return (
      <div className="premium w-full h-full bg-[#f8f9fc] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#8b5cf6]" />
          <span className="text-[#6b7280] text-sm">正在创建游戏...</span>
        </div>
      </div>
    );
  }

  /* ---- Main layout ---- */
  const coverUrl = (view.cover_url as string) || (currentSession as any)?.config?.cover_url || "";

  return (
    <div className="premium w-full h-full bg-[#f8f9fc] flex flex-col relative overflow-hidden font-sans text-[#111827]">
      {/* Dynamic Background Image */}
      {coverUrl && (
        <>
          <div className="absolute inset-0 z-0">
            <img src={coverUrl} alt="Background" className="w-full h-full object-cover opacity-[0.15]" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#fdf2f8]/80 via-[#fdf2f8]/60 to-[#fdfdfd] z-0" />
        </>
      )}

      <div className="relative z-10 shrink-0">
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
      </div>

      <UnifiedMainFeed
        mode={mode}
        feedItems={feedItems}
        turnLoading={turnLoading}
        cluesFound={cluesFound}
        totalClues={totalClues}
        characters={characters}
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

      {/* Game ended → go to the rich, design-matched summary screen */}
      {currentSession?.status === "ended" && !summary && (
        <div className="w-full bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-4 z-50 flex justify-center">
          <button
            onClick={() => {
              if (!currentSession) return;
              const sid = currentSession.id;
              if (mode === "turtle_soup") navigate(`/game/turtle-soup-summary/${sid}`);
              else if (mode === "detective") navigate(`/game/detective/summary/${sid}`);
              else loadSummary(sid);
            }}
            className="px-6 py-3 bg-[#8b5cf6] text-white rounded-full font-bold active:scale-95 transition-transform shadow-md"
          >
            查看结算
          </button>
        </div>
      )}

      {/* Summary overlay — fallback for game types without a dedicated screen */}
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

          <div className="flex gap-3 mt-4">
            <button
              onClick={async () => {
                if (savedAssets || savingAssets) return;
                setSavingAssets(true);
                await addPatternsToCrush(summary.patterns || []);
                const ok = await saveGameToAssets(
                  currentSession?.title || "游戏学习收获",
                  [...(summary.expressions || []), ...(summary.patterns || [])],
                  currentSession?.target_language || "en",
                );
                setSavedAssets(ok);
                setSavingAssets(false);
              }}
              disabled={savingAssets}
              className="px-6 py-3 bg-white text-[#8b5cf6] border border-[#8b5cf6] rounded-full font-bold active:scale-95 transition-transform shadow-sm disabled:opacity-60 flex items-center gap-2"
            >
              {savingAssets ? <Loader2 size={16} className="animate-spin" /> : null}
              {savedAssets ? "已保存✓" : savingAssets ? "保存中" : "保存到 Assets"}
            </button>
            <button
              onClick={() => { clearCurrent(); navigate("/game"); }}
              className="px-6 py-3 bg-[#8b5cf6] text-white rounded-full font-bold active:scale-95 transition-transform shadow-md"
            >
              返回游戏大厅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
