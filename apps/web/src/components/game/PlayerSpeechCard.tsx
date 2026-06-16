import { Volume2, ShieldAlert, Bookmark } from "lucide-react";

type SpeechCardProps = {
  playerName: string;
  avatarChar: string;
  englishText: string;
  chineseGloss?: string;
  isHost?: boolean;
  onSpeak?: () => void;
  onChallenge?: () => void;
  onSave?: () => void;
};

export default function PlayerSpeechCard({
  playerName,
  avatarChar,
  englishText,
  chineseGloss,
  isHost,
  onSpeak,
  onChallenge,
  onSave
}: SpeechCardProps) {
  if (isHost) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-[#7c5cff]/20 border border-[#7c5cff]/30 text-[#c0c1ff] text-xs px-4 py-1.5 rounded-full text-center max-w-[80%]">
          {englishText}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-4 max-w-[90%]">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#1a1140] flex items-center justify-center border border-white/10 flex-shrink-0 mt-1 text-xs text-white/70">
        {avatarChar}
      </div>
      
      {/* Bubble */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-white/50 pl-1">{playerName}</span>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl rounded-tl-sm p-3 relative group text-[15px]">
          <p className="text-white leading-relaxed mb-1">{englishText}</p>
          {chineseGloss && (
            <p className="text-xs text-white/50">{chineseGloss}</p>
          )}
          
          {/* Actions - visible on tap/hover or permanent in this UI */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
            <button onClick={onSpeak} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white/80 px-2.5 py-1 rounded-full transition-all text-[11px]">
              <Volume2 size={12} className="text-[#7c5cff]" /> 朗读
            </button>
            <button onClick={onChallenge} className="flex items-center gap-1.5 bg-orange-500/10 hover:bg-orange-500/20 backdrop-blur-md border border-orange-500/20 text-orange-300 px-2.5 py-1 rounded-full transition-all text-[11px]">
              <ShieldAlert size={12} className="text-orange-400" /> 质疑
            </button>
            <div className="flex-1"></div>
            <button onClick={onSave} className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white/50 hover:text-white/80">
              <Bookmark size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
