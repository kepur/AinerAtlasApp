import { Info, Volume2 } from "lucide-react";

type Props = {
  text: string;
  onSpeak?: () => void;
};

export default function AIHostCard({ text, onSpeak }: Props) {
  return (
    <div className="flex justify-center my-4 w-full px-2">
      <div className="game-host-card bg-[#7c5cff]/12 border border-[#7c5cff]/25 rounded-2xl px-4 py-3 flex items-start gap-2 max-w-[92%]">
        <Info size={14} className="text-[#c0c1ff] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[#e8e9ff] font-medium leading-relaxed flex-1">{text}</p>
        {onSpeak ? (
          <button
            type="button"
            onClick={onSpeak}
            className="shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[#c0c1ff] active:scale-95 transition-transform"
            title="朗读"
            aria-label="朗读"
          >
            <Volume2 size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
