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
    <header className="w-full z-50 px-3 pb-1 pt-1 bg-transparent shrink-0">
      <div className="flex justify-between items-center h-12">
        <button
          type="button"
          onClick={onBack}
          className="game-status-icon-btn p-2 -ml-2 rounded-full transition-colors"
          aria-label="返回"
        >
          <ArrowLeft size={22} />
        </button>
        
        <div className="flex flex-col items-center">
          <h1 className="game-status-title font-headline-md text-lg font-bold tracking-wide">
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
        
        <button
          type="button"
          onClick={onOptions}
          className="game-status-icon-btn p-2 -mr-2 rounded-full transition-colors"
          aria-label="更多"
        >
          <MoreHorizontal size={22} />
        </button>
      </div>
    </header>
  );
}
