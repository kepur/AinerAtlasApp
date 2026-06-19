import { Mic } from "lucide-react";

type PlayerState = {
  id: string;
  name: string;
  isAlive: boolean;
  isSpeaking: boolean;
  suspicionLevel: number;
  roleKnown?: string;
  avatarChar: string;
};

type PlayerStripProps = {
  players: PlayerState[];
  onPlayerClick: (id: string) => void;
};

export default function PlayerStrip({ players, onPlayerClick }: PlayerStripProps) {
  return (
    <div className="flex overflow-x-auto no-scrollbar gap-2.5 py-1 px-3 shrink-0">
      {players.map((p) => (
        <div
          key={p.id}
          className="flex flex-col items-center min-w-[52px] cursor-pointer"
          onClick={() => onPlayerClick(p.id)}
        >
          <div
            className={`relative w-[44px] h-[44px] rounded-full p-0.5 bg-gradient-to-br from-white/10 to-white/5 ${
              p.isSpeaking ? "animate-[game-subtle-pulse_2s_infinite] border-2 border-[#7c5cff]" : ""
            }`}
          >
            <div
              className={`w-full h-full rounded-full flex items-center justify-center font-bold text-base ${
                p.isAlive ? "bg-[#241548] text-white" : "bg-black/50 text-white/30 grayscale"
              }`}
            >
              {p.avatarChar}
            </div>

            {p.isSpeaking && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#7c5cff] flex items-center justify-center border border-[#0b0a1f] z-10">
                <Mic size={10} className="text-white" />
              </div>
            )}

            {p.isAlive && p.suspicionLevel > 0 && (
              <div
                className={`absolute -bottom-0.5 -right-0.5 min-w-[22px] h-4 px-0.5 rounded-full flex items-center justify-center border border-[#0b0a1f] z-10 text-[8px] font-bold ${
                  p.suspicionLevel > 70
                    ? "bg-red-500 text-white"
                    : p.suspicionLevel > 40
                      ? "bg-orange-500 text-white"
                      : "bg-[#4edea3] text-[#0b0a1f]"
                }`}
              >
                {p.suspicionLevel}%
              </div>
            )}

            {!p.isAlive && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                <span className="text-red-500 font-bold text-lg rotate-45">X</span>
              </div>
            )}
          </div>

          <span className={`text-[10px] mt-1 font-medium truncate max-w-[52px] ${p.isSpeaking ? "text-white" : "text-white/60"}`}>
            {p.name}
          </span>
          {p.roleKnown && (
            <span className="text-[8px] text-white/40 bg-white/10 px-1 rounded">{p.roleKnown}</span>
          )}
        </div>
      ))}
    </div>
  );
}
