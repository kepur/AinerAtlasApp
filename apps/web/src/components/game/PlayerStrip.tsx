import { Mic } from "lucide-react";

type PlayerState = {
  id: string;
  name: string;
  isAlive: boolean;
  isSpeaking: boolean;
  suspicionLevel: number; // 0-100
  roleKnown?: string; // e.g. "狼人" if dead and revealed
  avatarChar: string;
};

type PlayerStripProps = {
  players: PlayerState[];
  onPlayerClick: (id: string) => void;
};

export default function PlayerStrip({ players, onPlayerClick }: PlayerStripProps) {
  return (
    <div className="flex overflow-x-auto no-scrollbar gap-4 py-2 pb-4 px-4">
      {players.map((p) => {
        let borderColor = "border-white/10";
        if (p.suspicionLevel > 70) borderColor = "border-red-500";
        else if (p.suspicionLevel > 40) borderColor = "border-orange-500";
        
        return (
          <div 
            key={p.id} 
            className="flex flex-col items-center min-w-[70px] cursor-pointer"
            onClick={() => onPlayerClick(p.id)}
          >
            <div className={`relative w-[60px] h-[60px] rounded-full p-1 bg-gradient-to-br from-white/10 to-white/5 opacity-90 ${p.isSpeaking ? 'animate-[game-subtle-pulse_2s_infinite] border-2 border-[#7c5cff]' : ''}`}>
              <div className={`w-full h-full rounded-full flex items-center justify-center font-bold text-xl ${p.isAlive ? 'bg-[#241548] text-white' : 'bg-black/50 text-white/30 grayscale'}`}>
                {p.avatarChar}
              </div>
              
              {p.isSpeaking && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#7c5cff] flex items-center justify-center border-2 border-[#0b0a1f] z-10">
                  <Mic size={12} className="text-white" />
                </div>
              )}
              
              {p.isAlive && p.suspicionLevel > 0 && (
                <div className={`absolute -bottom-1 -right-1 w-7 h-5 rounded-full flex items-center justify-center border-2 border-[#0b0a1f] z-10 ${p.suspicionLevel > 70 ? 'bg-red-500 text-white' : p.suspicionLevel > 40 ? 'bg-orange-500 text-white' : 'bg-[#4edea3] text-[#0b0a1f]'}`}>
                  <span className="text-[9px] font-bold">{p.suspicionLevel}%</span>
                </div>
              )}

              {!p.isAlive && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                  <span className="text-red-500 font-bold text-2xl rotate-45">X</span>
                </div>
              )}
            </div>
            
            <span className={`text-[11px] mt-2 font-medium ${p.isSpeaking ? 'text-white' : 'text-white/60'}`}>
              {p.name}
            </span>
            {p.roleKnown && (
              <span className="text-[9px] text-white/40 bg-white/10 px-1.5 rounded mt-0.5">{p.roleKnown}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
