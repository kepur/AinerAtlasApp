import { Volume2, BookmarkPlus, Lightbulb, UserCheck, Flame, PlusCircle } from "lucide-react";

export default function LearningHUD() {
  return (
    <div className="w-full h-[180px] bg-[#f7f9fb] border-b border-[#e0e3e5] shrink-0 sticky top-[72px] z-40 overflow-hidden shadow-sm shadow-[#4648d4]/5">
      <div className="w-full h-full overflow-x-auto snap-x snap-mandatory flex gap-3 px-4 py-3 no-scrollbar">
        
        {/* HUD Card 1: Natural Expression */}
        <div className="snap-center shrink-0 w-[85%] max-w-[300px] h-full bg-white rounded-2xl p-4 border border-[#e0e3e5] shadow-sm flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={14} className="text-[#F59E0B]" />
            <span className="text-[10px] font-bold text-[#F59E0B]">自然表达</span>
            <div className="ml-auto flex gap-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#4648d4] font-bold">口语</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#f2f4f6] text-[#767586]">书面</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-[#191c1e] leading-snug">
            I think it's better for us to keep some distance.
          </p>
          <p className="text-[11px] text-[#464554] mt-1">我觉得我们最好保持一点距离。</p>
          <div className="mt-auto flex justify-between items-center">
            <button className="w-8 h-8 rounded-full bg-[#f2f4f6] flex items-center justify-center text-[#4648d4] hover:bg-[#e1e0ff] active:scale-95 transition-all">
              <Volume2 size={14} />
            </button>
            <button className="flex items-center gap-1 text-[10px] font-bold text-[#4648d4] hover:opacity-80">
              <BookmarkPlus size={14} /> 保存
            </button>
          </div>
        </div>

        {/* HUD Card 2: Why This Expression */}
        <div className="snap-center shrink-0 w-[85%] max-w-[300px] h-full bg-white rounded-2xl p-4 border border-[#e0e3e5] shadow-sm flex flex-col overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-full">为什么这么写</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-xs font-bold text-[#4648d4] bg-[#EEF2FF] px-1 rounded mr-1">I think it's better for us to...</span>
              <span className="text-[11px] text-[#464554]">表示委婉的建议，“我觉得我们最好……”</span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#4648d4] bg-[#EEF2FF] px-1 rounded mr-1">keep some distance</span>
              <span className="text-[11px] text-[#464554]">比单纯的 keep distance 语气更自然，表示“保持一点距离”</span>
            </div>
          </div>
        </div>

        {/* HUD Card 3: Focus Points */}
        <div className="snap-center shrink-0 w-[85%] max-w-[300px] h-full bg-white rounded-2xl p-4 border border-[#e0e3e5] shadow-sm flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <Flame size={14} className="text-[#EF4444]" />
            <span className="text-[10px] font-bold text-[#EF4444]">本句重点</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <div className="bg-[#f7f9fb] border border-[#e0e3e5] rounded-lg px-2 py-1.5 flex items-center gap-2">
              <span className="text-xs font-semibold text-[#191c1e]">keep some distance</span>
              <button className="text-[#4648d4]"><Volume2 size={12} /></button>
            </div>
            <div className="bg-[#f7f9fb] border border-[#e0e3e5] rounded-lg px-2 py-1.5 flex items-center gap-2">
              <span className="text-xs font-semibold text-[#191c1e]">better for us to</span>
              <button className="text-[#4648d4]"><Volume2 size={12} /></button>
            </div>
          </div>
        </div>

        {/* HUD Card 4: Agent Insight */}
        <div className="snap-center shrink-0 w-[85%] max-w-[300px] h-full bg-white rounded-2xl p-4 border border-[#e0e3e5] shadow-sm flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <UserCheck size={14} className="text-[#10B981]" />
            <span className="text-[10px] font-bold text-[#10B981]">Agent 简析</span>
          </div>
          <div className="space-y-2 mt-1">
            <div className="flex gap-2 items-start">
              <div className="w-5 h-5 rounded bg-[#10B981]/10 text-[#10B981] flex items-center justify-center shrink-0 text-[10px] font-bold">Na</div>
              <p className="text-[11px] text-[#464554] leading-tight"><span className="font-semibold text-[#191c1e]">Native Agent:</span> 用 some distance 比直接说 distance 听起来不那么生硬。</p>
            </div>
            <div className="flex gap-2 items-start">
              <div className="w-5 h-5 rounded bg-[#7c5cff]/10 text-[#7c5cff] flex items-center justify-center shrink-0 text-[10px] font-bold">St</div>
              <p className="text-[11px] text-[#464554] leading-tight"><span className="font-semibold text-[#191c1e]">Story Coach:</span> 这个回答会让小师妹感到非常错愕和受伤，关系可能会降级。</p>
            </div>
          </div>
        </div>

        {/* HUD Card 5: Crush Candidate */}
        <div className="snap-center shrink-0 w-[85%] max-w-[300px] h-full bg-gradient-to-br from-[#EEF2FF] to-[#e1e0ff] rounded-2xl p-4 border border-[#c0c1ff] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#4648d4] mb-2">
            <PlusCircle size={20} />
          </div>
          <h4 className="text-sm font-bold text-[#191c1e]">加入今日消消乐</h4>
          <p className="text-[10px] text-[#464554] mt-1 mb-2">keep some distance</p>
          <button className="px-4 py-1.5 bg-[#4648d4] text-white text-[11px] font-bold rounded-full active:scale-95 shadow-[0_2px_10px_rgba(70,72,212,0.3)]">
            一键加入
          </button>
        </div>

      </div>
    </div>
  );
}
