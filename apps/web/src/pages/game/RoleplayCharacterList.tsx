import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Filter, Heart, Play } from "lucide-react";
import { motion } from "framer-motion";

export default function RoleplayCharacterList() {
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
        <button onClick={() => navigate("/game")} className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">选择角色</h1>
        <div className="flex items-center gap-3 text-gray-700">
          <Search size={20} />
          <Filter size={20} />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 py-2 mt-1">
        <button className="text-[14px] font-bold text-pink-500 border-b-2 border-pink-500 pb-1 shrink-0">全部</button>
        <button className="text-[14px] font-medium text-gray-400 pb-1 shrink-0">恋爱社交</button>
        <button className="text-[14px] font-medium text-gray-400 pb-1 shrink-0">商务谈判</button>
        <button className="text-[14px] font-medium text-gray-400 pb-1 shrink-0">移民生活</button>
        <button className="text-[14px] font-medium text-gray-400 pb-1 shrink-0">校园大学</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-2 mt-2">
        <button className="bg-white border border-pink-100 text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm flex items-center gap-1">性格 <ChevronLeft size={10} className="-rotate-90 text-gray-400"/></button>
        <button className="bg-white border border-pink-100 text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm flex items-center gap-1">场景 <ChevronLeft size={10} className="-rotate-90 text-gray-400"/></button>
        <button className="bg-white border border-pink-100 text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm flex items-center gap-1">语言 <ChevronLeft size={10} className="-rotate-90 text-gray-400"/></button>
        <button className="bg-white border border-pink-100 text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm flex items-center gap-1">难度 <ChevronLeft size={10} className="-rotate-90 text-gray-400"/></button>
      </div>

      {/* Character List */}
      <main className="flex-1 px-4 pt-4 flex flex-col gap-4">
        
        {/* Character 1 */}
        <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-3 shadow-sm border border-white flex gap-3 relative">
          <div className="w-24 h-[120px] rounded-2xl overflow-hidden shrink-0 shadow-inner">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=300" className="w-full h-full object-cover" alt="Mia" />
          </div>
          <div className="flex flex-col flex-1 py-1">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[18px] text-[#111827]">Mia</h3>
                <span className="bg-pink-100 text-pink-500 text-[9px] font-bold px-1.5 py-0.5 rounded">热门</span>
              </div>
              <Heart size={16} className="text-gray-300" />
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">25岁 | 咖啡店常客</p>
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">性格：轻松外向，说话温柔</p>
            <p className="text-[10px] text-gray-400 line-clamp-1">场景：咖啡店初次见面</p>
            <p className="text-[10px] text-gray-400 line-clamp-1 mb-2">练习重点：开场、回应、表达好感</p>
            <div className="flex gap-1.5 flex-wrap mt-auto">
              <span className="bg-pink-50 text-pink-500 text-[9px] px-1.5 py-0.5 rounded border border-pink-100">恋爱社交</span>
              <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded">轻松</span>
              <span className="bg-indigo-50 text-indigo-500 text-[9px] px-1.5 py-0.5 rounded">B1-B2</span>
            </div>
            <button onClick={() => navigate("/game/roleplay/character/mia")} className="absolute bottom-3 right-3 text-pink-500 text-[12px] font-bold flex items-center gap-0.5">
              进入对话 <ChevronLeft size={12} className="rotate-180" />
            </button>
          </div>
        </div>

        {/* Character 2 */}
        <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-3 shadow-sm border border-white flex gap-3 relative">
          <div className="w-24 h-[120px] rounded-2xl overflow-hidden shrink-0 shadow-inner">
            <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200&h=300" className="w-full h-full object-cover" alt="Leo" />
          </div>
          <div className="flex flex-col flex-1 py-1">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[18px] text-[#111827]">Leo</h3>
                <span className="bg-pink-100 text-pink-500 text-[9px] font-bold px-1.5 py-0.5 rounded">热门</span>
              </div>
              <Heart size={16} className="text-gray-300" />
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">32岁 | 欧洲客户</p>
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">性格：直接、谨慎、喜欢砍价</p>
            <p className="text-[10px] text-gray-400 line-clamp-1">场景：项目商务谈判</p>
            <p className="text-[10px] text-gray-400 line-clamp-1 mb-2">练习重点：解释价值、反驳、让步</p>
            <div className="flex gap-1.5 flex-wrap mt-auto">
              <span className="bg-pink-50 text-pink-500 text-[9px] px-1.5 py-0.5 rounded border border-pink-100">商务谈判</span>
              <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded">正式</span>
              <span className="bg-indigo-50 text-indigo-500 text-[9px] px-1.5 py-0.5 rounded">B2-C1</span>
            </div>
            <button className="absolute bottom-3 right-3 text-pink-500 text-[12px] font-bold flex items-center gap-0.5">
              开始谈判 <ChevronLeft size={12} className="rotate-180" />
            </button>
          </div>
        </div>

        {/* Character 3 */}
        <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-3 shadow-sm border border-white flex gap-3 relative">
          <div className="w-24 h-[120px] rounded-2xl overflow-hidden shrink-0 shadow-inner">
            <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=300" className="w-full h-full object-cover" alt="小师妹" />
          </div>
          <div className="flex flex-col flex-1 py-1">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[18px] text-[#111827]">小师妹</h3>
                <span className="bg-pink-100 text-pink-500 text-[9px] font-bold px-1.5 py-0.5 rounded">推荐</span>
              </div>
              <Heart size={16} className="text-pink-500 fill-pink-500" />
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">19岁 | 青云宗弟子</p>
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">性格：温柔、善良、试探心意</p>
            <p className="text-[10px] text-gray-400 line-clamp-1">场景：后山重逢</p>
            <p className="text-[10px] text-gray-400 line-clamp-1 mb-2">练习重点：情绪表达、保持距离</p>
            <div className="flex gap-1.5 flex-wrap mt-auto">
              <span className="bg-pink-50 text-pink-500 text-[9px] px-1.5 py-0.5 rounded border border-pink-100">仙侠剧情</span>
              <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded">情感</span>
              <span className="bg-indigo-50 text-indigo-500 text-[9px] px-1.5 py-0.5 rounded">B1</span>
            </div>
            <button className="absolute bottom-3 right-3 text-pink-500 text-[12px] font-bold flex items-center gap-0.5">
              进入剧情 <ChevronLeft size={12} className="rotate-180" />
            </button>
          </div>
        </div>

      </main>
    </motion.div>
  );
}
