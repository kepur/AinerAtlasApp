import { Pin } from "lucide-react";

type Turn = {
  id: string;
  label: string;
  isActive?: boolean;
};

export default function TurnSelector({ turns, activeTurnId }: { turns: Turn[], activeTurnId: string }) {
  return (
    <div className="w-full bg-[#f7f9fb] border-b border-[#e0e3e5] px-4 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 sticky top-[64px] z-40">
      <div className="flex items-center gap-1.5 pr-2 border-r border-[#e0e3e5] shrink-0">
        <button className="w-6 h-6 flex items-center justify-center rounded-full bg-[#f2f4f6] text-[#767586] hover:bg-[#e0e3e5] active:scale-95 transition-all">
          <Pin size={12} />
        </button>
      </div>
      
      {turns.map(turn => (
        <button 
          key={turn.id}
          className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
            turn.id === activeTurnId 
              ? 'bg-[#4648d4] text-white shadow-[0_2px_8px_rgba(70,72,212,0.3)]' 
              : 'bg-white border border-[#e0e3e5] text-[#464554] hover:border-[#4648d4]/50'
          }`}
        >
          {turn.label}
        </button>
      ))}
    </div>
  );
}
