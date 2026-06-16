import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MoreHorizontal, Heart, MapPin, Check, Globe, Keyboard, Play } from "lucide-react";
import { motion } from "framer-motion";

// Map characters to the roleplay story template that best fits their scenario.
const CHARACTER_TEMPLATE: Record<string, string> = {
  mia: "cafe_encounter",
  leo: "cafe_encounter",
  xiaoshimei: "qingyun",
};

export default function RoleplayCharacterDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const template = CHARACTER_TEMPLATE[id || ""] || "cafe_encounter";

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="premium w-full min-h-screen bg-[#fdf2f8] flex flex-col font-sans relative text-[#111827] pb-24"
    >
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-[#fdf2f8]/90 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">角色详情</h1>
        <button className="w-8 h-8 flex items-center justify-center text-gray-700">
          <MoreHorizontal size={20} />
        </button>
      </header>

      <main className="flex-1 w-full flex flex-col px-4 pt-2 gap-4">
        
        {/* Profile Info */}
        <div className="flex gap-4 items-start">
          <div className="w-28 h-36 rounded-2xl overflow-hidden shadow-sm shrink-0">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=300" className="w-full h-full object-cover" alt="Mia" />
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex justify-between items-start mb-1">
              <h2 className="font-bold text-[22px] text-[#111827]">Mia</h2>
              <button className="flex items-center gap-1 bg-white border border-pink-100 text-pink-500 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm active:scale-95 transition-transform">
                <Heart size={12} /> 收藏
              </button>
            </div>
            <p className="text-[12px] font-medium text-gray-600 mb-2">咖啡店常客</p>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <span className="bg-pink-100 text-pink-600 text-[9px] px-1.5 py-0.5 rounded font-medium border border-pink-200">恋爱社交</span>
              <span className="bg-pink-50 text-pink-500 text-[9px] px-1.5 py-0.5 rounded font-medium border border-pink-100">轻松</span>
              <span className="bg-pink-50 text-pink-500 text-[9px] px-1.5 py-0.5 rounded font-medium border border-pink-100">B1-B2</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              25岁，喜欢旅行和摄影，性格开朗，容易害羞，期待遇见有趣的人。
            </p>
          </div>
        </div>

        {/* Current Scene */}
        <section className="mt-2">
          <h3 className="font-bold text-[13px] text-gray-600 mb-2">当前场景</h3>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center shrink-0 border border-white">
              <MapPin size={20} className="text-pink-500" />
            </div>
            <div className="flex flex-col flex-1">
              <h4 className="font-bold text-[14px] text-[#111827] mb-1">咖啡店初次见面</h4>
              <p className="text-[11px] text-gray-500 leading-snug">
                你走近常去喝咖啡的店，发现她正坐在窗边看书...
              </p>
            </div>
          </div>
        </section>

        {/* Relationship Status */}
        <section>
          <h3 className="font-bold text-[13px] text-gray-600 mb-2">你们的关系</h3>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center"><Heart size={10} className="text-pink-500 fill-pink-500"/></div>
                <span className="font-bold text-[12px] text-pink-500">初次见面</span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">0/100</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-300 to-pink-500 w-[5%] rounded-full"></div>
            </div>
          </div>
        </section>

        {/* Learning Focus */}
        <section>
          <h3 className="font-bold text-[13px] text-gray-600 mb-2">练习重点</h3>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white grid grid-cols-2 gap-y-3 gap-x-2">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
              <div className="w-4 h-4 rounded-full bg-pink-100 flex items-center justify-center"><Check size={10} className="text-pink-500"/></div> 自然开场
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
              <div className="w-4 h-4 rounded-full bg-pink-100 flex items-center justify-center"><Check size={10} className="text-pink-500"/></div> 表达好感
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
              <div className="w-4 h-4 rounded-full bg-pink-100 flex items-center justify-center"><Check size={10} className="text-pink-500"/></div> 回应与延伸话题
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
              <div className="w-4 h-4 rounded-full bg-pink-100 flex items-center justify-center"><Check size={10} className="text-pink-500"/></div> 保持边界
            </div>
          </div>
        </section>

        {/* Settings */}
        <section className="flex gap-2">
          <div className="flex-1 bg-white/80 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-white flex flex-col gap-1 items-center justify-center">
            <Globe size={16} className="text-gray-400 mb-1" />
            <span className="text-[10px] text-gray-500">目标语言</span>
            <span className="font-bold text-[13px] text-[#111827]">English</span>
          </div>
          <div className="flex-[1.5] bg-white/80 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-white flex flex-col gap-1 items-center justify-center">
            <Keyboard size={16} className="text-gray-400 mb-1" />
            <span className="text-[10px] text-gray-500">输入方式</span>
            <span className="font-bold text-[13px] text-[#111827]">中文/英文/混合</span>
          </div>
          <div className="flex-1 bg-white/80 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-white flex flex-col gap-1 items-center justify-center">
            <MoreHorizontal size={16} className="text-gray-400 mb-1" />
            <span className="text-[10px] text-gray-500">模式</span>
            <span className="font-bold text-[13px] text-[#111827]">文字/语音</span>
          </div>
        </section>

      </main>

      {/* Floating Action Bar */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
        className="fixed bottom-[max(env(safe-area-inset-bottom,16px),16px)] left-0 w-full px-4 z-50 pointer-events-none"
      >
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            onClick={() => navigate(`/game/play/roleplay/${template}`)}
            className="w-full bg-gradient-to-r from-pink-400 to-rose-400 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-pink-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <span className="text-[16px]">开始对话</span>
            <Play size={16} className="fill-white" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
