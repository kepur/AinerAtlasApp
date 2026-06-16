import { Trophy, Mic, Lightbulb, Zap, BookmarkPlus, RotateCcw, ShieldAlert } from "lucide-react";

type GameSummaryProps = {
  victory: boolean;
  score: number;
  highlightSpeech: string;
  learnedPatterns: string[];
  onPlayAgain: () => void;
};

export default function GameSummary({ victory, score, highlightSpeech, learnedPatterns, onPlayAgain }: GameSummaryProps) {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 max-w-md mx-auto w-full relative z-10 pb-32">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center animate-[float-particle_4s_ease-in-out_infinite]">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 relative game-pulse ${victory ? 'bg-gradient-to-tr from-[#7c5cff] to-[#4edea3]' : 'bg-gradient-to-tr from-red-600 to-orange-500'}`}>
          <Trophy size={48} className="text-white relative z-10" />
          <div className="absolute inset-0 rounded-full border-2 border-white/30 scale-110"></div>
        </div>
        <h1 className={`text-3xl font-bold mb-2 ${victory ? 'text-[#c0c1ff]' : 'text-red-400'}`}>
          {victory ? '好人阵营胜利' : '狼人阵营胜利'}
        </h1>
        <p className="text-sm text-white/70">
          {victory ? 'Victory! You exposed the flaws in their logic.' : 'Defeat! The wolves tricked the town.'}
        </p>
      </section>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 gap-4">
        {/* Score */}
        <div className="game-glass-card p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xs text-white/50 mb-1">你的推理表现</h2>
            <div className="text-lg font-bold text-white">S-Tier Detective</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#4edea3]">{score}<span className="text-sm text-white/50">/100</span></div>
          </div>
        </div>

        {/* Highlight */}
        <div className="game-glass-card p-5 flex flex-col gap-3 relative overflow-hidden">
          <Mic className="absolute -top-4 -right-2 text-8xl text-white/5 -rotate-12" />
          <h2 className="text-xs text-white/70 flex items-center gap-2">
            <Mic size={16} /> 你的高光发言
          </h2>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <p className="text-base text-white leading-relaxed italic">
              "{highlightSpeech}"
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-6 h-6 rounded-full bg-[#4edea3]/20 flex items-center justify-center">
              <ShieldAlert size={12} className="text-[#4edea3]" />
            </div>
            <span className="text-xs text-[#4edea3]">Crucial Contradiction Spotted</span>
          </div>
        </div>

        {/* Learned Expressions */}
        <div className="game-glass-card p-5 flex flex-col gap-3">
          <h2 className="text-xs text-white/70 flex items-center gap-2">
            <Lightbulb size={16} /> 学到的英文句型
          </h2>
          <div className="flex flex-wrap gap-2">
            {learnedPatterns.map((pattern, idx) => (
              <div key={idx} className="px-3 py-1.5 rounded-full bg-[#7c5cff]/20 border border-[#7c5cff]/40 flex items-center gap-2">
                <span className="text-xs text-[#c0c1ff]">{pattern}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-[80px] left-0 w-full px-4 pt-8 pb-4 bg-gradient-to-t from-[#0b0a1f] via-[#0b0a1f]/90 to-transparent z-40 flex flex-col gap-3">
        <div className="flex gap-3 max-w-md mx-auto w-full">
          <button className="flex-1 h-12 bg-white/10 text-white rounded-full font-bold text-sm border border-white/20 flex items-center justify-center gap-2 hover:bg-white/20 transition-colors">
            <BookmarkPlus size={18} /> 加入消消乐
          </button>
          <button className="flex-1 h-12 bg-white/10 text-white rounded-full font-bold text-sm border border-white/20 flex items-center justify-center gap-2 hover:bg-white/20 transition-colors">
            保存到 Assets
          </button>
        </div>
        <button 
          onClick={onPlayAgain}
          className="w-full max-w-md mx-auto h-14 bg-[#7c5cff] text-white rounded-full font-bold text-lg shadow-[0_0_24px_rgba(124,92,255,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <RotateCcw size={20} /> 再玩一局
        </button>
      </div>
    </div>
  );
}
