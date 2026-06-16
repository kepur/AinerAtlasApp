import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, ChevronRight, Volume2, RefreshCcw, Send, Mic, AlertTriangle, Search, Clock } from "lucide-react";

export default function InterrogationRoom() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-16 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top,20px)] border-b border-gray-100 shrink-0">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-[#111827] rounded-full hover:bg-gray-50 transition-colors border border-gray-200 shrink-0">
          <ArrowLeft size={18} />
        </button>

        <div className="flex flex-1 items-center gap-2 pl-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-lg">
            🕵️
          </div>
          <div className="flex flex-col">
            <div className="font-extrabold text-[#111827] text-sm leading-tight">AI侦探</div>
            <div className="text-[10px] text-[#6b7280]">嫌疑人审问</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] bg-[#f5f3ff] text-[#6d28d9] px-2.5 py-1 rounded-full font-medium">
            <span>线索 <span className="font-bold">3/8</span></span>
            <span className="text-[#c4b5fd]">|</span>
            <span>嫌疑人 <span className="font-bold">1/3</span></span>
            <ChevronRight size={12} />
          </div>
          <button className="flex flex-col items-center justify-center text-[#4b5563] hover:text-[#8b5cf6] transition-colors shrink-0">
            <Bookmark size={18} />
            <span className="text-[8px] font-medium mt-0.5">笔记</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full overflow-y-auto pb-36 px-4 pt-4 flex flex-col gap-4 no-scrollbar">

        {/* Case Banner */}
        <div className="bg-white rounded-[20px] p-3 shadow-sm border border-gray-100 flex gap-3 items-center">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
            <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=120&h=120" alt="Cafe" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[#111827] text-sm">咖啡馆的谎言</h2>
              <span className="bg-[#ede9fe] text-[#7c3aed] text-[9px] font-bold px-1.5 py-0.5 rounded">审问中</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[#6b7280]">
              <span className="flex items-center gap-0.5"><Search size={10} className="text-[#8b5cf6]" /> 线索 3/8</span>
              <span className="flex items-center gap-0.5"><span className="text-[#8b5cf6]">👤</span> 嫌疑人 1/3</span>
              <ChevronRight size={12} />
            </div>
          </div>
        </div>

        {/* Suspect Profile */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex gap-4">
          <div className="w-24 h-28 rounded-2xl overflow-hidden shrink-0 relative">
            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=250" alt="Anna" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-[#111827] text-base">服务员 Anna</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="bg-[#f5f3ff] text-[#8b5cf6] text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] inline-block"></span> 紧张
                  </span>
                  <span className="bg-[#fff7ed] text-[#c2410c] text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#fed7aa]">
                    口供待核验
                  </span>
                </div>
                <p className="text-[10px] text-[#6b7280] mt-1.5">最后见到老板的人之一</p>
              </div>
              <button className="text-[#9ca3af] hover:text-[#ec4899] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            </div>
            <div className="flex gap-2 mt-auto flex-wrap">
              <button className="flex items-center gap-1 bg-[#f5f3ff] text-[#6d28d9] px-2 py-1.5 rounded-lg text-[9px] font-bold border border-[#ede9fe] hover:bg-[#ede9fe] transition-colors">
                👤 查看不在场证明
              </button>
              <button className="flex items-center gap-1 bg-[#f0fdf4] text-[#15803d] px-2 py-1.5 rounded-lg text-[9px] font-bold border border-[#bbf7d0] hover:bg-[#dcfce7] transition-colors">
                🔗 关联线索
              </button>
              <button className="flex items-center gap-1 bg-[#eff6ff] text-[#1d4ed8] px-2 py-1.5 rounded-lg text-[9px] font-bold border border-[#bfdbfe] hover:bg-[#dbeafe] transition-colors">
                <Clock size={10} /> 时间线
              </button>
            </div>
          </div>
        </div>

        {/* Learning Hint */}
        <div className="bg-gradient-to-r from-[#f5f3ff] via-[#ede9fe] to-[#f5f3ff] rounded-[20px] p-4 shadow-sm border border-[#ddd6fe] relative overflow-hidden">
          <div className="absolute right-2 bottom-2 opacity-5 pointer-events-none">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="flex items-center gap-1.5 text-[#6d28d9] font-bold text-[11px] mb-2">
            <div className="w-4 h-4 rounded bg-white text-[#8b5cf6] flex items-center justify-center shadow-sm">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            </div>
            学习提示 <span className="text-[#c4b5fd] font-normal">Learning Hint</span>
          </div>
          <div className="flex items-start gap-2 mb-1">
            <h4 className="font-extrabold text-[#111827] text-sm leading-snug flex-1">
              When was the last time you saw the owner?
            </h4>
            <button className="w-7 h-7 rounded-full bg-white text-[#8b5cf6] flex items-center justify-center shadow-sm shrink-0 hover:bg-[#f5f3ff] transition-colors">
              <Volume2 size={14} />
            </button>
          </div>
          <p className="text-[11px] text-[#4b5563] mb-3">你最后一次见到老板是什么时候？</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-white text-[#6d28d9] px-2 py-1 rounded-full text-[9px] font-bold border border-[#ede9fe] shadow-sm">询问具体时间线</span>
            <span className="bg-white text-[#6d28d9] px-2 py-1 rounded-full text-[9px] font-bold border border-[#ede9fe] shadow-sm">When was the last time you...?</span>
            <button className="ml-auto flex items-center gap-1 text-[#8b5cf6] text-[10px] font-bold hover:text-[#6d28d9]">
              <RefreshCcw size={11} /> 换一句
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex flex-col gap-3">
          {/* User message */}
          <div className="flex justify-end gap-2 items-end">
            <div className="max-w-[80%] flex flex-col gap-0.5">
              <div className="bg-[#8b5cf6] text-white p-3 rounded-2xl rounded-tr-sm shadow-sm">
                <p className="text-[12px] leading-relaxed">你最后一次见到老板是什么时候？</p>
                <p className="text-[10px] text-white/70 mt-0.5">When was the last time you saw the owner?</p>
              </div>
              <div className="flex items-center gap-1 justify-end pr-1">
                <span className="text-[9px] text-[#9ca3af]">19:30</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-4">侦</div>
          </div>

          {/* Anna's reply */}
          <div className="flex gap-2 items-start">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=80&h=80" alt="Anna" className="w-full h-full object-cover" />
            </div>
            <div className="max-w-[80%] flex flex-col gap-0.5">
              <span className="text-[9px] text-[#6b7280] pl-1 font-medium">Anna</span>
              <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 relative">
                <button className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center">
                  <Volume2 size={11} />
                </button>
                <p className="text-[12px] text-[#111827] leading-relaxed pr-8">大概晚上九点前，我看到他还在收银台附近。</p>
                <p className="text-[10px] text-[#6b7280] mt-1 pr-8">Around 9 p.m., I saw him near the cash register.</p>
              </div>
              <span className="text-[9px] text-[#9ca3af] pl-1">19:31</span>
            </div>
          </div>

          {/* Second user message */}
          <div className="flex justify-end gap-2 items-end">
            <div className="max-w-[80%] flex flex-col gap-0.5">
              <div className="bg-[#8b5cf6] text-white p-3 rounded-2xl rounded-tr-sm shadow-sm">
                <p className="text-[12px] leading-relaxed">那为什么你的说法和 Leo 的口供不一致？</p>
                <p className="text-[10px] text-white/70 mt-0.5">Then why is your statement different from Leo's?</p>
              </div>
              <div className="flex items-center gap-1 justify-end pr-1">
                <span className="text-[9px] text-[#9ca3af]">19:32</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-4">侦</div>
          </div>

          {/* Anna 2nd reply */}
          <div className="flex gap-2 items-start">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=80&h=80" alt="Anna" className="w-full h-full object-cover" />
            </div>
            <div className="max-w-[80%] flex flex-col gap-0.5">
              <span className="text-[9px] text-[#6b7280] pl-1 font-medium">Anna</span>
              <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 relative">
                <button className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center">
                  <Volume2 size={11} />
                </button>
                <p className="text-[12px] text-[#111827] leading-relaxed pr-8">我……我不确定，也许我记错了时间。</p>
                <p className="text-[10px] text-[#6b7280] mt-1 pr-8">I... I'm not sure. Maybe I remembered the time wrong.</p>
              </div>
              <span className="text-[9px] text-[#9ca3af] pl-1">19:33</span>
            </div>
          </div>

          {/* Contradiction Alert */}
          <div className="bg-[#fff7ed] rounded-[16px] p-3 border border-[#fed7aa] flex gap-2.5">
            <AlertTriangle size={16} className="text-[#ea580c] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[11px] font-bold text-[#c2410c] mb-1.5">可疑点</div>
              <ul className="flex flex-col gap-1">
                <li className="text-[10px] text-[#9a3412]">• Anna 说她 21:00 前看到老板</li>
                <li className="text-[10px] text-[#9a3412]">• Leo 的说法显示当时两人在办公室</li>
              </ul>
            </div>
            <button className="text-[10px] font-bold text-[#ea580c] flex items-center gap-0.5 shrink-0 self-start mt-0.5">
              查看详情 <ChevronRight size={11} />
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Input + Actions */}
      <div className="absolute bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 pt-3 pb-[env(safe-area-inset-bottom,16px)] flex flex-col gap-2.5 z-50">
        {/* Input */}
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
            <Mic size={18} />
          </button>
          <div className="flex-1 bg-[#f3f4f6] rounded-full h-10 flex items-center px-4">
            <input type="text" placeholder="输入中文或英文，AI 帮你组织审问表达..." className="w-full text-[12px] bg-transparent focus:outline-none text-[#111827] placeholder:text-gray-400" />
          </div>
          <button className="w-9 h-9 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white shrink-0 shadow-md">
            <Send size={16} />
          </button>
        </div>
        {/* Action Grid */}
        <div className="grid grid-cols-4 gap-2">
          <button className="flex flex-col items-center justify-center gap-1 bg-[#f5f3ff] text-[#6d28d9] py-2 rounded-xl border border-[#ede9fe] text-[9px] font-bold hover:bg-[#ede9fe] active:scale-95 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
            追问问题
          </button>
          <button className="flex flex-col items-center justify-center gap-1 bg-[#fff7ed] text-[#c2410c] py-2 rounded-xl border border-[#fed7aa] text-[9px] font-bold hover:bg-[#ffedd5] active:scale-95 transition-all">
            <AlertTriangle size={14} />
            指出矛盾
          </button>
          <button className="flex flex-col items-center justify-center gap-1 bg-[#f0fdf4] text-[#15803d] py-2 rounded-xl border border-[#bbf7d0] text-[9px] font-bold hover:bg-[#dcfce7] active:scale-95 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            查看线索
          </button>
          <button className="flex flex-col items-center justify-center gap-1 bg-[#8b5cf6] text-white py-2 rounded-xl text-[9px] font-bold shadow-md hover:bg-[#7c3aed] active:scale-95 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            提交推理
          </button>
        </div>
      </div>
    </div>
  );
}
