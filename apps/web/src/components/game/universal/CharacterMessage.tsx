import { Volume2, Heart } from "lucide-react";

type CharacterMessageProps = {
  name: string;
  avatarUrl: string;
  text: string;
  englishText?: string;
  relationshipChange?: number;
};

export default function CharacterMessage({ name, avatarUrl, text, englishText, relationshipChange }: CharacterMessageProps) {
  return (
    <div className="w-full flex gap-3 my-1">
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-[#e0e3e5] shadow-sm">
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col gap-1 max-w-[80%]">
        <span className="text-[11px] font-bold text-[#767586] ml-1">{name}</span>
        <div className="bg-white rounded-2xl rounded-tl-sm p-3.5 border border-[#e0e3e5] shadow-sm relative group">
          <p className="text-sm text-[#191c1e] leading-relaxed">{text}</p>
          {englishText && (
            <p className="text-[11px] text-[#464554] mt-1.5 pt-1.5 border-t border-[#f2f4f6]">
              {englishText}
            </p>
          )}
          
          <div className="absolute -right-3 -bottom-3 flex gap-1">
            <button className="w-7 h-7 rounded-full bg-white border border-[#e0e3e5] shadow-sm flex items-center justify-center text-[#4648d4] hover:bg-[#EEF2FF] active:scale-95 transition-transform">
              <Volume2 size={12} />
            </button>
          </div>
        </div>
        
        {relationshipChange && (
          <div className="flex items-center gap-1 mt-1 ml-1">
            <Heart size={10} className={relationshipChange > 0 ? "text-[#EF4444]" : "text-[#3B82F6]"} />
            <span className={`text-[10px] font-bold ${relationshipChange > 0 ? "text-[#EF4444]" : "text-[#3B82F6]"}`}>
              好感度 {relationshipChange > 0 ? `+${relationshipChange}` : relationshipChange}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
