import { useState } from "react";
import "../../game.css";
import GameShell from "../../components/game/GameShell";
import GameStatusBar from "../../components/game/GameStatusBar";
import LobbyReady from "../../components/game/LobbyReady";
import CardDeck from "../../components/game/CardDeck";
import RoleCard from "../../components/game/RoleCard";
import PhaseBanner from "../../components/game/PhaseBanner";
import PlayerStrip from "../../components/game/PlayerStrip";
import SpeechFeed from "../../components/game/SpeechFeed";
import PlayerSpeechCard from "../../components/game/PlayerSpeechCard";
import UserSpeechCard from "../../components/game/UserSpeechCard";
import ContradictionHintCard from "../../components/game/ContradictionHintCard";
import AIHostCard from "../../components/game/AIHostCard";
import ActionPanel from "../../components/game/ActionPanel";
import VotePanel from "../../components/game/VotePanel";
import VoteResultCard from "../../components/game/VoteResultCard";
import GameSummary from "../../components/game/GameSummary";
import { useNavigate } from "react-router-dom";

export type GamePhase = 
  | "lobby" 
  | "shuffling" 
  | "dealing" 
  | "reveal" 
  | "night" 
  | "day_banner"
  | "day" 
  | "vote" 
  | "vote_result"
  | "summary";

const MOCK_PLAYERS = [
  { id: "1", name: "You", avatarChar: "Y", isHost: true, isHuman: true, isAlive: true, isSpeaking: false, suspicionLevel: 10 },
  { id: "2", name: "AI Player A", avatarChar: "A", personality: "冷静型", isAlive: true, isSpeaking: false, suspicionLevel: 25 },
  { id: "3", name: "AI Player B", avatarChar: "B", personality: "逻辑型", isAlive: true, isSpeaking: true, suspicionLevel: 80 },
  { id: "4", name: "AI Player C", avatarChar: "C", personality: "强势型", isAlive: false, isSpeaking: false, suspicionLevel: 0, roleKnown: "村民" },
  { id: "5", name: "AI Player D", avatarChar: "D", personality: "煽动型", isAlive: true, isSpeaking: false, suspicionLevel: 45 },
  { id: "6", name: "AI Player E", avatarChar: "E", personality: "防守型", isAlive: true, isSpeaking: false, suspicionLevel: 15 },
];

export default function SocialLogicGame() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [actionMode, setActionMode] = useState<"default" | "question">("default");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();

  return (
    <div className="premium w-full h-full">
      <GameShell>
        {/* Beautiful Header */}
        <header className="w-full px-4 h-14 flex items-center justify-between shrink-0 bg-[#1e1b4b]/40 backdrop-blur-md border-b border-white/5 relative z-[210]">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 border border-white/10 transition-colors shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </button>
          <div className="font-bold text-white text-[14px] tracking-wide">狼人杀 Lite：单机沉浸</div>
          <div className="w-8 h-8" /> {/* Placeholder for balance */}
        </header>

        {/* Debug Header - Horizontal Scrollable Bar (Styled as a premium glassmorphism tracker) */}
        <div className="w-full z-[200] bg-white/5 backdrop-blur-md border-b border-white/10 flex flex-col gap-1 pb-2 pt-1 px-2 shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="text-[10px] text-[#4edea3] font-bold px-2 flex items-center gap-1 opacity-80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
            UI开发调试工具：点击切换阶段
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto px-1">
          {[
            { value: "lobby", label: "大厅" },
            { value: "shuffling", label: "洗牌" },
            { value: "dealing", label: "发牌" },
            { value: "reveal", label: "看牌" },
            { value: "night", label: "入夜" },
            { value: "day_banner", label: "天亮" },
            { value: "day", label: "白天讨论" },
            { value: "vote", label: "投票" },
            { value: "vote_result", label: "出局" },
            { value: "summary", label: "结算" },
          ].map(item => (
            <button
              key={item.value}
              onClick={() => setPhase(item.value as GamePhase)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${phase === item.value ? 'bg-[#7c5cff] text-white shadow-[0_0_15px_rgba(124,92,255,0.6)] border border-[#c0c1ff]/50' : 'bg-black/20 text-white/60 border border-white/5 hover:bg-white/10 hover:text-white'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Status Bar (Hidden in some full-screen states like Lobby/Summary) */}
      {["day", "vote", "night"].includes(phase) && (
        <GameStatusBar 
          roundTitle={phase === "night" ? "第 1 轮夜晚" : phase === "vote" ? "投票阶段" : "第 1 轮白天"}
          aliveCount={5}
          totalCount={6}
          userRole="村民"
          onBack={() => navigate(-1)}
        />
      )}

      <div className="flex-1 w-full h-full relative overflow-y-auto no-scrollbar">
        {phase === "lobby" && (
          <LobbyReady players={MOCK_PLAYERS} onStartDealing={() => setPhase("shuffling")} />
        )}

        {phase === "shuffling" && (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <h2 className="absolute top-1/4 text-2xl font-bold text-white tracking-widest">AI 正在洗牌...</h2>
            <CardDeck isShuffling />
            <button onClick={() => setPhase("dealing")} className="absolute bottom-20 px-6 py-2 bg-white/10 rounded-full text-white">Next: Deal</button>
          </div>
        )}

        {phase === "dealing" && (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <h2 className="absolute top-[20%] text-2xl font-bold text-white tracking-wide">身份牌已发放</h2>
            
            <div className="grid grid-cols-3 gap-6 mt-10">
              {Array.from({length: 5}).map((_, i) => (
                <RoleCard key={i} isFaceUp={false} isUser={false} />
              ))}
            </div>
            <div className="mt-8">
              <RoleCard 
                isFaceUp={false} 
                isUser={true} 
                playerName="Your Card"
                onClick={() => setPhase("reveal")}
              />
            </div>
          </div>
        )}

        {phase === "reveal" && (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-black/60 z-0"></div>
            <div className="z-10 animate-[glow-burst_1s_ease-out]">
              <RoleCard 
                isFaceUp={true} 
                isUser={true} 
                role="村民"
                camp="好人"
                ability="无特殊能力，在白天通过推理找出狼人。"
                goal="放逐所有狼人。"
                onClick={() => setPhase("night")}
              />
            </div>
          </div>
        )}

        {phase === "night" && (
          <PhaseBanner 
            phase="night" 
            message="天黑请闭眼" 
            subMessage="狼人正在行动..." 
            onComplete={() => setPhase("day_banner")} 
          />
        )}

        {phase === "day_banner" && (
          <PhaseBanner 
            phase="day" 
            message="天亮了" 
            subMessage="昨晚平安夜，现在开始自由讨论" 
            onComplete={() => setPhase("day")} 
          />
        )}

        {phase === "day" && (
          <div className="flex flex-col h-full">
            <PlayerStrip players={MOCK_PLAYERS} onPlayerClick={() => setActionMode("question")} />
            
            <SpeechFeed>
              <AIHostCard text="白天讨论开始，存活玩家可自由发言" />
              
              <PlayerSpeechCard 
                playerName="AI Player A"
                avatarChar="A"
                englishText="I didn't hear any strange noises last night. I stayed in my room."
                chineseGloss="昨晚我没听到奇怪的声音，我待在房间里。"
              />
              
              <PlayerSpeechCard 
                playerName="AI Player B"
                avatarChar="B"
                englishText="I was near the storage room and I thought I saw C there."
                chineseGloss="我在储藏室附近，我好像看到C在那里。"
              />
              
              <ContradictionHintCard 
                text="Player B claims to have seen C in the storage room, but C is already eliminated. This is suspicious."
                targetPlayerName="AI Player B"
                onChallenge={() => { setActionMode("question"); setSelectedPlayerId("3"); }}
              />

              <UserSpeechCard 
                englishText="B, why did you say you were near the storage room if C didn’t see you there?"
                chineseGloss="B，如果C没看到你在储藏室附近，你为什么说你在那？"
                onShowLearningPoints={() => alert("Show learning points")}
              />
            </SpeechFeed>
            
            <ActionPanel 
              mode={actionMode}
              players={MOCK_PLAYERS.filter(p => !p.isHuman && p.isAlive)}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={setSelectedPlayerId}
              onSend={(text) => alert(`Sent: ${text}`)}
            />
          </div>
        )}

        {phase === "vote" && (
          <VotePanel 
            players={MOCK_PLAYERS.map(p => ({...p, isEliminated: !p.isAlive}))}
            onVote={() => setPhase("vote_result")}
          />
        )}

        {phase === "vote_result" && (
          <VoteResultCard 
            eliminatedPlayerName="AI Player B"
            revealedRole="狼人"
            votes={[
              { voter: "You", target: "AI Player B" },
              { voter: "AI Player A", target: "AI Player B" },
              { voter: "AI Player B", target: "AI Player A" },
            ]}
            onNextRound={() => setPhase("summary")}
          />
        )}

        {phase === "summary" && (
          <GameSummary 
            victory={true}
            score={98}
            highlightSpeech="B, why did you say you were near the storage room if C didn’t see you there?"
            learnedPatterns={["Why did you say...", "I suspect that...", "That doesn't add up."]}
            onPlayAgain={() => setPhase("lobby")}
          />
        )}
      </div>
    </GameShell>
    </div>
  );
}
