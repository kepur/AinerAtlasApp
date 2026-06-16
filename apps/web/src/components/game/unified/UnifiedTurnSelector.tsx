import { Flag, Pin } from "lucide-react";

export default function UnifiedTurnSelector({ mode }: { mode?: string }) {
  const isTurtleSoup = mode === "turtle_soup";

  return (
    <div className="w-full bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar sticky top-[56px] z-40 shadow-sm">
      <button className="px-3 py-1.5 rounded-full text-[11px] font-bold text-[#6b7280] hover:bg-gray-50 transition-colors shrink-0">
        {isTurtleSoup ? 'T1 表面故事' : 'T1 开场'}
      </button>
      <button className="px-5 py-1.5 rounded-full text-[11px] font-bold bg-[#f5f3ff] text-[#8b5cf6] border border-[#ddd6fe] shadow-inner shrink-0">
        {isTurtleSoup ? 'T2 第一个问题' : 'T2 试探'}
      </button>
      <button className="px-3 py-1.5 rounded-full text-[11px] font-bold text-[#6b7280] hover:bg-gray-50 transition-colors shrink-0">
        {isTurtleSoup ? 'T3 关键线索' : 'T3 回应'}
      </button>
      <button className="w-7 h-7 ml-auto flex items-center justify-center text-[#9ca3af] hover:text-[#6b7280] shrink-0">
        {isTurtleSoup ? <Flag size={14} /> : <Pin size={14} />}
      </button>
    </div>
  );
}
