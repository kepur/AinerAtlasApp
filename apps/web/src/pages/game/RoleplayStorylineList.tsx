import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Filter, BookOpen, Crown } from "lucide-react";
import { motion } from "framer-motion";

export default function RoleplayStorylineList() {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="premium w-full min-h-screen bg-[#fdf2f8] flex flex-col font-sans relative text-[#111827] pb-10"
    >
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-[#fdf2f8]/90 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">系统故事线</h1>
        <div className="flex items-center gap-3 text-gray-700">
          <Search size={20} />
          <Filter size={20} />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 py-2 mt-1">
        <button className="text-[14px] font-bold text-pink-500 border-b-2 border-pink-500 pb-1 shrink-0">全部</button>
        <button className="text-[14px] font-medium text-gray-400 pb-1 shrink-0">仙侠玄幻</button>
        <button className="text-[14px] font-medium text-gray-400 pb-1 shrink-0">现代都市</button>
        <button className="text-[14px] font-medium text-gray-400 pb-1 shrink-0">科幻未来</button>
        <button className="text-[14px] font-medium text-gray-400 pb-1 shrink-0">悬疑推理</button>
      </div>

      {/* Story List */}
      <main className="flex-1 px-4 pt-4 flex flex-col gap-4">
        
        {/* Story 1 */}
        <div onClick={() => navigate("/game/roleplay/chat")} className="bg-white/80 backdrop-blur-md rounded-[24px] p-4 shadow-sm border border-white flex flex-col relative cursor-pointer active:scale-[0.98] transition-transform">
          <div className="absolute top-4 right-4 bg-orange-100 text-orange-500 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Crown size={10} className="fill-orange-400" /> Premium
          </div>
          
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3 shadow-inner border border-white">
            <BookOpen className="text-purple-500" size={24} />
          </div>
          
          <h3 className="font-bold text-[18px] text-[#111827] mb-1">青云重生</h3>
          <p className="text-[12px] font-medium text-purple-500 mb-2">仙侠 · 师门恩怨</p>
          <p className="text-[12px] text-gray-500 leading-relaxed mb-4 line-clamp-2">
            你在青云门修炼多年，一次意外让你重生回到入门之初。面对熟悉的师兄弟和未知的命运...
          </p>
          
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">修仙逆袭</span>
              <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">多分支</span>
              <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">B1-B2</span>
            </div>
            <button className="bg-purple-500 text-white text-[11px] font-bold py-1.5 px-4 rounded-full shadow-md">
              开始故事
            </button>
          </div>
        </div>

        {/* Story 2 */}
        <div onClick={() => navigate("/game/roleplay/chat")} className="bg-white/80 backdrop-blur-md rounded-[24px] p-4 shadow-sm border border-white flex flex-col relative cursor-pointer active:scale-[0.98] transition-transform">
          <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center mb-3 shadow-inner border border-white">
            <BookOpen className="text-pink-500" size={24} />
          </div>
          
          <h3 className="font-bold text-[18px] text-[#111827] mb-1">咖啡馆奇遇</h3>
          <p className="text-[12px] font-medium text-pink-500 mb-2">现代 · 日常社交</p>
          <p className="text-[12px] text-gray-500 leading-relaxed mb-4 line-clamp-2">
            你在一家咖啡馆遇到一个有趣的陌生人。一段意想不到的对话即将展开，你该如何应对？
          </p>
          
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[9px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded border border-pink-100">轻松日常</span>
              <span className="text-[9px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded border border-pink-100">对话流</span>
              <span className="text-[9px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded border border-pink-100">A2-B1</span>
            </div>
            <button className="bg-pink-500 text-white text-[11px] font-bold py-1.5 px-4 rounded-full shadow-md">
              开始故事
            </button>
          </div>
        </div>

      </main>
    </motion.div>
  );
}
