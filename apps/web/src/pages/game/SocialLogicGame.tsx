import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import "../../MessageBubble.css";
import "../../game.css";
import GameShell from "../../components/game/GameShell";
import GameStatusBar from "../../components/game/GameStatusBar";
import LobbyReady from "../../components/game/LobbyReady";
import RoleCard from "../../components/game/RoleCard";
import PlayerStrip from "../../components/game/PlayerStrip";
import SpeechFeed from "../../components/game/SpeechFeed";
import PlayerSpeechCard from "../../components/game/PlayerSpeechCard";
import UserSpeechCard from "../../components/game/UserSpeechCard";
import AIHostCard from "../../components/game/AIHostCard";
import ActionPanel from "../../components/game/ActionPanel";
import VotePanel from "../../components/game/VotePanel";
import VoteResultCard from "../../components/game/VoteResultCard";
import ContradictionHintCard from "../../components/game/ContradictionHintCard";
import GameSummary from "../../components/game/GameSummary";
import { LearningHUD, TokenExplainSheet, TurnSelector, useTts } from "../../components/learning";
import { apiRequest } from "../../api";
import { addPatternsToCrush, saveGameToAssets } from "../../lib/gameLearning";
import { useAudioCacheStore } from "../../stores/audioCacheStore";
import { normalizeGameHud, useSocialLogicStore } from "../../stores/socialLogicStore";
import type { HudData } from "../../stores/chatStore";

type UIPhase = "lobby" | "reveal" | "night" | "day" | "vote" | "vote_result" | "summary";

type VoteResultView = {
  eliminatedName: string;
  revealedRole?: string;
  votes: { voter: string; target: string }[];
  nextPhase: string;
};

const ROLE_CN: Record<string, {
  name: string; nameZh: string; nameEn: string;
  camp: string; campZh: string; campEn: string;
  ability: string; abilityZh: string; abilityEn: string;
  goal: string; goalZh: string; goalEn: string;
  emoji: string;
}> = {
  werewolf: {
    name: "狼人", nameZh: "狼人", nameEn: "Werewolf",
    camp: "狼人阵营", campZh: "狼人阵营", campEn: "Werewolf Camp",
    ability: "夜晚与同伴猎杀一名玩家。", abilityZh: "夜晚与同伴猎杀一名玩家。", abilityEn: "Hunt a player with companions during the night.",
    goal: "消灭所有好人。", goalZh: "消灭所有好人。", goalEn: "Eliminate all good players.",
    emoji: "🐺"
  },
  villager: {
    name: "村民", nameZh: "村民", nameEn: "Villager",
    camp: "好人阵营", campZh: "好人阵营", campEn: "Good Camp",
    ability: "无特殊能力，靠推理找出狼人。", abilityZh: "无特殊能力，靠推理找出狼人。", abilityEn: "No special ability. Find the werewolves by reasoning.",
    goal: "白天放逐所有狼人。", goalZh: "白天放逐所有狼人。", goalEn: "Banish all werewolves during the day.",
    emoji: "👨‍🌾"
  },
  seer: {
    name: "预言家", nameZh: "预言家", nameEn: "Seer",
    camp: "好人阵营", campZh: "好人阵营", campEn: "Good Camp",
    ability: "每晚查验一名玩家的身份。", abilityZh: "每晚查验一名玩家的身份。", abilityEn: "Inspect one player's identity each night.",
    goal: "带领好人放逐狼人。", goalZh: "带领好人放逐狼人。", goalEn: "Lead the good players to banish werewolves.",
    emoji: "🔮"
  },
  guard: {
    name: "守卫", nameZh: "守卫", nameEn: "Guard",
    camp: "好人阵营", campZh: "好人阵营", campEn: "Good Camp",
    ability: "每晚守护一名玩家免于被杀。", abilityZh: "每晚守护一名玩家免于被杀。", abilityEn: "Protect one player from being killed each night.",
    goal: "保护好人放逐狼人。", goalZh: "保护好人放逐狼人。", goalEn: "Protect good players and banish werewolves.",
    emoji: "🛡️"
  },
};

export default function SocialLogicGame() {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [game, setGame] = useState<any>(null);
  const [uiPhase, setUiPhase] = useState<UIPhase>("lobby");
  const [busy, setBusy] = useState(false);
  const [actionMode, setActionMode] = useState<"default" | "question">("default");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();
  const [summary, setSummary] = useState<any>(null);
  const [voteResult, setVoteResult] = useState<VoteResultView | null>(null);
  const [tokenSheet, setTokenSheet] = useState<{ token: string; context: string } | null>(null);
  const [crushBusy, setCrushBusy] = useState(false);
  const [assetsBusy, setAssetsBusy] = useState(false);
  const [crushDone, setCrushDone] = useState(false);
  const [assetsDone, setAssetsDone] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const creatingRef = useRef(false);
  const nightRunRef = useRef(false);
  const [nightSec, setNightSec] = useState(0);

  const { speak: ttsSpeak } = useTts();
  const {
    turns: learningTurns,
    activeTurnId,
    pinnedTurnId,
    pushTurn,
    setActiveTurn,
    pinTurn,
    unpinTurn,
    reset: resetLearning,
    activeHud,
  } = useSocialLogicStore();

  // Resume an existing game from the URL when possible; only create a fresh one
  // when there's no resumable game (entry via /new, a template id, or a game the
  // server no longer holds). After creating, rewrite the URL to the real game id
  // so refresh / back resumes instead of starting over.
  useEffect(() => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    (async () => {
      if (routeId && routeId !== "new") {
        try {
          const existing = await apiRequest<any>(`/api/games/social-logic/${routeId}`);
          setGame(existing);
          restorePhase(existing);
          return;
        } catch { /* not a live game id → create a new one below */ }
      }
      try {
        const data = await apiRequest<any>("/api/games/social-logic", {
          method: "POST", body: JSON.stringify({ difficulty: "easy" }),
        });
        setGame(data);
        if (data?.game_id) navigate(`/game/social-logic/${data.game_id}`, { replace: true });
      } catch (e) { console.error(e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  // Map a resumed backend phase to the right UI screen.
  function restorePhase(data: any) {
    switch (data?.phase) {
      case "role_reveal": setUiPhase("reveal"); break;
      case "night": setUiPhase("night"); break;
      case "day_discussion": {
        const firstAI = (data?.players || []).find((p: any) => !p.is_user && p.alive);
        setSelectedPlayerId(firstAI?.id);
        setActionMode(firstAI ? "question" : "default");
        setUiPhase("day");
        break;
      }
      case "result":
      case "ended":
        apiRequest<any>(`/api/games/social-logic/${data.game_id}/summary`)
          .then(setSummary).catch(() => {});
        setUiPhase("summary");
        break;
      default: setUiPhase("lobby");
    }
  }

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [game?.feed?.length, busy]);

  const gid = game?.game_id;
  const players = game?.players || [];
  const userRole = game?.user_role || "villager";
  const aliveAI = players.filter((p: any) => !p.is_user && p.alive);

  const call = async (path: string, body?: any) => {
    setBusy(true);
    try {
      const data = await apiRequest<any>(`/api/games/social-logic${path}`, {
        method: "POST", body: body ? JSON.stringify(body) : undefined,
      });
      return data;
    } finally {
      setBusy(false);
    }
  };

  const handleDeal = async () => {
    if (!gid) return;
    const data = await call(`/${gid}/deal`);
    setGame(data);
    setUiPhase("reveal");
  };

  const handleStart = async () => {
    if (!gid) return;
    setUiPhase("night");
  };

  // Enter day discussion with the input immediately usable: pre-select the
  // first living AI so the user can speak right away (no "locked input" dead end).
  const enterDay = (data: any) => {
    const firstAI = (data?.players || []).find((p: any) => !p.is_user && p.alive);
    setSelectedPlayerId(firstAI?.id);
    setActionMode(firstAI ? "question" : "default");
    setUiPhase("day");
  };

  const handleNightDone = async () => {
    if (!gid) return;
    const data = await call(`/${gid}/start`);
    setGame(data);
    enterDay(data);
  };

  // Night phase: kick off the (slow) AI resolution immediately and run a live
  // countdown so the screen never looks frozen while AI players "act".
  useEffect(() => {
    if (uiPhase !== "night") { nightRunRef.current = false; setNightSec(0); return; }
    if (nightRunRef.current) return;
    nightRunRef.current = true;
    setNightSec(0);
    const timer = setInterval(() => setNightSec((s) => s + 1), 1000);
    handleNightDone().finally(() => clearInterval(timer));
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiPhase, gid]);

  const handleQuestion = async (text: string) => {
    if (!gid || !text.trim()) return;
    const targetId = selectedPlayerId
      || (players.find((p: any) => !p.is_user && p.alive)?.id);
    if (!targetId) return;
    const target = players.find((p: any) => p.id === targetId);
    const data = await call(`/${gid}/question`, { target_player_id: targetId, content: text.trim() });
    if (data.state) setGame(data.state);
    if (data.hud) {
      const hud = normalizeGameHud(data.hud);
      pushTurn(`问 ${target?.name || "?"}`, hud);
    }
    setActionMode("question");
  };

  function parseVoteResult(state: any): VoteResultView | null {
    const vr = [...(state?.feed || [])].reverse().find((f: any) => f.type === "vote_result");
    if (!vr) return null;
    const m = String(vr.text || "").match(/^(.+?) 被投票出局/);
    const roleM = String(vr.text || "").match(/身份揭示：(.+?)。/);
    return {
      eliminatedName: m?.[1] || "Unknown",
      revealedRole: roleM?.[1],
      votes: (vr.votes || []).map((v: any) => ({ voter: v.voter, target: v.target })),
      nextPhase: state.phase,
    };
  }

  const speak = async (text: string, speakerName?: string) => {
    if (!text) return;
    const sp = players.find((p: any) => p.name === speakerName);
    const voice = sp?.voice || "neutral_narrator";
    try {
      const url = await useAudioCacheStore.getState().getOrFetch(text, "en", voice);
      await new Audio(url).play();
    } catch {
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    }
  };

  const handleVote = async (targetId: string, reason: string) => {
    if (!gid) return;
    const data = await call(`/${gid}/vote`, { target_player_id: targetId, reason });
    setGame(data);
    const vr = parseVoteResult(data);
    if (vr) {
      setVoteResult(vr);
      setUiPhase("vote_result");
      return;
    }
    if (data.phase === "ended") {
      const s = await apiRequest<any>(`/api/games/social-logic/${gid}/summary`);
      setSummary(s);
      setUiPhase("summary");
    } else {
      enterDay(data);
    }
  };

  const handleVoteResultNext = async () => {
    if (!game) return;
    if (game.phase === "ended") {
      const s = await apiRequest<any>(`/api/games/social-logic/${gid}/summary`);
      setSummary(s);
      setVoteResult(null);
      setUiPhase("summary");
    } else {
      setVoteResult(null);
      enterDay(game);
    }
  };

  const handleAddToCrush = async () => {
    if (!summary?.patterns?.length) return;
    setCrushBusy(true);
    try {
      const n = await addPatternsToCrush(summary.patterns as string[]);
      if (n > 0) setCrushDone(true);
    } finally {
      setCrushBusy(false);
    }
  };

  const handleSaveToAssets = async () => {
    if (!summary) return;
    setAssetsBusy(true);
    try {
      const lines = [
        ...(summary.expressions || []),
        ...(summary.patterns || []),
      ] as string[];
      const ok = await saveGameToAssets("狼人杀 Lite 学习收获", lines);
      if (ok) setAssetsDone(true);
    } finally {
      setAssetsBusy(false);
    }
  };

  const hudForDisplay: HudData = activeHud();

  if (!game) {
    return (
      <div className="premium w-full h-full"><GameShell>
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#a78bfa]" />
          <span className="text-white/70 text-sm">正在创建对局...</span>
        </div>
      </GameShell></div>
    );
  }

  const roleInfo = ROLE_CN[userRole] || ROLE_CN.villager;

  return (
    <div className="premium w-full h-full">
      <GameShell>
        <header className="w-full px-4 h-14 flex items-center justify-between shrink-0 bg-[#1e1b4b]/40 backdrop-blur-md border-b border-white/5 relative z-[210]">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white bg-white/10 rounded-full border border-white/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </button>
          <div className="font-bold text-white text-[14px] tracking-wide">狼人杀 Lite：单机沉浸</div>
          <div className="w-8 h-8" />
        </header>

        {uiPhase === "day" && (
          <GameStatusBar
            roundTitle={`第 ${game.round || 1} 轮白天`}
            aliveCount={game.alive_count}
            totalCount={game.total_count}
            userRole={roleInfo.name}
            onBack={() => navigate(-1)}
          />
        )}

        <div className="flex-1 w-full h-full relative overflow-y-auto no-scrollbar">
          {/* Lobby */}
          {uiPhase === "lobby" && (
            <LobbyReady
              players={players.map((p: any) => ({
                id: p.id, name: p.name, avatarChar: (p.name || "?").charAt(p.name.length - 1),
                isHost: p.is_user, isHuman: p.is_user, isAlive: p.alive, isSpeaking: false,
                suspicionLevel: p.suspicion,
              }))}
              onStartDealing={handleDeal}
            />
          )}

          {/* Role reveal */}
          {uiPhase === "reveal" && (
            <div className="w-full h-full flex flex-col items-center justify-center relative px-4 overflow-hidden">
              {/* Spooky semi-transparent background image */}
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center opacity-30 mix-blend-color-dodge"
                style={{ 
                  backgroundImage: "url('https://images.unsplash.com/photo-1519074002996-a69e7ac46a42?auto=format&fit=crop&q=80&w=800')",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a1f]/80 via-[#0b0a1f]/95 to-[#0b0a1f] z-0" />
              
              <div className="z-10 animate-[glow-burst_1s_ease-out]">
                <RoleCard 
                  isFaceUp 
                  isUser 
                  roleEn={roleInfo.nameEn}
                  roleZh={roleInfo.nameZh}
                  campEn={roleInfo.campEn}
                  campZh={roleInfo.campZh}
                  abilityEn={roleInfo.abilityEn}
                  abilityZh={roleInfo.abilityZh}
                  goalEn={roleInfo.goalEn}
                  goalZh={roleInfo.goalZh}
                  emoji={roleInfo.emoji}
                  onClick={handleStart} 
                />
              </div>
              
              <div className="z-10 mt-8 flex flex-col items-center gap-1.5 cursor-pointer active:opacity-80 transition-opacity" onClick={handleStart}>
                <span className="text-[#a78bfa] font-extrabold text-sm tracking-widest uppercase animate-pulse">Click card to enter night</span>
                <span className="text-white/40 text-[10px] font-semibold tracking-wider">点击卡牌进入夜晚</span>
              </div>
            </div>
          )}

          {/* Night transition — live countdown so it never looks frozen */}
          {uiPhase === "night" && (
            <div className="w-full h-full flex flex-col items-center justify-center relative px-6 text-center">
              <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a1f] via-[#13112a] to-[#0b0a1f]" />
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="text-6xl animate-pulse">🌙</div>
                <h2 className="text-2xl font-extrabold text-white tracking-widest">天黑请闭眼</h2>
                <p className="text-white/60 text-sm">狼人正在行动，AI 玩家正在准备发言…</p>
                <div className="mt-2 w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#7c5cff] to-[#a78bfa] rounded-full transition-all duration-1000" style={{ width: `${Math.min(95, nightSec * 12)}%` }} />
                </div>
                <p className="text-white/40 text-xs">{nightSec < 8 ? `天亮倒计时 ${Math.max(0, 8 - nightSec)}s…` : "AI 思考中，马上就好…"}</p>
              </div>
            </div>
          )}

          {/* Day discussion */}
          {uiPhase === "day" && (
            <div className="flex flex-col h-full">
              <TurnSelector
                turns={learningTurns.map((t) => ({
                  turn_id: t.turn_id,
                  label: t.label,
                  focusCount: Array.isArray(t.hud?.patterns_v2) ? t.hud.patterns_v2.length : 0,
                  pinned: !!t.pinned,
                  user_message_id: "",
                  assistant_message_id: "",
                  user_text: "",
                  ai_reply: "",
                  hud: t.hud,
                  status: "ready" as const,
                }))}
                activeTurnId={activeTurnId}
                pinnedTurnId={pinnedTurnId}
                onSelect={setActiveTurn}
                onPin={pinTurn}
                onUnpin={unpinTurn}
              />

              {hudForDisplay?.main_expression && (
                <LearningHUD
                  hud={hudForDisplay}
                  speak={ttsSpeak}
                  onTokenClick={(token, ctx) => setTokenSheet({ token, context: ctx })}
                />
              )}

              <PlayerStrip
                players={players.map((p: any) => ({
                  id: p.id, name: p.name, avatarChar: (p.name || "?").charAt(p.name.length - 1),
                  isHuman: p.is_user, isAlive: p.alive, isSpeaking: false, suspicionLevel: p.suspicion,
                  roleKnown: p.role ? (ROLE_CN[p.role]?.name) : undefined,
                }))}
                onPlayerClick={(id: string) => {
                  const p = players.find((x: any) => x.id === id);
                  if (!p || p.is_user || !p.alive) return; // can only question living AI players
                  setSelectedPlayerId(id);
                  setActionMode("question");
                }}
              />

              <SpeechFeed>
                {(game.feed || []).map((f: any, i: number) => {
                  if (f.type === "speech") {
                    const sp = players.find((p: any) => p.name === f.speaker);
                    return (
                      <PlayerSpeechCard
                        key={i}
                        playerName={f.speaker}
                        avatarChar={(f.speaker || "?").slice(-1)}
                        avatarUrl={sp?.avatar_url}
                        englishText={f.text}
                        chineseGloss={f.text_native}
                        onSpeak={() => speak(f.text, f.speaker)}
                        onChallenge={() => {
                          setSelectedPlayerId(sp?.id);
                          setActionMode("question");
                        }}
                      />
                    );
                  }
                  if (f.type === "user_question") {
                    return (
                      <UserSpeechCard
                        key={i}
                        englishText={f.text}
                        chineseGloss={f.text_native}
                        onShowLearningPoints={() => setActionMode("default")}
                      />
                    );
                  }
                  if (f.type === "contradiction") {
                    const involved = (f.players_involved || [])[0];
                    const sp = players.find((p: any) => p.name === involved);
                    return (
                      <ContradictionHintCard
                        key={i}
                        text={f.text}
                        targetPlayerId={sp?.id}
                        targetPlayerName={involved}
                        onChallenge={() => {
                          if (sp?.id) {
                            setSelectedPlayerId(sp.id);
                            setActionMode("question");
                          }
                        }}
                      />
                    );
                  }
                  return <AIHostCard key={i} text={f.text || f.text_native || ""} />;
                })}

                {busy && (
                  <div className="flex items-center gap-2 px-4 py-3 text-white/60 text-xs">
                    <Loader2 size={14} className="animate-spin" /> AI 思考中...
                  </div>
                )}
                <div ref={feedEndRef} />
              </SpeechFeed>

              <div className="px-3 pb-2">
                <ActionPanel
                  mode={actionMode}
                  players={aliveAI.map((p: any) => ({ id: p.id, name: p.name, avatarChar: (p.name || "?").slice(-1) }))}
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={setSelectedPlayerId}
                  onSend={handleQuestion}
                />
                <button
                  onClick={() => setUiPhase("vote")}
                  disabled={busy}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-[#7c5cff] to-[#a78bfa] rounded-2xl text-white font-bold text-sm shadow-[0_0_20px_rgba(124,92,255,0.4)] active:scale-95 disabled:opacity-50"
                >
                  结束讨论 · 发起投票
                </button>
              </div>
            </div>
          )}

          {/* Vote */}
          {uiPhase === "vote" && (
            <VotePanel
              players={players.filter((p: any) => p.alive).map((p: any) => ({
                id: p.id, name: p.name, avatarChar: (p.name || "?").slice(-1),
                suspicion: `${p.suspicion}`, isUser: p.is_user,
              }))}
              onVote={handleVote}
            />
          )}

          {uiPhase === "vote_result" && voteResult && (
            <VoteResultCard
              eliminatedPlayerName={voteResult.eliminatedName}
              revealedRole={voteResult.revealedRole}
              votes={voteResult.votes}
              onNextRound={() => void handleVoteResultNext()}
            />
          )}

          {/* Summary */}
          {uiPhase === "summary" && summary && (
            <GameSummary
              victory={summary.winner === "villagers"}
              score={summary.questions_asked ? Math.min(100, 60 + summary.questions_asked * 8) : 70}
              highlightSpeech={(summary.expressions || [])[0] || ""}
              learnedPatterns={summary.patterns || []}
              onPlayAgain={() => {
                resetLearning();
                setCrushDone(false);
                setAssetsDone(false);
                setSummary(null);
                setGame(null);
                setVoteResult(null);
                creatingRef.current = false;
                navigate("/game/social-logic/new", { replace: true });
              }}
              onAddToCrush={handleAddToCrush}
              onSaveToAssets={handleSaveToAssets}
              crushBusy={crushBusy}
              assetsBusy={assetsBusy}
              crushDone={crushDone}
              assetsDone={assetsDone}
            />
          )}

          {tokenSheet && (
            <TokenExplainSheet
              token={tokenSheet.token}
              context={tokenSheet.context}
              onClose={() => setTokenSheet(null)}
              speak={ttsSpeak}
            />
          )}
        </div>
      </GameShell>
    </div>
  );
}
