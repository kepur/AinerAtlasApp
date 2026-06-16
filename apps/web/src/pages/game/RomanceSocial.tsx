import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Coffee, Heart, CalendarHeart, Shield, Volume2, Puzzle, MapPin, CheckCheck, Star, Mic, Send, Smile, ShieldAlert } from "lucide-react";

export default function RomanceSocial() {
  const navigate = useNavigate();

  return (
    <div className="premium w-full h-full bg-gradient-to-b from-[#fdf2f8] via-[#fff1f2] to-[#fce7f3] text-[#111827] flex flex-col relative overflow-hidden font-sans">
      
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-pink-200/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[20%] left-[-20%] w-[400px] h-[400px] bg-rose-200/40 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 px-4 pt-[env(safe-area-inset-top,20px)] shrink-0 flex items-center justify-between h-14">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center text-[#111827] rounded-full bg-white/60 backdrop-blur-sm shadow-sm hover:bg-white/80 transition-colors shrink-0">
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex flex-col items-center flex-1">
          <div className="font-serif font-extrabold text-[#111827] text-xl flex items-center gap-1">
            Romance Social<Heart className="fill-pink-400 text-pink-400" size={14} />
          </div>
          <div className="text-[10px] text-[#6b7280] font-medium tracking-wide">恋爱社交表达练习</div>
        </div>

        <button className="flex items-center gap-1 bg-gradient-to-r from-orange-50 to-orange-100 px-2.5 py-1.5 rounded-full border border-orange-200 shadow-sm shrink-0">
          <Flame className="fill-orange-500 text-orange-500" size={14} />
          <span className="text-[10px] font-bold text-[#c2410c]">7 天连胜 &gt;</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="relative z-50 px-4 mt-2 shrink-0">
        <div className="flex justify-between items-center bg-white/40 backdrop-blur-md rounded-2xl p-1 shadow-sm border border-white/50">
          <button className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-bold py-2 rounded-xl bg-white text-pink-500 shadow-sm relative">
            <Coffee size={14} className="text-pink-400" /> 暖场
            <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-8 h-1 bg-pink-400 rounded-full"></div>
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium py-2 rounded-xl text-[#6b7280]">
            <Heart size={14} /> 暧昧
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium py-2 rounded-xl text-[#6b7280]">
            <CalendarHeart size={14} /> 约会
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium py-2 rounded-xl text-[#6b7280]">
            <Shield size={14} /> 边界
          </button>
        </div>
      </div>

      <main className="flex-1 w-full overflow-y-auto px-4 pt-4 pb-48 flex flex-col gap-4 no-scrollbar relative z-10">
        
        {/* Learning Cards */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
          {/* Card 1: Expression */}
          <div className="w-[240px] shrink-0 bg-white/80 backdrop-blur-xl rounded-[24px] p-4 shadow-sm border border-white flex flex-col relative">
            <div className="flex items-center gap-1.5 text-pink-500 font-bold text-[11px] mb-3">
              <Star size={12} className="fill-pink-400" /> 自然表达
            </div>
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-serif font-bold text-[#111827] text-2xl leading-tight pr-2">
                You seem really easy to talk to.
              </h2>
              <button className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 shrink-0 hover:bg-pink-200 transition-colors">
                <Volume2 size={20} />
              </button>
            </div>
            <p className="text-[13px] text-[#4b5563] mb-4">你看起来真的很容易聊天。</p>
            
            <div className="border-t border-dashed border-gray-200 pt-3 mt-auto">
              <div className="flex items-center gap-1.5 text-pink-400 font-bold text-[11px] mb-2">
                <Puzzle size={12} className="fill-pink-200" /> 句型消消乐
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                <span className="bg-pink-50 text-pink-600 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap border border-pink-100">You seem...</span>
                <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap border border-purple-100">Would you like to...?</span>
                <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap border border-orange-100">I like how...</span>
              </div>
            </div>
          </div>

          {/* Card 2: Explanation */}
          <div className="w-[200px] shrink-0 bg-white/80 backdrop-blur-xl rounded-[24px] p-4 shadow-sm border border-white flex flex-col">
             <div className="flex items-center gap-1.5 text-pink-500 font-bold text-[11px] mb-4">
              <LightbulbIcon className="text-pink-400" /> 为什么这么说
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <MenuIcon className="text-pink-400 mt-0.5" />
                <div>
                  <div className="text-[11px] font-bold text-[#111827]">句型结构</div>
                  <div className="text-[10px] text-[#4b5563] leading-snug">主语 + seem + 形容词 + to talk to</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Heart size={14} className="fill-pink-400 text-pink-400 mt-0.5" />
                <div>
                  <div className="text-[11px] font-bold text-[#111827]">语气与感觉</div>
                  <div className="text-[10px] text-[#4b5563] leading-snug">轻松、友好，传递好感，降低聊天压力</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Coffee size={14} className="text-pink-400 mt-0.5" />
                <div>
                  <div className="text-[11px] font-bold text-[#111827]">使用场景</div>
                  <div className="text-[10px] text-[#4b5563] leading-snug">初次见面，开启轻松对话营造舒适氛围</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Context Bar */}
        <div className="flex justify-between items-center bg-white/60 backdrop-blur-md rounded-full py-1.5 px-3 border border-white/50 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#4b5563]">
            <MapPin size={14} className="text-pink-500" /> 场景：咖啡店初次见面
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#4b5563]">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100" alt="Mia" className="w-5 h-5 rounded-full object-cover" />
            Mia · 25 · 轻松外向 &gt;
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex flex-col gap-4 mt-2">
          {/* User Message */}
          <div className="flex justify-end gap-2 items-end">
            <Heart size={14} className="text-pink-300" />
            <div className="bg-[#f3e8ff] text-[#4c1d95] p-3 rounded-2xl rounded-tr-sm shadow-sm border border-[#e9d5ff] max-w-[80%] relative">
              <span className="text-[13px] leading-relaxed">我觉得你看起来很有趣</span>
              <div className="flex justify-end items-center gap-1 mt-1">
                <span className="text-[9px] text-[#9333ea]/60">09:36</span>
                <CheckCheck size={12} className="text-[#9333ea]/60" />
              </div>
            </div>
          </div>

          {/* AI Message */}
          <div className="flex gap-2 items-start">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm mt-1">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100" alt="Mia" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-pink-50 max-w-[85%] relative">
              <p className="text-[13px] text-[#111827] leading-relaxed pr-8">
                哈哈，谢谢～你也给人一种很舒服的感觉。平时你也常来这里吗？
              </p>
              <button className="absolute top-3 right-2 text-pink-400 w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center hover:bg-pink-100 transition-colors">
                <Volume2 size={14} />
              </button>
              
              <div className="mt-3 bg-[#fdf2f8] border border-pink-100 rounded-xl p-2 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 text-pink-600 font-bold">
                  <div className="bg-pink-200/50 p-1 rounded-md flex items-center gap-0.5">
                    <Star size={10} className="fill-pink-500 text-pink-500" /> 8 学习点
                  </div>
                  <span className="text-[#6b7280] font-normal ml-1">本轮重点：回应 + 延伸问题（保持对话） &gt;</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Bottom Area */}
      <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-pink-100 pt-3 pb-[env(safe-area-inset-bottom,16px)] flex flex-col gap-3 z-50">
        
        {/* Action Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-600 text-[11px] font-medium shrink-0 shadow-sm active:scale-95 transition-transform">
            <MessageSquareIcon className="text-purple-500" /> 轻松回应
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pink-200 bg-pink-50 text-pink-600 text-[11px] font-medium shrink-0 shadow-sm active:scale-95 transition-transform">
            <Heart size={12} className="fill-pink-500 text-pink-500" /> 表达好感
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-[11px] font-medium shrink-0 shadow-sm active:scale-95 transition-transform">
            <Smile size={12} className="text-orange-500" /> 幽默一点
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-[11px] font-medium shrink-0 shadow-sm active:scale-95 transition-transform">
            <ShieldAlert size={12} className="text-blue-500" /> 保持边界
          </button>
        </div>

        {/* Input Box */}
        <div className="flex items-center gap-3 px-4">
          <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 hover:bg-gray-200 transition-colors">
            <Mic size={20} />
          </button>
          <div className="flex-1 bg-white border border-gray-200 rounded-full h-10 flex items-center px-4 shadow-sm relative overflow-hidden">
            <input type="text" placeholder="输入中文或英文，AI 帮你升级表达..." className="w-full h-full text-[12px] bg-transparent focus:outline-none text-[#111827] placeholder:text-gray-400" />
          </div>
          <button className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white shrink-0 shadow-md hover:opacity-90 transition-opacity active:scale-95 pl-0.5">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple icons for the UI components
function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.5.5 2.8 1.5 3.5.75.75 1.23 1.51 1.41 2.5" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="18" y2="18" />
    </svg>
  );
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
