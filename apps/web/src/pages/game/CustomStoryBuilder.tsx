import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, HelpCircle, Sparkles, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function CustomStoryBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialPrompt = (location.state as { prompt?: string } | null)?.prompt || "";
  const [text, setText] = useState(initialPrompt);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="premium w-full min-h-screen bg-[#fdf2f8] flex flex-col font-sans relative text-[#111827]"
    >
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-[#fdf2f8]/90 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">创建自定义故事线</h1>
        <button className="w-8 h-8 flex items-center justify-center text-gray-400">
          <HelpCircle size={20} />
        </button>
      </header>

      <main className="flex-1 px-4 pt-4 flex flex-col gap-5 pb-32">
        
        {/* Helper Banner */}
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 flex gap-3 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-pink-100 rounded-full blur-xl opacity-50"></div>
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-pink-100 shadow-sm z-10">
            <Sparkles size={14} className="text-pink-500" />
          </div>
          <div className="flex flex-col z-10">
            <h3 className="font-bold text-[13px] text-[#111827] mb-1">不知道怎么写？</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              只需输入一两句话，比如：“我是青云宗大弟子，前世被背叛，现在重生归来复仇。” AI 就会自动补全世界观和角色设定！
            </p>
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white flex flex-col">
          <h3 className="font-bold text-[14px] text-[#111827] mb-3">故事背景与设定</h3>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：我是青云宗大弟子，上一世被小师妹背叛..."
            className="w-full h-40 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-[13px] leading-relaxed resize-none focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-50 transition-all placeholder:text-gray-400"
          ></textarea>

          <div className="flex justify-between items-center mt-3">
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full active:scale-95 transition-transform hover:bg-gray-100">
                <ImageIcon size={12} /> 上传参考图
              </button>
            </div>
            <span className="text-[10px] font-medium text-gray-400">{text.length}/500</span>
          </div>
        </div>

        {/* Quick Tags */}
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="font-bold text-[13px] text-gray-600 px-1">灵感标签</h3>
          <div className="flex flex-wrap gap-2">
            {["修仙逆袭", "霸总文学", "星际探索", "赛博朋克", "末日生存", "宫斗权谋"].map((tag, i) => (
              <button key={i} className="bg-white border border-pink-50 text-gray-600 px-4 py-2 rounded-full text-[12px] font-medium shadow-sm hover:border-pink-200 hover:text-pink-600 transition-colors">
                {tag}
              </button>
            ))}
          </div>
        </div>

      </main>

      {/* Floating Action Bar */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
        className="fixed bottom-[max(env(safe-area-inset-bottom,16px),16px)] left-0 w-full px-4 z-50 pointer-events-none"
      >
        <div className="max-w-md mx-auto pointer-events-auto">
          <button 
            onClick={() => navigate("/game/roleplay/generated-setting", { state: { prompt: text } })}
            disabled={text.length < 5}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-pink-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
          >
            <Sparkles size={16} className="fill-white" />
            <span className="text-[16px]">AI 一键生成设定</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
