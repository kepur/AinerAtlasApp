import { AlertTriangle, ArrowRight } from "lucide-react";

type HintProps = {
  text: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  onChallenge?: () => void;
};

export default function ContradictionHintCard({ text, targetPlayerName, onChallenge }: HintProps) {
  return (
    <div className="flex justify-center my-4 w-full">
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 max-w-[85%] flex items-start gap-3">
        <div className="text-orange-400 mt-0.5 flex-shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-orange-200 leading-relaxed">
            {text}
          </p>
          {onChallenge && targetPlayerName && (
            <button 
              onClick={onChallenge}
              className="self-start text-[11px] bg-orange-500/10 hover:bg-orange-500/20 backdrop-blur-md border border-orange-500/20 text-orange-300 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors mt-1"
            >
              质疑 {targetPlayerName} <ArrowRight size={12} className="text-orange-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
