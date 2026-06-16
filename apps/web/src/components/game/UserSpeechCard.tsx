import { Volume2, Sparkles } from "lucide-react";

type UserSpeechProps = {
  englishText: string;
  chineseGloss?: string;
  onSpeak?: () => void;
  onShowLearningPoints?: () => void;
};

export default function UserSpeechCard({
  englishText,
  chineseGloss,
  onSpeak,
  onShowLearningPoints
}: UserSpeechProps) {
  return (
    <div className="flex justify-end gap-3 mb-4 w-full pl-10">
      <div className="flex flex-col items-end gap-1 w-full max-w-[90%]">
        <span className="text-xs text-[#c0c1ff] pr-1">You</span>
        
        <div className="bg-gradient-to-br from-[#6063ee] to-[#4648d4] rounded-2xl rounded-tr-sm p-3 relative text-[15px] w-full text-left shadow-[0_4px_20px_rgba(96,99,238,0.3)]">
          <p className="text-white leading-relaxed mb-1">{englishText}</p>
          {chineseGloss && (
            <p className="text-white/70 text-xs">{chineseGloss}</p>
          )}
          
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/20">
            <button onClick={onSpeak} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white/90 px-2.5 py-1 rounded-full transition-all text-[11px]">
              <Volume2 size={12} className="text-white" /> 朗读
            </button>
            <div className="flex-1"></div>
            {onShowLearningPoints && (
              <button 
                onClick={onShowLearningPoints}
                className="flex items-center gap-1.5 bg-[#4edea3]/20 hover:bg-[#4edea3]/30 backdrop-blur-md border border-[#4edea3]/30 text-[#6ffbbe] px-2.5 py-1 rounded-full transition-all text-[11px]"
              >
                <Sparkles size={12} className="text-[#4edea3]" /> 学习点
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
