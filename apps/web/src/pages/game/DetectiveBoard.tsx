import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, ChevronRight, CheckCircle2, Hourglass, MessageSquare, Volume2, RefreshCcw, Users, Lightbulb } from "lucide-react";

export default function DetectiveBoard() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-16 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top,20px)] border-b border-gray-100 shrink-0">
        <button onClick={() => navigate('/game')} className="w-8 h-8 flex items-center justify-center text-[#111827] rounded-full hover:bg-gray-50 transition-colors border border-gray-200 shrink-0">
          <ArrowLeft size={18} />
        </button>
        
        <div className="flex flex-1 items-center gap-2 pl-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-lg">
            🕵️
          </div>
          <div className="flex flex-col">
            <div className="font-extrabold text-[#111827] text-sm leading-tight">AI侦探</div>
            <div className="text-[10px] text-[#6b7280]">案件线索板</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] bg-[#f5f3ff] text-[#6d28d9] px-2.5 py-1 rounded-full font-medium">
            <span>案件 <span className="font-bold">1/5</span></span>
            <span className="text-[#c4b5fd]">|</span>
            <span>线索 <span className="font-bold">3/8</span></span>
          </div>
          <button className="flex flex-col items-center justify-center text-[#4b5563] hover:text-[#8b5cf6] transition-colors shrink-0">
            <Bookmark size={18} />
            <span className="text-[8px] font-medium mt-0.5">笔记</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full overflow-y-auto pb-32 px-4 pt-4 flex flex-col gap-4 no-scrollbar">
        
        {/* Hero Card */}
        <div className="bg-white rounded-[20px] p-3 shadow-sm border border-gray-100 flex gap-3">
          <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative">
            <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=200&h=200" alt="Cafe" className="w-full h-full object-cover" />
            <div className="absolute top-1 left-1 font-['Brush_Script_MT'] text-white text-[10px] drop-shadow-md">Moon Cafe</div>
          </div>
          <div className="flex flex-col py-0.5 justify-between flex-1">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <h2 className="font-bold text-[#111827] text-base leading-tight">咖啡馆的谎言</h2>
                <span className="bg-[#ede9fe] text-[#7c3aed] text-[9px] font-bold px-1.5 py-0.5 rounded">调查中</span>
              </div>
              <p className="text-[11px] text-[#4b5563] leading-snug line-clamp-2">老板深夜失踪，现场留下三只杯子、一把湿伞和一张被撕碎的纸条。</p>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="bg-[#f0fdf4] text-[#15803d] px-1.5 py-0.5 rounded text-[9px] font-medium border border-[#dcfce3] flex items-center gap-0.5">
                <span className="font-bold">难度</span> B1-B2
              </span>
              <span className="bg-[#f5f3ff] text-[#6d28d9] px-1.5 py-0.5 rounded text-[9px] font-medium border border-[#ede9fe] flex items-center gap-0.5">
                <span className="font-bold">目标语言</span> English
              </span>
              <span className="bg-[#fff7ed] text-[#c2410c] px-1.5 py-0.5 rounded text-[9px] font-medium border border-[#ffedd5] flex items-center gap-0.5">
                <span className="font-bold">时长</span> 10-15 分钟
              </span>
            </div>
          </div>
        </div>

        {/* Clues Section */}
        <section className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 font-bold text-[#111827] text-sm">
              <div className="w-5 h-5 rounded bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              关键线索
            </div>
            <span className="text-[11px] text-[#6b7280] flex items-center cursor-pointer hover:text-[#8b5cf6]">查看全部 <ChevronRight size={14} /></span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 1, title: '湿伞', desc: '吧台旁的湿伞，伞柄刻有“L”字母。', status: 'discovered', img: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=150&h=150' },
              { id: 2, title: '三只杯子', desc: '桌上有三只杯子，第三只仍有余温。', status: 'discovered', img: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&q=80&w=150&h=150' },
              { id: 3, title: '撕碎纸条', desc: '纸条碎片拼出部分字母：“meet... 9... price?”', status: 'pending', img: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=150&h=150' },
              { id: 4, title: '关店时间 21:00', desc: '收银台小票显示关店时间为 21:00。', status: 'pending', img: 'https://images.unsplash.com/photo-1595991209266-5af51952e46b?auto=format&fit=crop&q=80&w=150&h=150' },
            ].map(clue => (
              <div key={clue.id} className="bg-[#f8f9fc] rounded-xl p-2 border border-gray-100 flex gap-2 overflow-hidden shadow-sm">
                 <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                   <img src={clue.img} alt={clue.title} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex flex-col flex-1 justify-between py-0.5">
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center text-[8px] font-bold shrink-0">{clue.id}</span>
                        <h4 className="font-bold text-[#111827] text-[11px] truncate">{clue.title}</h4>
                      </div>
                      <p className="text-[9px] text-[#6b7280] leading-tight line-clamp-2">{clue.desc}</p>
                    </div>
                    <div className="mt-1 flex items-center">
                      {clue.status === 'discovered' ? (
                        <span className="bg-[#f0fdf4] text-[#15803d] px-1.5 py-0.5 rounded-full text-[8px] font-bold border border-[#dcfce3] flex items-center gap-0.5 w-fit">
                          <CheckCircle2 size={10} /> 已发现
                        </span>
                      ) : (
                        <span className="bg-[#fff7ed] text-[#c2410c] px-1.5 py-0.5 rounded-full text-[8px] font-bold border border-[#ffedd5] flex items-center gap-0.5 w-fit">
                          <Hourglass size={10} /> 待验证
                        </span>
                      )}
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </section>

        {/* Suspects Section */}
        <section className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-1.5 font-bold text-[#111827] text-sm">
              <div className="w-5 h-5 rounded bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center">
                <Users size={12} />
              </div>
              嫌疑人
            </div>
            <span className="text-[11px] text-[#6b7280] flex items-center cursor-pointer hover:text-[#8b5cf6]">查看全部 <ChevronRight size={14} /></span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
             {[
               { name: '服务员 Anna', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100', emotion: '紧张', emotionColor: 'text-[#8b5cf6] bg-[#f5f3ff]', tag: '不在场证明', tagColor: 'text-[#3b82f6] bg-[#eff6ff] border-[#bfdbfe]' },
               { name: '合伙人 Leo', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100&h=100', emotion: '冷静', emotionColor: 'text-[#3b82f6] bg-[#eff6ff]', tag: '口供矛盾', tagColor: 'text-[#ea580c] bg-[#fff7ed] border-[#fed7aa]' },
               { name: '常客 Mina', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100', emotion: '焦虑', emotionColor: 'text-[#ea580c] bg-[#fff7ed]', tag: '可追问', tagColor: 'text-[#15803d] bg-[#f0fdf4] border-[#bbf7d0]' },
             ].map((suspect, i) => (
               <div key={i} className="flex gap-2 shrink-0 w-[180px]">
                 <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm">
                   <img src={suspect.img} alt={suspect.name} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex flex-col justify-center flex-1">
                   <h4 className="font-bold text-[#111827] text-xs mb-1">{suspect.name}</h4>
                   <div className="flex items-center gap-1 mb-1">
                     <span className={`text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 ${suspect.emotionColor}`}>
                       <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg> {suspect.emotion}
                     </span>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${suspect.tagColor}`}>
                       {suspect.tag}
                     </span>
                     <button className="text-[#c4b5fd] hover:text-[#8b5cf6] transition-colors"><MessageSquare size={14} /></button>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        </section>

        {/* Two Columns: Timeline & Inference Board */}
        <div className="flex gap-3">
          {/* Timeline */}
          <div className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-1.5 font-bold text-[#111827] text-[13px]">
                <div className="w-4 h-4 rounded bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                时间线
              </div>
              <span className="text-[10px] text-[#6b7280] flex items-center cursor-pointer hover:text-[#8b5cf6]">查看全部 <ChevronRight size={12} /></span>
            </div>
            
            <div className="relative pl-1.5 py-1 flex-1 flex flex-col justify-between">
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200"></div>
              {[
                { time: '19:30', event: 'Anna 到店，开始晚班工作' },
                { time: '20:15', event: 'Leo 与老板在办公室交谈' },
                { time: '20:50', event: '常客 Mina 离开咖啡馆' },
                { time: '21:00', event: '关店时间，店内仅剩老板？' },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start relative z-10 mb-3 last:mb-0">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[#8b5cf6] bg-white mt-1 shrink-0"></div>
                  <div className="flex gap-2">
                    <span className="text-[11px] font-bold text-[#4b5563] shrink-0 w-8">{item.time}</span>
                    <span className="text-[10px] text-[#6b7280] leading-tight">{item.event}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inference Board */}
          <div className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col">
             <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-1.5 font-bold text-[#111827] text-[13px]">
                <div className="w-4 h-4 rounded bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </div>
                推理关系板
              </div>
              <span className="text-[10px] text-[#6b7280] flex items-center cursor-pointer hover:text-[#8b5cf6]">查看详情 <ChevronRight size={12} /></span>
            </div>

            <div className="flex-1 relative flex items-center justify-center py-2">
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                 <path d="M 50 25 C 70 35, 75 45, 80 50" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2 2" />
                 <path d="M 120 25 C 100 35, 95 45, 90 50" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2 2" />
                 <path d="M 50 80 C 70 70, 75 60, 80 50" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2 2" />
                 <path d="M 120 80 C 100 70, 95 60, 90 50" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2 2" />
                 <path d="M 85 95 C 85 80, 85 65, 85 60" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                 {/* Center Node */}
                 <div className="absolute w-[44px] h-[44px] rounded-full border border-[#c4b5fd] bg-[#f5f3ff] flex flex-col items-center justify-center shadow-sm z-20">
                    <span className="text-[10px] font-bold text-[#6d28d9] leading-none mb-0.5">老板</span>
                    <span className="text-[7px] text-[#8b5cf6] leading-none">(受害者)</span>
                 </div>
                 
                 {/* Top Left */}
                 <div className="absolute top-0 left-0 w-[46px] h-[30px] rounded-[10px] bg-[#f0fdf4] flex flex-col items-center justify-center shadow-sm">
                   <span className="text-[10px] font-bold text-[#15803d] leading-none mb-0.5">湿伞</span>
                   <span className="text-[7px] text-[#22c55e] leading-none">(线索)</span>
                 </div>
                 
                 {/* Top Right */}
                 <div className="absolute top-0 right-0 w-[50px] h-[30px] rounded-[10px] bg-[#fff7ed] flex flex-col items-center justify-center shadow-sm">
                   <span className="text-[10px] font-bold text-[#c2410c] leading-none mb-0.5">三只杯子</span>
                   <span className="text-[7px] text-[#ea580c] leading-none">(线索)</span>
                 </div>

                 {/* Bottom Left */}
                 <div className="absolute bottom-4 left-0 w-[42px] h-[30px] rounded-[10px] bg-[#eff6ff] flex flex-col items-center justify-center shadow-sm">
                   <span className="text-[10px] font-bold text-[#1d4ed8] leading-none mb-0.5">Anna</span>
                   <span className="text-[7px] text-[#3b82f6] leading-none">(嫌疑人)</span>
                 </div>

                 {/* Bottom Right */}
                 <div className="absolute bottom-4 right-0 w-[42px] h-[30px] rounded-[10px] bg-[#eff6ff] flex flex-col items-center justify-center shadow-sm">
                   <span className="text-[10px] font-bold text-[#1d4ed8] leading-none mb-0.5">Leo</span>
                   <span className="text-[7px] text-[#3b82f6] leading-none">(嫌疑人)</span>
                 </div>

                 {/* Bottom Center */}
                 <div className="absolute bottom-0 w-[52px] h-[30px] rounded-[10px] bg-[#fef2f2] flex flex-col items-center justify-center shadow-sm z-20 translate-y-1">
                   <span className="text-[9px] font-bold text-[#b91c1c] leading-none mb-0.5">口供矛盾</span>
                   <span className="text-[7px] text-[#ef4444] leading-none">(矛盾)</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Tips */}
        <section className="bg-gradient-to-r from-[#fdf4ff] via-[#f5f3ff] to-[#ede9fe] rounded-[20px] p-4 shadow-sm border border-[#ede9fe] relative overflow-hidden mt-2">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M22 17.5L18.5 14H16.27C17.36 12.63 18 10.9 18 9C18 4.03 13.97 0 9 0S0 4.03 0 9s4.03 9 9 9c1.9 0 3.63-.64 5-1.73V18.5L17.5 22 22 17.5zM9 16C5.13 16 2 12.87 2 9s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
          </div>
          
          <div className="flex items-center gap-1.5 font-bold text-[#6d28d9] text-xs mb-3">
             <div className="w-5 h-5 rounded bg-white text-[#8b5cf6] flex items-center justify-center shadow-sm">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
             </div>
             学习提示
          </div>

          <div className="flex items-start gap-2 mb-1.5 relative z-10">
            <h4 className="font-extrabold text-[#111827] text-sm leading-tight flex-1">When was the last time you saw the owner?</h4>
            <button className="text-[#8b5cf6] hover:text-[#6d28d9]"><Volume2 size={16} /></button>
          </div>
          <p className="text-[11px] text-[#4b5563] mb-1">你最后一次见到老板是什么时候？</p>
          <p className="text-[10px] text-[#9ca3af] mb-3">使用场景：询问目击时间，确认时间线。</p>

          <div className="flex justify-end relative z-10">
            <button className="flex items-center gap-1 text-[11px] font-bold text-[#8b5cf6] bg-white px-3 py-1.5 rounded-full shadow-sm hover:bg-gray-50 transition-colors">
              <RefreshCcw size={12} /> 换一句
            </button>
          </div>
        </section>

      </main>

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 pb-[env(safe-area-inset-bottom,16px)] flex items-center gap-2 z-50">
        <button className="flex-1 h-12 rounded-2xl bg-white text-[#8b5cf6] font-bold text-sm shadow-sm border border-[#8b5cf6] hover:bg-[#f5f3ff] transition-colors active:scale-95 flex items-center justify-center gap-1.5">
          <Users size={16} /> 审问嫌疑人
        </button>
        <button className="flex-1 h-12 rounded-2xl bg-white text-[#8b5cf6] font-bold text-sm shadow-sm border border-[#8b5cf6] hover:bg-[#f5f3ff] transition-colors active:scale-95 flex items-center justify-center gap-1.5">
          <MessageSquare size={16} /> 查看对话
        </button>
        <button className="flex-1 h-12 rounded-2xl bg-[#8b5cf6] text-white font-bold text-sm shadow-md hover:bg-[#7c3aed] transition-colors active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap">
          <Lightbulb size={16} /> 提交推理
        </button>
      </div>
    </div>
  );
}
