import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Globe, BarChart2, Clock, Leaf, User, Users, Keyboard, Mic, HelpCircle, Brain, History, CheckCircle2, MessageSquare, Search, Lightbulb, UserCheck, Play, Sparkles, Bookmark, ChevronRight } from "lucide-react";

export default function GameDetail() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col overflow-y-auto pb-32">
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-14 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top,20px)] border-b border-gray-100">
        <button onClick={() => navigate('/game')} className="w-8 h-8 flex items-center justify-center text-[#111827] rounded-full hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="font-extrabold text-[#111827] text-base">
          Game Detail
        </div>
        <div className="h-7 rounded-full bg-gradient-to-r from-[#fef08a] to-[#fde047] flex items-center gap-1 px-2 text-[#b45309] text-[11px] font-bold shadow-sm">
          <Flame size={12} className="text-[#ea580c]" /> 连续学习 12
        </div>
      </header>

      <main className="px-4 py-4 flex flex-col gap-5">
        {/* Hero Banner */}
        <div className="w-full h-48 rounded-[24px] relative overflow-hidden shadow-md">
          <img 
            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800&h=400" 
            alt="Hero" 
            className="w-full h-full object-cover mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2e1065]/90 via-[#4c1d95]/70 to-[#4c1d95]/30 pointer-events-none"></div>
          
          <div className="absolute inset-0 p-5 flex flex-col justify-end">
            <h1 className="text-white text-3xl font-black mb-1 drop-shadow-md tracking-tight">消失的乘客</h1>
            <p className="text-white/90 text-sm font-medium mb-3 drop-shadow-sm">海龟汤 · Situation Puzzle</p>
            <div className="flex justify-between items-end">
              <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20 shadow-sm">
                Solo / Party
              </span>
            </div>
          </div>
          
          <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/30 transition-colors">
            <Search size={16} />
          </button>
        </div>

        {/* Info Cards Row */}
        <div className="flex gap-2">
          <div className="flex-1 bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 flex flex-col gap-1.5 items-center justify-center text-center">
            <Globe size={16} className="text-[#8b5cf6]" />
            <div>
              <div className="text-[9px] text-[#6b7280]">目标语言</div>
              <div className="text-xs font-bold text-[#111827]">English</div>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 flex flex-col gap-1.5 items-center justify-center text-center">
            <BarChart2 size={16} className="text-[#6366f1]" />
            <div>
              <div className="text-[9px] text-[#6b7280]">难度</div>
              <div className="text-xs font-bold text-[#111827]">B1</div>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 flex flex-col gap-1.5 items-center justify-center text-center">
            <Clock size={16} className="text-[#8b5cf6]" />
            <div>
              <div className="text-[9px] text-[#6b7280]">预计时长</div>
              <div className="text-xs font-bold text-[#111827]">8-12 分钟</div>
            </div>
          </div>
          <div className="flex-1 bg-[#f0fdf4] rounded-xl p-2.5 shadow-sm border border-[#dcfce3] flex flex-col gap-1.5 items-center justify-center text-center">
            <Leaf size={16} className="text-[#22c55e]" />
            <div>
              <div className="text-[9px] text-[#166534]">AI 成本</div>
              <div className="text-xs font-bold text-[#15803d]">低</div>
            </div>
          </div>
        </div>

        {/* Mode Toggles */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-[#f5f3ff] text-[#8b5cf6] border border-[#ede9fe] shadow-sm transition-colors">
              <User size={16} /> Solo
            </button>
            <button className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-white text-[#6b7280] border border-gray-200 hover:bg-gray-50 transition-colors">
              <Users size={16} /> Party
            </button>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-[#f5f3ff] text-[#8b5cf6] border border-[#ede9fe] shadow-sm transition-colors">
              <Keyboard size={16} /> 文字模式
            </button>
            <button className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-white text-[#6b7280] border border-gray-200 hover:bg-gray-50 transition-colors">
              <Mic size={16} /> 语音模式
            </button>
          </div>
        </div>

        {/* Section: 学习重点 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-[#8b5cf6] rounded-full"></div>
            <h3 className="font-bold text-[#111827]">学习重点</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="bg-[#f5f3ff] text-[#6d28d9] px-3 py-1.5 rounded-full text-xs font-bold border border-[#ede9fe] flex items-center gap-1.5">
              <HelpCircle size={14} className="text-[#8b5cf6]" /> 提问句
            </span>
            <span className="bg-[#f5f3ff] text-[#6d28d9] px-3 py-1.5 rounded-full text-xs font-bold border border-[#ede9fe] flex items-center gap-1.5">
              <Brain size={14} className="text-[#8b5cf6]" /> 推理表达
            </span>
            <span className="bg-[#f5f3ff] text-[#6d28d9] px-3 py-1.5 rounded-full text-xs font-bold border border-[#ede9fe] flex items-center gap-1.5">
              <History size={14} className="text-[#8b5cf6]" /> 过去时
            </span>
            <span className="bg-[#f5f3ff] text-[#6d28d9] px-3 py-1.5 rounded-full text-xs font-bold border border-[#ede9fe] flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[#8b5cf6]" /> Yes/No Questions
            </span>
          </div>
        </section>

        {/* Section: 故事背景 */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-[#8b5cf6] rounded-full"></div>
            <h3 className="font-bold text-[#111827]">故事背景</h3>
          </div>
          <p className="text-sm text-[#4b5563] leading-relaxed">
            一名男子上了火车，在旅途中神秘消失。没人看到他下车，也没有人知道他去了哪里。发生了什么？
          </p>
        </section>

        {/* Section: 你将学到 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-[#8b5cf6] rounded-full"></div>
            <h3 className="font-bold text-[#111827]">你将学到</h3>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { icon: MessageSquare, title: "Did he...?", desc: "练习提出假设性问题" },
              { icon: Search, title: "Was it related to...?", desc: "练习因果与关联推理表达" },
              { icon: Lightbulb, title: "I think the answer is...", desc: "练习给出推理论证" },
              { icon: UserCheck, title: "How to ask better detective-style questions", desc: "学习更有效的追问技巧" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0">
                  <item.icon size={16} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#111827] text-sm leading-tight">{item.title}</h4>
                  <p className="text-[11px] text-[#6b7280] mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight size={16} className="text-[#d1d5db] shrink-0" />
              </div>
            ))}
          </div>
        </section>

        {/* Section: 适合人群 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-[#8b5cf6] rounded-full"></div>
            <h3 className="font-bold text-[#111827]">适合人群</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="bg-white text-[#6b7280] px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 flex items-center gap-1.5">
              <Search size={14} className="text-[#8b5cf6]" /> 喜欢推理
            </span>
            <span className="bg-white text-[#6b7280] px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8b5cf6]"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
               社恐友好
            </span>
            <span className="bg-white text-[#6b7280] px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8b5cf6]"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
              可中英混输
            </span>
            <span className="bg-white text-[#6b7280] px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 flex items-center gap-1.5">
              <Clock size={14} className="text-[#8b5cf6]" /> 碎片化学习
            </span>
          </div>
        </section>

        {/* Section: 开局预览 */}
        <section className="mt-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-[#8b5cf6] rounded-full"></div>
            <h3 className="font-bold text-[#111827]">开局预览</h3>
          </div>
          
          <div className="bg-gradient-to-r from-[#f5f3ff] to-white rounded-2xl p-4 shadow-sm border border-[#ede9fe] flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-white shadow-sm border border-[#ede9fe] flex items-center justify-center text-3xl">
              🤖
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-bold text-sm text-[#111827]">AI Host</span>
                <span className="bg-[#ede9fe] text-[#8b5cf6] text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider">AI</span>
              </div>
              <p className="text-xs text-[#4b5563] leading-relaxed">
                欢迎来到《消失的乘客》，我是你的 AI Host。请记住：你可以问任何“是/否”或“相关性”的问题来揭开真相。
              </p>
            </div>
            <button className="w-10 h-10 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0 shadow-md hover:bg-[#7c3aed] transition-colors active:scale-95">
              <Play size={16} className="ml-0.5 fill-current" />
            </button>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={() => navigate('/game/play/turtle_soup/passenger')} className="flex-1 h-12 rounded-2xl bg-[#8b5cf6] text-white font-bold flex items-center justify-center gap-2 shadow-md hover:bg-[#7c3aed] transition-colors active:scale-95">
              <Sparkles size={18} /> 开始游戏
            </button>
            <button className="flex-1 h-12 rounded-2xl bg-white text-[#8b5cf6] font-bold flex items-center justify-center gap-2 shadow-sm border border-[#8b5cf6] hover:bg-[#f5f3ff] transition-colors active:scale-95">
              <Bookmark size={18} /> 收藏 / 稍后玩
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
