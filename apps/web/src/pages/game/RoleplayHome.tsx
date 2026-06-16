import { useNavigate } from "react-router-dom";
import { ChevronLeft, Crown, BookOpen, Users, MessageSquareText, PlusSquare, Home, MessageCircle, Gamepad2, User } from "lucide-react";

export default function RoleplayHome() {
  const navigate = useNavigate();

  return (
    <div className="premium w-full h-full bg-[#fdf2f8] flex flex-col font-sans relative overflow-hidden text-[#111827]">
      {/* Background illustration */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-pink-200 to-[#fdf2f8] opacity-50 z-0">
        <img src="https://images.unsplash.com/photo-1544626154-1ea1a60cc849?auto=format&fit=crop&q=80&w=600&h=400" className="w-full h-full object-cover mix-blend-overlay opacity-60" alt="Mountain" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#fdf2f8]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between shrink-0">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 bg-white/50 backdrop-blur-md rounded-full hover:bg-white/80 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <button className="flex items-center gap-1 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-orange-500 shadow-sm border border-white">
          <Crown size={12} className="fill-orange-400" /> Premium
        </button>
      </header>

      {/* Title */}
      <div className="relative z-10 px-6 pt-4 pb-6 shrink-0">
        <h1 className="text-3xl font-bold text-pink-500 font-serif mb-1">Roleplay Adventure</h1>
        <p className="text-gray-500 text-sm font-medium">选择你的故事体验方式</p>
      </div>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-24 flex flex-col gap-4 no-scrollbar">
        
        {/* Card 1: System Storyline */}
        <div onClick={() => navigate("/game/roleplay/storylines")} className="bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-3xl p-4 flex gap-4 cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0 shadow-inner border border-white">
            <BookOpen className="text-orange-400" size={28} />
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="font-bold text-base text-[#111827] mb-1">系统故事线</h3>
            <p className="text-[11px] text-gray-500 mb-2 leading-tight">选择官方设计好的剧情</p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <span className="text-[9px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded border border-pink-100">仙侠重生</span>
              <span className="text-[9px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded border border-pink-100">校园爱情</span>
              <span className="text-[9px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded border border-pink-100">商务谈判</span>
            </div>
            <button className="self-end bg-gradient-to-r from-pink-400 to-rose-400 text-white text-[11px] font-bold py-1.5 px-4 rounded-full shadow-md active:scale-95 transition-transform flex items-center gap-1">
              选择故事 <span className="text-[10px]">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Card 2: Choose Character */}
        <div onClick={() => navigate("/game/roleplay/characters")} className="bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-3xl p-4 flex gap-4 cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0 shadow-inner border border-white">
            <Users className="text-purple-400" size={28} />
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="font-bold text-base text-[#111827] mb-1">选择角色对话</h3>
            <p className="text-[11px] text-gray-500 mb-2 leading-tight">选择一个 AI 角色开始对话</p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <span className="text-[9px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded border border-purple-100">邻家学姐</span>
              <span className="text-[9px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded border border-purple-100">傲娇客户</span>
              <span className="text-[9px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded border border-purple-100">小师妹</span>
            </div>
            <button className="self-end bg-gradient-to-r from-pink-400 to-rose-400 text-white text-[11px] font-bold py-1.5 px-4 rounded-full shadow-md active:scale-95 transition-transform flex items-center gap-1">
              选择角色 <span className="text-[10px]">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Card 3: AI Storytelling */}
        <div onClick={() => navigate("/game/roleplay/chat")} className="bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-3xl p-4 flex gap-4 cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 shadow-inner border border-white">
            <MessageSquareText className="text-blue-400" size={28} />
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="font-bold text-base text-[#111827] mb-1">AI 讲故事</h3>
            <p className="text-[11px] text-gray-500 mb-2 leading-tight">AI 像小说一样推进剧情，向你提问</p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded border border-blue-100">互动剧情</span>
              <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded border border-blue-100">多结局</span>
              <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded border border-blue-100">沉浸体验</span>
            </div>
            <button className="self-end bg-gradient-to-r from-pink-400 to-rose-400 text-white text-[11px] font-bold py-1.5 px-4 rounded-full shadow-md active:scale-95 transition-transform flex items-center gap-1">
              开始故事 <span className="text-[10px]">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Card 4: Custom Story Builder */}
        <div onClick={() => navigate("/game/custom-story-builder")} className="bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-3xl p-4 flex gap-4 cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center shrink-0 shadow-inner border border-white">
            <PlusSquare className="text-pink-400" size={28} />
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="font-bold text-base text-[#111827] mb-1">自定义故事线</h3>
            <p className="text-[11px] text-gray-500 mb-2 leading-tight">输入你的设定，AI 生成完整故事</p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <span className="text-[9px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded border border-pink-100">自由创作</span>
              <span className="text-[9px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded border border-pink-100">专属角色</span>
              <span className="text-[9px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded border border-pink-100">无限可能</span>
            </div>
            <button className="self-end bg-gradient-to-r from-pink-400 to-rose-400 text-white text-[11px] font-bold py-1.5 px-4 rounded-full shadow-md active:scale-95 transition-transform flex items-center gap-1">
              创建故事 <span className="text-[10px]">&rarr;</span>
            </button>
          </div>
        </div>

      </main>

    </div>
  );
}
