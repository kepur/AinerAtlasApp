import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bookmark, Clock, MapPin, Target, Search, Mic, Send, MessageCircle, Gamepad2, User, Home, FileText, UserCircle, Users, LayoutDashboard, Share2, CornerDownRight, PlayCircle, Lightbulb, RefreshCw } from "lucide-react";

export default function DetectiveBoard() {
  const navigate = useNavigate();

  return (
    <div className="premium w-full min-h-screen bg-[#f8f9fc] flex flex-col font-sans relative text-[#111827] pb-24">
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 bg-white rounded-full shadow-sm border border-gray-100">
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🕵️</span>
            <h1 className="font-bold text-[16px] text-[#111827]">AI侦探</h1>
          </div>
          <p className="text-[10px] text-gray-500">案件线索板</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full text-[10px] text-gray-600 font-medium">
            <span>案件 <strong className="text-gray-900">1</strong>/5</span>
            <span className="w-px h-3 bg-gray-300"></span>
            <span>线索 <strong className="text-[#8b5cf6]">3</strong>/8</span>
          </div>
          <button className="flex flex-col items-center justify-center text-gray-600">
            <Bookmark size={18} />
            <span className="text-[8px] mt-0.5">笔记</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full px-4 pt-4 flex flex-col gap-4">
        
        {/* Case Info Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4">
          <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative shadow-sm">
            <img src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=200&h=200" alt="Cafe" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/10"></div>
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="font-bold text-[16px] text-[#111827]">咖啡馆的谎言</h2>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded">调查中</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug mb-3">
              老板深夜失踪，现场留下三只杯子、一把湿伞和一张被撕碎的纸条。
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                难度 <strong className="font-bold">B1-B2</strong>
              </span>
              <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                目标语言 <strong className="font-bold">English</strong>
              </span>
              <span className="flex items-center gap-1 bg-orange-50 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                时长 <strong className="font-bold">10-15 分钟</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Key Clues */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[14px] flex items-center gap-1.5 text-[#111827]">
              <FileText size={16} className="text-indigo-500" />
              关键线索
            </h3>
            <span className="text-[11px] text-gray-400 flex items-center gap-0.5">查看全部 <ChevronLeft size={12} className="rotate-180"/></span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Clue 1 */}
            <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 flex gap-2.5 items-start">
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <img src="https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=100&h=100" alt="Umbrella" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                  <span className="font-bold text-[12px] text-[#111827]">湿伞</span>
                </div>
                <p className="text-[9px] text-gray-500 leading-tight mb-1.5 line-clamp-2">吧台旁的湿伞，伞柄刻有“L”字母。</p>
                <div className="flex items-center gap-1 text-emerald-500 text-[9px] font-medium bg-emerald-50 w-max px-1.5 py-0.5 rounded">
                  <Target size={10} /> 已发现
                </div>
              </div>
            </div>

            {/* Clue 2 */}
            <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 flex gap-2.5 items-start">
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <img src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=100&h=100" alt="Cups" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                  <span className="font-bold text-[12px] text-[#111827]">三只杯子</span>
                </div>
                <p className="text-[9px] text-gray-500 leading-tight mb-1.5 line-clamp-2">桌上有三只杯子，第三只仍有余温。</p>
                <div className="flex items-center gap-1 text-emerald-500 text-[9px] font-medium bg-emerald-50 w-max px-1.5 py-0.5 rounded">
                  <Target size={10} /> 已发现
                </div>
              </div>
            </div>

            {/* Clue 3 */}
            <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 flex gap-2.5 items-start">
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative">
                <img src="https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=100&h=100" alt="Note" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-[#fbbf24]/10"></div>
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-4 h-4 rounded-full bg-orange-400 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                  <span className="font-bold text-[12px] text-[#111827]">撕碎纸条</span>
                </div>
                <p className="text-[9px] text-gray-500 leading-tight mb-1.5 line-clamp-2">纸条碎片拼出部分字母：“meet... 9... price?”</p>
                <div className="flex items-center gap-1 text-orange-500 text-[9px] font-medium bg-orange-50 w-max px-1.5 py-0.5 rounded">
                  <Search size={10} /> 待验证
                </div>
              </div>
            </div>

            {/* Clue 4 */}
            <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 flex gap-2.5 items-start">
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative">
                <img src="https://images.unsplash.com/photo-1506784365847-bbad939e9335?auto=format&fit=crop&q=80&w=100&h=100" alt="Sign" className="w-full h-full object-cover opacity-80" />
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-4 h-4 rounded-full bg-orange-400 text-white text-[10px] font-bold flex items-center justify-center">4</span>
                  <span className="font-bold text-[12px] text-[#111827]">关店时间 21:00</span>
                </div>
                <p className="text-[9px] text-gray-500 leading-tight mb-1.5 line-clamp-2">收银台小票显示关店时间为 21:00。</p>
                <div className="flex items-center gap-1 text-orange-500 text-[9px] font-medium bg-orange-50 w-max px-1.5 py-0.5 rounded">
                  <Search size={10} /> 待验证
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Suspects */}
        <section>
          <div className="flex items-center justify-between mb-3 mt-2">
            <h3 className="font-bold text-[14px] flex items-center gap-1.5 text-[#111827]">
              <UserCircle size={16} className="text-purple-500" />
              嫌疑人
            </h3>
            <span className="text-[11px] text-gray-400 flex items-center gap-0.5">查看全部 <ChevronLeft size={12} className="rotate-180"/></span>
          </div>
          
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {/* Suspect 1 */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[130px] flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-100">
                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Anna" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <div className="font-bold text-[12px] text-[#111827]">服务员 Anna</div>
                <div className="flex items-center justify-center gap-1 text-[10px] text-indigo-500 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> 紧张
                </div>
              </div>
              <div className="flex w-full justify-between items-center mt-1">
                <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">不在场证明</span>
                <MessageCircle size={14} className="text-gray-400" />
              </div>
            </div>

            {/* Suspect 2 */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[130px] flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-100">
                <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100&h=100" alt="Leo" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <div className="font-bold text-[12px] text-[#111827]">合伙人 Leo</div>
                <div className="flex items-center justify-center gap-1 text-[10px] text-blue-500 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 冷静
                </div>
              </div>
              <div className="flex w-full justify-between items-center mt-1">
                <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100">口供矛盾</span>
                <MessageCircle size={14} className="text-gray-400" />
              </div>
            </div>

            {/* Suspect 3 */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[130px] flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-100">
                <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100&h=100" alt="Mina" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <div className="font-bold text-[12px] text-[#111827]">常客 Mina</div>
                <div className="flex items-center justify-center gap-1 text-[10px] text-orange-500 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> 焦虑
                </div>
              </div>
              <div className="flex w-full justify-between items-center mt-1">
                <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">可追问</span>
                <MessageCircle size={14} className="text-gray-400" />
              </div>
            </div>
          </div>
        </section>

        {/* Timeline & Graph */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Timeline */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[12px] flex items-center gap-1 text-[#111827]">
                <Clock size={14} className="text-blue-500" />
                时间线
              </h3>
              <span className="text-[9px] text-gray-400 flex items-center">查看全部 <ChevronLeft size={10} className="rotate-180"/></span>
            </div>
            <div className="flex flex-col gap-3 relative before:absolute before:left-[3px] before:top-1 before:bottom-1 before:w-px before:bg-indigo-100">
              <div className="flex gap-2 relative">
                <div className="w-2 h-2 rounded-full border-2 border-indigo-400 bg-white z-10 shrink-0 mt-1.5"></div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500">19:30</div>
                  <div className="text-[11px] text-[#111827] mt-0.5 leading-snug">Anna 到店，开始晚班工作</div>
                </div>
              </div>
              <div className="flex gap-2 relative">
                <div className="w-2 h-2 rounded-full border-2 border-indigo-400 bg-white z-10 shrink-0 mt-1.5"></div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500">20:15</div>
                  <div className="text-[11px] text-[#111827] mt-0.5 leading-snug">Leo 与老板在办公室交谈</div>
                </div>
              </div>
              <div className="flex gap-2 relative">
                <div className="w-2 h-2 rounded-full border-2 border-indigo-400 bg-white z-10 shrink-0 mt-1.5"></div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500">20:50</div>
                  <div className="text-[11px] text-[#111827] mt-0.5 leading-snug">常客 Mina 离开咖啡馆</div>
                </div>
              </div>
              <div className="flex gap-2 relative">
                <div className="w-2 h-2 rounded-full border-2 border-indigo-400 bg-white z-10 shrink-0 mt-1.5"></div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500">21:00</div>
                  <div className="text-[11px] text-[#111827] mt-0.5 leading-snug">关店时间，店内仅剩老板？</div>
                </div>
              </div>
            </div>
          </div>

          {/* Deduction Graph */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[12px] flex items-center gap-1 text-[#111827]">
                <Share2 size={14} className="text-emerald-500" />
                推理关系板
              </h3>
              <span className="text-[9px] text-gray-400 flex items-center">查看详情 <ChevronLeft size={10} className="rotate-180"/></span>
            </div>
            
            <div className="relative h-40 w-full flex items-center justify-center">
              {/* Central Node */}
              <div className="absolute z-10 bg-indigo-50 border border-indigo-200 text-indigo-700 w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-sm">
                <span className="font-bold text-[11px]">老板</span>
                <span className="text-[8px] scale-90">(受害者)</span>
              </div>
              
              {/* Surrounding Nodes */}
              <div className="absolute top-2 left-2 bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[9px] font-medium border border-emerald-100 z-10 text-center">
                湿伞<br/><span className="text-[8px] scale-90 opacity-70">(线索)</span>
              </div>
              <div className="absolute top-2 right-2 bg-orange-50 text-orange-600 px-2 py-1 rounded text-[9px] font-medium border border-orange-100 z-10 text-center">
                三只杯子<br/><span className="text-[8px] scale-90 opacity-70">(线索)</span>
              </div>
              <div className="absolute bottom-6 left-2 bg-blue-50 text-blue-600 px-2 py-1 rounded text-[9px] font-medium border border-blue-100 z-10 text-center">
                Anna<br/><span className="text-[8px] scale-90 opacity-70">(嫌疑人)</span>
              </div>
              <div className="absolute bottom-6 right-2 bg-blue-50 text-blue-600 px-2 py-1 rounded text-[9px] font-medium border border-blue-100 z-10 text-center">
                Leo<br/><span className="text-[8px] scale-90 opacity-70">(嫌疑人)</span>
              </div>
              <div className="absolute -bottom-1 bg-red-50 text-red-600 px-2 py-1 rounded text-[9px] font-medium border border-red-100 z-10 text-center shadow-sm">
                口供矛盾<br/><span className="text-[8px] scale-90 opacity-70">(矛盾)</span>
              </div>

              {/* SVG Connecting Lines */}
              <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#a78bfa" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="#fb923c" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="50%" y1="50%" x2="25%" y2="70%" stroke="#60a5fa" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="50%" y1="50%" x2="75%" y2="70%" stroke="#60a5fa" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="50%" y1="50%" x2="50%" y2="90%" stroke="#f87171" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Learning Hint */}
        <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 relative overflow-hidden mt-2">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Search size={40} className="text-indigo-500" />
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={14} className="text-indigo-500" />
            <h4 className="font-bold text-[11px] text-indigo-700">学习提示</h4>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-[14px] text-[#111827] flex items-center gap-1">
                When was the last time you saw the owner?
                <PlayCircle size={14} className="text-indigo-400 cursor-pointer" />
              </p>
              <p className="text-[11px] text-gray-500 mt-1">你最后一次见到老板是什么时候？</p>
              <p className="text-[10px] text-gray-400 mt-0.5">使用场景：询问目击时间，确认时间线。</p>
            </div>
            <button className="flex items-center gap-1 bg-white border border-indigo-100 text-indigo-500 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm shrink-0">
              <RefreshCw size={10} /> 换一句
            </button>
          </div>
        </div>

      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-[80px] left-0 w-full px-4 flex gap-2 z-40">
        <button onClick={() => navigate("/game/interrogation/1")} className="flex-1 bg-white text-indigo-600 border border-indigo-100 font-bold py-3 rounded-full shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
          <UserCircle size={18} />
          <span className="text-[13px]">审问嫌疑人</span>
        </button>
        <button className="flex-1 bg-white text-indigo-600 border border-indigo-100 font-bold py-3 rounded-full shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
          <MessageCircle size={18} />
          <span className="text-[13px]">查看对话</span>
        </button>
        <button className="flex-[1.2] bg-[#6d28d9] text-white font-bold py-3 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
          <Lightbulb size={18} />
          <span className="text-[13px]">提交推理</span>
        </button>
      </div>

      {/* Bottom Nav Bar */}
      <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom,16px)] z-50">
        <div className="flex justify-around items-center h-16 px-2">
          <button onClick={() => navigate("/home")} className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-800 transition-colors">
            <Home size={22} />
            <span className="text-[9px] font-bold">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-800 transition-colors">
            <MessageCircle size={22} />
            <span className="text-[9px] font-bold">Chat</span>
          </button>
          <button onClick={() => navigate("/game")} className="flex flex-col items-center gap-1 text-indigo-600 transition-colors relative">
            <Gamepad2 size={24} />
            <span className="text-[9px] font-bold">Game</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-800 transition-colors">
            <Target size={22} />
            <span className="text-[9px] font-bold">Assets</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-800 transition-colors">
            <User size={22} />
            <span className="text-[9px] font-bold">Me</span>
          </button>
        </div>
      </div>
    </div>
  );
}
