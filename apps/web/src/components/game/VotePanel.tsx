import { useState } from "react";

type VotePanelProps = {
  players: {
    id: string;
    name: string;
    avatarChar: string;
    suspicion?: string;
    isEliminated?: boolean;
    isUser?: boolean;
  }[];
  onVote: (targetId: string, reason: string) => void;
};

export default function VotePanel({ players, onVote }: VotePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const handleVote = () => {
    if (selectedId && reason.trim()) {
      onVote(selectedId, reason);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-md mx-auto w-full relative z-10 pb-32">
      <section className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">投票阶段</h1>
        <p className="text-sm text-[#c0c1ff]">请选择你认为最可疑的玩家，并给出一句理由。</p>
      </section>

      <section className="grid grid-cols-2 gap-4">
        {players.filter(p => !p.isUser).map(p => {
          const isSelected = selectedId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => !p.isEliminated && setSelectedId(p.id)}
              disabled={p.isEliminated}
              className={`rounded-xl p-4 flex flex-col items-center justify-center gap-2 aspect-square transition-all duration-200 ${p.isEliminated ? 'bg-red-500/5 border border-red-500/20 grayscale opacity-60' : isSelected ? 'bg-[#7c5cff]/20 border border-[#7c5cff]/50 shadow-[0_4px_20px_rgba(124,92,255,0.3)]' : 'game-glass-card hover:scale-95'}`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${p.isEliminated ? 'bg-black/50 text-white/30' : isSelected ? 'bg-[#7c5cff] text-white' : 'bg-white/10 text-white/70'}`}>
                {p.avatarChar}
              </div>
              <span className="text-sm text-white font-medium">{p.name}</span>
              <span className="text-[11px] text-white/50">{p.isEliminated ? '已出局' : p.suspicion || 'Suspicion: Low'}</span>
            </button>
          );
        })}
      </section>

      {selectedId && (
        <section className="fixed bottom-[80px] left-0 w-full p-4 bg-gradient-to-t from-[#0b0a1f] via-[#0b0a1f]/95 to-transparent z-40 animate-[slideUp_0.3s_ease-out]">
          <div className="max-w-md mx-auto flex flex-col gap-3">
            <h3 className="text-sm text-white/80">投票理由 (必填)</h3>
            <input 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full min-h-[50px] rounded-xl bg-white/10 border border-white/20 text-white px-4 outline-none focus:border-[#7c5cff] placeholder:text-white/40 text-sm" 
              placeholder="I vote for this player because..." 
              type="text"
            />
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/20">
                帮我生成理由
              </button>
              <button 
                onClick={handleVote}
                disabled={!reason.trim()}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-bold disabled:opacity-50 disabled:bg-gray-500"
              >
                确认投票
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
