import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import "../../game.css";
import GameShell from "../../components/game/GameShell";
import GameStatusBar from "../../components/game/GameStatusBar";
import LobbyReady from "../../components/game/LobbyReady";
import RoleCard from "../../components/game/RoleCard";
import PhaseBanner from "../../components/game/PhaseBanner";
import PlayerStrip from "../../components/game/PlayerStrip";
import SpeechFeed from "../../components/game/SpeechFeed";
import PlayerSpeechCard from "../../components/game/PlayerSpeechCard";
import UserSpeechCard from "../../components/game/UserSpeechCard";
import AIHostCard from "../../components/game/AIHostCard";
import ActionPanel from "../../components/game/ActionPanel";
import VotePanel from "../../components/game/VotePanel";
import GameSummary from "../../components/game/GameSummary";
import { apiRequest } from "../../api";
import { useAudioCacheStore } from "../../stores/audioCacheStore";

type UIPhase = "lobby" | "reveal" | "night" | "day" | "vote" | "summary";

const ROLE_CN: Record<string, { camp: string; ability: string; goal: string; name: string }> = {
  werewolf: { name: "狼人", camp: "狼人阵营", ability: "夜晚与同伴猎杀一名玩家。", goal: "消灭所有好人。" },
  villager: { name: "村民", camp: "好人阵营", ability: "无特殊能力，靠推理找出狼人。", goal: "白天放逐所有狼人。" },
  seer: { name: "预言家", camp: "好人阵营", ability: "每晚查验一名玩家的身份。", goal: "带领好人放逐狼人。" },
  guard: { name: "守卫", camp: "好人阵营", ability: "每晚守护一名玩家免于被杀。", goal: "保护好人放逐狼人。" },
};

export default function SocialLogicGame() {
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [uiPhase, setUiPhase] = useState<UIPhase>("lobby");
  const [busy, setBusy] = useState(false);
  const [actionMode, setActionMode] = useState<"default" | "question">("default");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();
  const [learningHud, setLearningHud] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const creatingRef = useRef(false);

  // Create a real backend game on mount.
  useEffect(() => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    (async () => {
      try {
        const data = await apiRequest<any>("/api/games/social-logic", {
          method: "POST", body: JSON.stringify({ difficulty: "easy" }),
        });
        setGame(data);
      } catch (e) { console.error(e); }
    })();
  }, []);

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

  const handleNightDone = async () => {
    if (!gid) return;
    const data = await call(`/${gid}/start`);
    setGame(data);
    setUiPhase("day");
  };

  const handleQuestion = async (text: string) => {
    if (!gid || !selectedPlayerId || !text.trim()) return;
    const data = await call(`/${gid}/question`, { target_player_id: selectedPlayerId, content: text.trim() });
    if (data.state) setGame(data.state);
    if (data.hud) setLearningHud(data.hud);
    setActionMode("default");
  };

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
    if (data.phase === "ended") {
      const s = await apiRequest<any>(`/api/games/social-logic/${gid}/summary`);
      setSummary(s);
      setUiPhase("summary");
    } else {
      setUiPhase("day");
    }
  };

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
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              <div className="absolute inset-0 bg-black/60 z-0" />
              <div className="z-10 animate-[glow-burst_1s_ease-out]">
                <RoleCard isFaceUp isUser role={roleInfo.name} camp={roleInfo.camp} ability={roleInfo.ability} goal={roleInfo.goal} onClick={handleStart} />
              </div>
              <p className="z-10 mt-6 text-white/60 text-xs">点击卡牌进入夜晚</p>
            </div>
          )}

          {/* Night transition */}
          {uiPhase === "night" && (
            <PhaseBanner phase="night" message="天黑请闭眼" subMessage="狼人正在行动..." onComplete={handleNightDone} />
          )}

          {/* Day discussion */}
          {uiPhase === "day" && (
            <div className="flex flex-col h-full">
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
                    return <PlayerSpeechCard key={i} playerName={f.speaker} avatarChar={(f.speaker || "?").slice(-1)} avatarUrl={sp?.avatar_url} englishText={f.text} chineseGloss={f.text_native} onSpeak={() => speak(f.text, f.speaker)} onChallenge={() => { setSelectedPlayerId(sp?.id); setActionMode("question"); }} />;
                  }
                  if (f.type === "user_question") {
                    return <UserSpeechCard key={i} englishText={f.text} chineseGloss={f.text_native} onShowLearningPoints={() => learningHud && setActionMode("default")} />;
                  }
                  return <AIHostCard key={i} text={f.text || f.text_native || ""} />;
                })}

                {/* Learning HUD card after a question */}
                {learningHud?.main_expression && (
                  <div className="mx-3 my-2 bg-[#1e1b4b]/70 border border-[#7c5cff]/30 rounded-2xl p-3 text-white">
                    <div className="text-[10px] text-[#a78bfa] font-bold mb-1">🌿 自然表达</div>
                    <div className="text-[14px] font-bold">{learningHud.main_expression}</div>
                    <div className="text-[11px] text-white/60 mb-2">{learningHud.meaning_native}</div>
                    {(learningHud.agents || []).slice(0, 3).map((a: any, i: number) => (
                      <div key={i} className="text-[10px] text-white/70 mt-1"><span className="text-[#a78bfa] font-bold">{a.agent}：</span>{a.result}</div>
                    ))}
                  </div>
                )}

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

          {/* Summary */}
          {uiPhase === "summary" && summary && (
            <GameSummary
              victory={summary.winner === (ROLE_CN[userRole]?.camp.includes("好人") ? "villagers" : "werewolves") || summary.winner === "villagers"}
              score={summary.questions_asked ? Math.min(100, 60 + summary.questions_asked * 8) : 70}
              highlightSpeech={(summary.expressions || [])[0] || ""}
              learnedPatterns={summary.patterns || []}
              onPlayAgain={() => navigate(0)}
            />
          )}
        </div>
      </GameShell>
    </div>
  );
}
