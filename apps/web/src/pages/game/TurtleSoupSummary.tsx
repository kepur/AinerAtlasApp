import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Lightbulb, HelpCircle, Search, Clock, Volume2, Sparkles, RefreshCcw, Bookmark, ChevronRight } from "lucide-react";

export default function TurtleSoupSummary() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col overflow-y-auto pb-32">
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-14 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top,20px)] border-b border-gray-100">
        <button onClick={() => navigate('/game')} className="w-8 h-8 flex items-center justify-center text-[#111827] rounded-full hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-1 font-extrabold text-[#111827] text-base">
          海龟汤结果 <span className="text-[#8b5cf6] text-xl">🧩</span>
        </div>
        <div className="h-7 rounded-full bg-gradient-to-r from-[#fef08a] to-[#fde047] flex items-center gap-1 px-2 text-[#b45309] text-[11px] font-bold shadow-sm">
          <Flame size={12} className="text-[#ea580c]" /> 连续学习 12
        </div>
      </header>

      <main className="px-4 py-4 flex flex-col gap-4">
        {/* Banner Card */}
        <div className="w-full bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] rounded-[24px] p-5 relative overflow-hidden shadow-sm border border-[#ddd6fe]">
          {/* Lightbulb Image Placeholder */}
          <div className="absolute left-2 top-2 w-28 h-28 opacity-90">
            <img src="https://images.unsplash.com/photo-1542626991-cbc4e32524cc?auto=format&fit=crop&q=80&w=200&h=200" alt="Lightbulb" className="w-full h-full object-contain drop-shadow-xl" style={{ filter: 'hue-rotate(240deg) saturate(1.5)' }} />
          </div>
          
          <div className="pl-28 flex flex-col justify-center min-h-[100px] z-10 relative">
            <h2 className="text-2xl font-extrabold text-[#4c1d95] mb-1 tracking-tight">真相揭晓！</h2>
            <p className="text-xs text-[#6b7280] mb-3">你成功还原了故事真相</p>
            <h3 className="text-lg font-bold text-[#111827] mb-2">消失的乘客</h3>
            <div className="inline-flex items-center gap-1 bg-[#8b5cf6] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold w-fit shadow-sm">
              <span className="w-3 h-3 rounded-full bg-white text-[#8b5cf6] flex items-center justify-center text-[8px]">✓</span> 完成
            </div>
          </div>
        </div>

        {/* Surface Story */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <h4 className="font-bold text-[#111827] text-sm mb-1">表面故事</h4>
            <p className="text-xs text-[#4b5563] leading-relaxed">一个男人上了火车，中途消失了，但没有人看见他离开。为什么？</p>
          </div>
        </div>

        {/* The Truth */}
        <div className="bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] rounded-2xl p-4 shadow-sm border border-[#ddd6fe] flex gap-3 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10">
             <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0 shadow-md relative z-10">
            <Lightbulb size={20} />
          </div>
          <div className="relative z-10">
            <h4 className="font-bold text-[#6d28d9] text-sm mb-1">最终真相</h4>
            <p className="text-xs text-[#4c1d95] leading-relaxed font-medium">
              男人其实从未真正“消失”。他在火车进隧道时与同行的双胞胎兄弟互换了衣服和座位，乘客误以为原来的人不见了。
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="flex items-center gap-1 text-[10px] text-[#6b7280] font-bold">
              <div className="w-5 h-5 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center"><HelpCircle size={12} /></div>
              提问次数
            </div>
            <div className="text-2xl font-black text-[#111827]">9</div>
          </div>
          <div className="w-px h-10 bg-gray-100"></div>
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="flex items-center gap-1 text-[10px] text-[#6b7280] font-bold">
              <div className="w-5 h-5 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center"><Search size={12} /></div>
              发现线索
            </div>
            <div className="text-2xl font-black text-[#111827]">6/6</div>
          </div>
          <div className="w-px h-10 bg-gray-100"></div>
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="flex items-center gap-1 text-[10px] text-[#6b7280] font-bold">
              <div className="w-5 h-5 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center"><Clock size={12} /></div>
              用时
            </div>
            <div className="text-2xl font-black text-[#111827]">08:42</div>
          </div>
        </div>

        {/* Two Columns: Key Questions & Learned Patterns */}
        <div className="flex gap-3">
          {/* Key Questions */}
          <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827] mb-3">
              <HelpCircle size={14} className="text-[#8b5cf6]" /> 你的关键问题
            </div>
            <div className="flex flex-col gap-2">
              {[
                "Was he alone on the train?",
                "Did someone take his place?",
                "Is it related to another person?"
              ].map((q, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#f8f9fc] rounded-lg p-2 border border-gray-50">
                  <div className="w-4 h-4 rounded-full bg-[#8b5cf6] text-white text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  <span className="text-[10px] text-[#4b5563] font-medium flex-1 truncate">{q}</span>
                  <button className="text-[#9ca3af] hover:text-[#8b5cf6] shrink-0"><Volume2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Learned Patterns */}
          <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                <div className="w-3.5 h-3.5 rounded bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center text-[8px]">📚</div> 本局学到的句型
              </div>
              <span className="text-[9px] text-[#8b5cf6] font-bold flex items-center">加入消消乐 <ChevronRight size={10} /></span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="bg-[#f5f3ff] text-[#6d28d9] px-2 py-1 rounded border border-[#ede9fe] text-[10px] font-medium">Did he...?</span>
              <span className="bg-[#f5f3ff] text-[#6d28d9] px-2 py-1 rounded border border-[#ede9fe] text-[10px] font-medium">Was it related to...?</span>
              <span className="bg-[#f5f3ff] text-[#6d28d9] px-2 py-1 rounded border border-[#ede9fe] text-[10px] font-medium w-full truncate">Did someone take his place?</span>
              <span className="bg-[#f5f3ff] text-[#6d28d9] px-2 py-1 rounded border border-[#ede9fe] text-[10px] font-medium w-full truncate">I think the answer is...</span>
            </div>
          </div>
        </div>

        {/* AI Learning Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-sm font-bold text-[#111827] mb-4">
            <Sparkles size={16} className="text-[#8b5cf6]" /> AI 学习总结
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">🤖</div>
              <div>
                <div className="text-[11px] font-bold text-[#8b5cf6] mb-0.5">Grammar Agent</div>
                <p className="text-[11px] text-[#4b5563] leading-relaxed">你熟练使用了过去时和疑问句结构，提问表达很准确。</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">😊</div>
              <div>
                <div className="text-[11px] font-bold text-[#8b5cf6] mb-0.5">Native Expression Agent</div>
                <p className="text-[11px] text-[#4b5563] leading-relaxed">"take his place" 用得非常自然，地道表达加分！</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">🧠</div>
              <div>
                <div className="text-[11px] font-bold text-[#8b5cf6] mb-0.5">Thinking Coach</div>
                <p className="text-[11px] text-[#4b5563] leading-relaxed">你的提问逻辑清晰，善于从人物关系角度挖掘关键线索。</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-2">
          <button onClick={() => navigate('/game/play/turtle_soup/passenger')} className="flex-1 bg-[#8b5cf6] text-white h-12 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-[#7c3aed] transition-colors active:scale-95">
            <RefreshCcw size={16} /> 再来一局
          </button>
          <button className="flex-1 bg-white text-[#8b5cf6] h-12 rounded-2xl font-bold flex items-center justify-center gap-2 border border-[#8b5cf6] shadow-sm hover:bg-[#f5f3ff] transition-colors active:scale-95">
            <Bookmark size={16} /> 保存到 Assets
          </button>
        </div>
        
        <div className="flex justify-center mt-2 mb-4">
          <button onClick={() => navigate('/game')} className="text-xs text-[#8b5cf6] flex items-center hover:underline">
            返回游戏首页 <ChevronRight size={12} />
          </button>
        </div>
      </main>
    </div>
  );
}
