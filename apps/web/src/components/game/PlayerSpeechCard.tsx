import { Volume2, ShieldAlert, Bookmark } from "lucide-react";

type SpeechCardProps = {
  playerName: string;
  avatarChar: string;
  avatarUrl?: string;
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
  avatarUrl,
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
      <div className="w-8 h-8 rounded-full bg-[#1a1140] flex items-center justify-center border border-white/10 flex-shrink-0 mt-1 text-xs text-white/70 overflow-hidden">
        {avatarUrl ? <img src={avatarUrl} alt={playerName} className="w-full h-full object-cover" /> : avatarChar}
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
          {(onSpeak || onChallenge || onSave) && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10 as-inline-actions">
            {onSpeak && (
              <button type="button" onClick={onSpeak} className="as-chip as-chip--sm as-chip--ghost">
                <Volume2 size={12} /> 朗读
              </button>
            )}
            {onChallenge && (
              <button type="button" onClick={onChallenge} className="as-chip as-chip--sm as-chip--ghost" style={{ borderColor: "rgba(251, 146, 60, 0.25)", color: "#fb923c" }}>
                <ShieldAlert size={12} /> 质疑
              </button>
            )}
            <div className="flex-1" />
            {onSave && (
              <button type="button" onClick={onSave} className="as-chip as-chip--sm as-chip--accent" aria-label="收藏">
                <Bookmark size={12} />
              </button>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
