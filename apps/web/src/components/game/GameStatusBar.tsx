import { ArrowLeft, MoreHorizontal } from "lucide-react";

type GameStatusBarProps = {
  roundTitle: string;
  aliveCount: number;
  totalCount: number;
  userRole?: string;
  onBack: () => void;
  onOptions?: () => void;
};

export default function GameStatusBar({
  roundTitle,
  aliveCount,
  totalCount,
  userRole,
  onBack,
  onOptions
}: GameStatusBarProps) {
  return (
    <header className="w-full z-50 px-4 pb-2 pt-2 bg-transparent">
      <div className="flex justify-between items-center h-14">
        <button onClick={onBack} className="p-2 -ml-2 text-white/70 hover:text-white rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        
        <div className="flex flex-col items-center">
          <h1 className="font-headline-md text-lg font-bold text-white tracking-wide" style={{ textShadow: "0 0 10px rgba(255,255,255,0.3)" }}>
            {roundTitle}
          </h1>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#006c49]/40 border border-[#6ffbbe]/30 text-[#6ffbbe]">
              存活 {aliveCount}/{totalCount}
            </span>
            {userRole && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#4648d4]/40 border border-[#c0c1ff]/30 text-[#c0c1ff]">
                你的身份：{userRole}
              </span>
            )}
          </div>
        </div>
        
        <button onClick={onOptions} className="p-2 -mr-2 text-white/70 hover:text-white rounded-full transition-colors">
          <MoreHorizontal size={24} />
        </button>
      </div>
    </header>
  );
}
