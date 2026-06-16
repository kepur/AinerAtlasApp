import { MessageSquare, ShieldAlert, BookOpen, Flame, Leaf, Lightbulb, Volume2, Star } from "lucide-react";

export default function UnifiedLearningHUD({ mode }: { mode?: string }) {
  const isTurtleSoup = mode === "turtle_soup";

  return (
    <div className="w-full bg-[#f8f9fc] border-b border-gray-100 p-4 sticky top-[95px] z-30 shadow-sm">
      <div className="flex gap-3">
        {isTurtleSoup ? (
          <>
            {/* Turtle Soup Left Column: Natural Expression */}
            <div className="flex-[4] bg-white rounded-2xl p-3 border border-[#ede9fe] shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex items-center gap-1.5 text-[#8b5cf6] font-bold text-xs mb-2">
                  <Leaf size={14} /> 自然表达
                </div>
                <div className="flex justify-between items-start">
                  <h3 className="font-extrabold text-[#111827] text-lg leading-tight">Had he tried this soup before?</h3>
                  <button className="w-6 h-6 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0">
                    <Volume2 size={12} />
                  </button>
                </div>
                <p className="text-xs text-[#6b7280] mt-1">他以前喝过这个汤吗？</p>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 bg-[#f5f3ff] text-[#8b5cf6] px-2 py-0.5 rounded text-[10px] font-bold">
                  <Star size={10} /> 高频问法
                </span>
              </div>
            </div>

            {/* Turtle Soup Right Column: Grammar & Chips */}
            <div className="flex-[6] bg-gradient-to-br from-[#fff1f2] to-[#fce7f3] rounded-2xl p-3 border border-[#fbcfe8] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5 text-[#d97706] font-bold text-xs">
                    <Lightbulb size={14} /> 为什么这么写
                  </div>
                  <button className="text-[#d97706]">
                    <Volume2 size={12} />
                  </button>
                </div>
                <h4 className="font-bold text-[#111827] text-sm mb-1">Had he + 过去分词 + before?</h4>
                <p className="text-[10px] text-[#4b5563] leading-snug">过去完成时，用于询问过去某事是否在另一件过去的事之前发生。</p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="bg-[#ffedd5] text-[#b45309] px-2 py-1 rounded-full text-[9px] font-bold border border-[#fed7aa]">Is it related to...?</span>
                <span className="bg-[#ffedd5] text-[#b45309] px-2 py-1 rounded-full text-[9px] font-bold border border-[#fed7aa]">Did he...?</span>
                <span className="bg-[#ffedd5] text-[#b45309] px-2 py-1 rounded-full text-[9px] font-bold border border-[#fed7aa]">Could it be that...?</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left Column: Multi-Agent Analysis */}
            <div className="flex-1 bg-white rounded-2xl p-3 border border-[#ede9fe] shadow-sm flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <MessageSquare size={40} />
              </div>
              <div className="flex items-center gap-1.5 text-[#6366f1] font-bold text-xs mb-1">
                <MessageSquare size={14} /> 多智能体解析
              </div>
              
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0">
                  <MessageSquare size={12} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#8b5cf6]">Grammar Agent</div>
                  <p className="text-[11px] text-[#4b5563] leading-snug mt-0.5">本句使用“为什么”疑问句，表达原因询问，过去几天 + 现在完成时表示持续状态。</p>
                </div>
              </div>

              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0">
                  <ShieldAlert size={12} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#8b5cf6]">Native Expression Agent</div>
                  <p className="text-[11px] text-[#4b5563] leading-snug mt-0.5">"keep some distance" 是地道表达，委婉、礼貌又坚定，适合角色保持界限的场景。</p>
                </div>
              </div>

              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0">
                  <BookOpen size={12} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#8b5cf6]">Story Coach</div>
                  <p className="text-[11px] text-[#4b5563] leading-snug mt-0.5">你的回应决定剧情走向：冷漠会让关系降温，坦诚可能解锁隐藏剧情线。</p>
                </div>
              </div>
            </div>

            {/* Right Column: Sentence Crush */}
            <div className="w-[140px] bg-gradient-to-br from-[#fff1f2] to-[#fce7f3] rounded-2xl p-3 border border-[#fbcfe8] shadow-sm flex flex-col shrink-0 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 p-2 opacity-5">
                <Flame size={40} />
              </div>
              <div className="flex items-center gap-1.5 text-[#e11d48] font-bold text-xs mb-2">
                <Flame size={14} /> 句型消消乐
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="bg-white/80 rounded-lg p-2 shadow-sm border border-[#fce7f3]">
                  <p className="text-xs font-bold text-[#111827] leading-tight">I think it's better for us to...</p>
                  <p className="text-[9px] text-[#94a3b8] text-right mt-1">建议表达</p>
                </div>
                <div className="bg-white/80 rounded-lg p-2 shadow-sm border border-[#fce7f3]">
                  <p className="text-xs font-bold text-[#111827] leading-tight">keep some distance</p>
                  <p className="text-[9px] text-[#94a3b8] text-right mt-1">保持距离</p>
                </div>
                <div className="bg-white/80 rounded-lg p-2 shadow-sm border border-[#fce7f3]">
                  <p className="text-xs font-bold text-[#111827] leading-tight">Why are you avoiding me?</p>
                  <p className="text-[9px] text-[#94a3b8] text-right mt-1">原因询问</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <div className="mt-3 bg-gradient-to-r from-[#f5f3ff] to-transparent rounded-xl p-2.5 flex justify-between items-center border border-[#ede9fe]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#8b5cf6]/10 flex items-center justify-center text-[#8b5cf6] text-lg font-bold">
            {isTurtleSoup ? '🐢' : '🏰'}
          </div>
          <div>
            <div className="text-xs font-bold text-[#111827]">当前模式：<span className="text-[#8b5cf6]">{isTurtleSoup ? '海龟汤 · 消失的乘客' : '角色扮演 · 青云重生'}</span></div>
            <div className="text-[10px] text-[#6b7280]">{isTurtleSoup ? '通过提问找线索，还原事实真相' : '输入中文 → AI 推进剧情 + 生成英文表达'}</div>
          </div>
        </div>
        <div className="text-[10px] font-bold text-[#8b5cf6] bg-[#f5f3ff] px-2 py-1 rounded-md border border-[#ede9fe]">
          {isTurtleSoup ? '线索 2/6' : '第 2 章 · 试探'}
        </div>
      </div>
    </div>
  );
}
