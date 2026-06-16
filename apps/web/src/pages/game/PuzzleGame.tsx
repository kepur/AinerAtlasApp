import { useState } from "react";
import "../../game.css";
import GameShell from "../../components/game/GameShell";
import GameStatusBar from "../../components/game/GameStatusBar";
import SpeechFeed from "../../components/game/SpeechFeed";
import AIHostCard from "../../components/game/AIHostCard";
import UserSpeechCard from "../../components/game/UserSpeechCard";
import GameSummary from "../../components/game/GameSummary";
import { useNavigate } from "react-router-dom";
import { Brain, Send } from "lucide-react";

export type PuzzlePhase = 
  | "lobby" 
  | "story_reveal" 
  | "questioning" 
  | "solve" 
  | "summary";

export default function PuzzleGame() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<PuzzlePhase>("lobby");

  return (
    <GameShell>
      {/* Debug Header */}
      <div className="w-full z-[200] bg-white/5 backdrop-blur-md border-b border-white/10 flex flex-col gap-1 pb-2 pt-1 px-2 shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        <div className="text-[10px] text-[#4edea3] font-bold px-2 flex items-center gap-1 opacity-80">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
          UI开发调试工具：海龟汤进度切换
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto px-1">
          {[
            { value: "lobby", label: "大厅" },
            { value: "story_reveal", label: "汤面公布" },
            { value: "questioning", label: "提问推理" },
            { value: "solve", label: "汤底揭晓" },
            { value: "summary", label: "结算" },
          ].map(item => (
            <button
              key={item.value}
              onClick={() => setPhase(item.value as PuzzlePhase)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${phase === item.value ? 'bg-[#3b82f6] text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] border border-[#bfdbfe]/50' : 'bg-black/20 text-white/60 border border-white/5 hover:bg-white/10 hover:text-white'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Status Bar */}
      {["story_reveal", "questioning", "solve"].includes(phase) && (
        <GameStatusBar 
          roundTitle={phase === "story_reveal" ? "听题阶段" : phase === "solve" ? "真相大白" : "第 1 轮提问"}
          aliveCount={1}
          totalCount={1}
          userRole="侦探"
          onBack={() => navigate(-1)}
        />
      )}

      <div className="flex-1 w-full h-full relative overflow-y-auto no-scrollbar flex flex-col">
        
        {phase === "lobby" && (
          <div className="flex-1 flex flex-col items-center justify-center relative p-5">
            <Brain size={80} className="text-[#3b82f6] mb-6 opacity-80" />
            <h2 className="text-2xl font-bold text-white tracking-widest mb-2">消失的乘客</h2>
            <p className="text-[#a5b4fc] text-sm mb-10">海龟汤 · 难度 B1 · Solo</p>
            <button 
              onClick={() => setPhase("story_reveal")} 
              className="w-full max-w-[200px] h-[56px] bg-[#3b82f6] text-white rounded-full font-bold shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 transition-transform"
            >
              准备好发车
            </button>
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
              <p className="text-white text-lg font-bold leading-relaxed mb-6">
                一个男人走进餐厅，点了一碗海龟汤，喝了一口后突然崩溃自杀。为什么？
              </p>
              <button 
                onClick={() => setPhase("questioning")} 
                className="px-8 py-3 bg-white text-[#3b82f6] rounded-full font-bold active:scale-95 transition-transform"
              >
                开始提问
              </button>
            </div>
          </div>
        )}

        {phase === "questioning" && (
          <div className="flex flex-col h-full w-full">
            <SpeechFeed>
              <AIHostCard text="你可以问我任何能用 Yes 或 No 回答的问题。" />
              
              <UserSpeechCard 
                englishText="Had he tried this soup before?"
                chineseGloss="他以前喝过这个汤吗？"
                onShowLearningPoints={() => alert("Show learning points")}
              />
              
              <div className="w-full flex justify-center my-3">
                <div className="bg-[#10b981]/20 border border-[#10b981]/40 px-6 py-3 rounded-2xl text-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <span className="text-[#34d399] font-extrabold text-2xl tracking-widest uppercase">YES</span>
                </div>
              </div>

              <div className="w-full flex justify-center my-2 opacity-80">
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#fcd34d]"></span>
                  <span className="text-[#d1d5db] text-xs">已发现线索：2 / 6</span>
                </div>
              </div>
            </SpeechFeed>

            {/* Turtle Soup Action Panel */}
            <div className="w-full bg-[#202124]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,20px)+20px)] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-[#e8eaed] mb-1 px-1">提出一个是/否问题</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {['Did he...?', 'Was he...?', 'Had he... before?', 'Is it related to...?'].map((chip, i) => (
                    <button key={i} className="shrink-0 px-3 py-1.5 bg-[#3b82f6]/20 text-[#93c5fd] border border-[#3b82f6]/40 rounded-full text-[11px] font-bold shadow-sm active:scale-95 transition-transform">
                      {chip}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-10 bg-white/10 border border-white/20 rounded-full flex items-center px-4 shadow-inner focus-within:border-[#3b82f6] focus-within:ring-1 focus-within:ring-[#3b82f6] transition-all">
                    <input 
                      type="text" 
                      placeholder="输入英文或中文..." 
                      className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-[#9ca3af]"
                    />
                  </div>
                  <button className="w-10 h-10 rounded-full bg-[#3b82f6] text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.5)] active:scale-95 transition-transform">
                    <Send size={16} className="ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === "solve" && (
          <div className="flex-1 flex flex-col items-center justify-center p-5 relative">
            <div className="absolute inset-0 bg-black/60 z-0"></div>
            <div className="z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl w-[90%] flex flex-col items-center text-center animate-[glow-burst_1s_ease-out]">
              <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                <span className="text-white font-extrabold text-xl">✓</span>
              </div>
              <h3 className="text-[#6ee7b7] text-xs font-bold mb-2 tracking-widest">【汤底 (The Truth)】</h3>
              <p className="text-white text-sm leading-relaxed mb-6">
                男人曾经和妻子在海上遇难，在一个荒岛上，他妻子生病死了。他吃了一种汤活了下来，别人告诉他这是海龟汤。今天他第一次在餐厅喝到真正的海龟汤，发现味道不一样，才意识到当年喝的其实是妻子的肉。
              </p>
              <button 
                onClick={() => setPhase("summary")} 
                className="px-8 py-3 bg-[#10b981] text-white rounded-full font-bold active:scale-95 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                查看结算
              </button>
            </div>
          </div>
        )}

        {phase === "summary" && (
          <GameSummary 
            victory={true}
            score={100}
            highlightSpeech="Had he tried this soup before?"
            learnedPatterns={["Did he...?", "Is it related to...", "Had he... before?"]}
            onPlayAgain={() => setPhase("lobby")}
          />
        )}
      </div>
    </GameShell>
  );
}
