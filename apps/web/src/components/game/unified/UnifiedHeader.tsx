import { ArrowLeft, Volume2, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  mode?: string;
  title?: string;
  phase?: string;
  turnCount?: number;
}

export default function UnifiedHeader({ mode, title, turnCount }: Props) {
  const navigate = useNavigate();
  const isTurtleSoup = mode === "turtle_soup";
  const isDetective = mode === "detective";

  const displayTitle = title || (isTurtleSoup ? "海龟汤" : isDetective ? "AI侦探" : "Story Dialogue");
  const subtitle = isTurtleSoup
    ? "边玩边学，边推理边练表达"
    : isDetective
      ? "观察 · 推理 · 表达"
      : "Play the story. Learn the language.";

  return (
    <header className="w-full h-14 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-50 pt-[env(safe-area-inset-top,20px)]">
      <button onClick={() => navigate("/game")} className="w-8 h-8 flex items-center justify-center text-[#111827] rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
        <ArrowLeft size={18} />
      </button>

      <div className="flex flex-col items-center flex-1">
        <div className="flex items-center gap-1.5">
          {isTurtleSoup ? (
            <div className="w-6 h-6 rounded bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] font-bold text-[10px]">🐢</div>
          ) : isDetective ? (
            <span className="text-[#eab308]">🔍</span>
          ) : (
            <span className="text-[#eab308]">✨</span>
          )}
          <h1 className="text-sm font-extrabold text-[#111827]">{displayTitle}</h1>
        </div>
        <p className="text-[9px] text-[#6b7280]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center hover:bg-[#ede9fe] transition-colors">
          <Volume2 size={16} />
        </button>
        <div className={`h-8 rounded-full flex items-center gap-1 px-3 text-white text-[11px] font-bold shadow-sm ${isTurtleSoup ? "bg-[#10b981]" : "bg-gradient-to-r from-[#10b981] to-[#059669]"}`}>
          <Flame size={14} className="text-[#fef08a]" /> {turnCount || 0} 回合
        </div>
      </div>
    </header>
  );
}
