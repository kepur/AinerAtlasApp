import { Skull } from "lucide-react";

type VoteResultProps = {
  eliminatedPlayerName: string;
  revealedRole?: string;
  votes: { voter: string; target: string }[];
  onNextRound: () => void;
  nextLabel?: string;
};

export default function VoteResultCard({ eliminatedPlayerName, revealedRole, votes, onNextRound, nextLabel = "进入下一阶段" }: VoteResultProps) {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 max-w-md mx-auto w-full relative z-10 pb-32">
      <h2 className="text-2xl font-bold text-white text-center">投票结果</h2>
      
      {/* Vote Diagram */}
      <div className="game-glass-card p-4">
        <h3 className="text-xs text-white/50 mb-3 text-center">票型分布</h3>
        <div className="flex flex-col gap-2">
          {votes.map((v, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-white/80">{v.voter}</span>
              <div className="flex-1 border-b border-dashed border-white/20 mx-3 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t border-r border-white/40 rotate-45"></div>
              </div>
              <span className="text-white font-medium">{v.target}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Result Card */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <Skull size={32} className="text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{eliminatedPlayerName} 被投票出局</h3>
        <div className="px-4 py-1.5 rounded-full bg-black/30 border border-white/10 mt-2">
          <span className="text-sm text-white/80">
            身份公开: <span className={revealedRole === '狼人' ? 'text-red-400 font-bold' : 'text-[#4edea3] font-bold'}>{revealedRole || '未知'}</span>
          </span>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-[80px] left-0 w-full px-4 pt-8 pb-4 bg-gradient-to-t from-[#0b0a1f] via-[#0b0a1f]/90 to-transparent z-40">
        <button 
          onClick={onNextRound}
          className="w-full max-w-md mx-auto h-14 bg-[#7c5cff] text-white rounded-full font-bold text-lg shadow-[0_0_24px_rgba(124,92,255,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
