import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, MoreHorizontal, Leaf, Bot, Volume2, Search, Send, Keyboard, Info, CheckCircle2, Mic } from "lucide-react";
import { motion } from "framer-motion";

export default function RoleplayChat() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="premium w-full h-full bg-[#fdf2f8] flex flex-col font-sans relative text-[#111827] overflow-hidden"
    >
      {/* Header */}
      <header className="px-4 pt-[env(safe-area-inset-top,20px)] h-16 flex items-center justify-between bg-[#fdf2f8]/90 backdrop-blur-md z-50 shrink-0">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <h1 className="font-bold text-[16px] text-[#111827]">青云重生</h1>
        </div>
        <button className="w-8 h-8 flex items-center justify-center text-gray-700">
          <MoreHorizontal size={20} />
        </button>
      </header>

      {/* Chapters Strip */}
      <div className="px-4 py-2 bg-white flex items-center gap-2 shrink-0 border-b border-gray-100 overflow-x-auto no-scrollbar">
        <button className="px-4 py-1.5 text-[11px] font-bold rounded-full transition-all bg-pink-100 text-pink-600 shrink-0 border border-pink-200">
          T1 开场
        </button>
        <button className="px-4 py-1.5 text-[11px] font-medium rounded-full transition-all text-gray-400 bg-gray-50 shrink-0 border border-gray-100">
          T2 试探
        </button>
        <button className="px-4 py-1.5 text-[11px] font-medium rounded-full transition-all text-gray-400 bg-gray-50 shrink-0 border border-gray-100">
          T3 变故
        </button>
      </div>

      {/* Main Scrollable Area */}
      <main className="flex-1 overflow-y-auto w-full flex flex-col no-scrollbar bg-[#fdfdfdf] pb-40">
        
        {/* Learning HUD */}
        <div className="p-4 flex gap-3 overflow-x-auto no-scrollbar shrink-0">
          <div className="min-w-[200px] flex-1 bg-pink-50/80 border border-pink-100/50 rounded-2xl p-3 shadow-sm relative">
            <div className="flex items-center gap-1.5 text-pink-600 mb-2">
              <Leaf size={14} />
              <span className="text-[11px] font-bold">自然表达</span>
            </div>
            <h3 className="font-bold text-[14px] text-[#111827] leading-tight mb-1">Long time no see. How have you been?</h3>
            <p className="text-[11px] text-gray-500 mb-2">好久不见。你...最近还好吗？</p>
            <span className="inline-flex items-center gap-1 bg-pink-100 text-pink-600 text-[9px] font-bold px-2 py-0.5 rounded border border-pink-200">
              重逢开场句
            </span>
          </div>

          <div className="min-w-[200px] flex-1 bg-indigo-50/80 border border-indigo-100/50 rounded-2xl p-3 shadow-sm relative">
            <div className="flex items-center gap-1.5 text-indigo-600 mb-2">
              <Bot size={14} />
              <span className="text-[11px] font-bold">Agent 简析</span>
            </div>
            <h3 className="font-bold text-[13px] text-[#111827] mb-1">语气试探，拉近距离</h3>
            <p className="text-[10px] text-gray-500 leading-snug">
              这句话既礼貌又带有关心，适合用来试探对方目前的态度和状况，而不会显得过于突兀。
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="px-4 flex flex-col gap-5 pb-4">
          
          {/* User Message */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
            <div className="flex flex-col items-end">
              <div className="bg-gradient-to-r from-pink-400 to-rose-400 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%] relative">
                <p className="text-[13px] leading-relaxed">师妹，好久不见。你...最近还好吗？</p>
              </div>
              <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400">
                14:23 <span className="text-pink-400 font-bold">✓✓</span>
              </div>
            </div>
          </motion.div>

          {/* System Hint Message */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center my-2">
            <div className="bg-gray-100/80 backdrop-blur-sm border border-gray-200/50 px-4 py-2.5 rounded-2xl shadow-sm w-[90%] flex flex-col gap-1.5 items-center text-center">
              <p className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                <span className="text-pink-500 text-[14px]">✧</span> 对方情绪：欣喜、惊讶 <span className="text-pink-500 text-[14px]">✧</span>
              </p>
              <div className="w-full h-[1px] bg-gray-200/50 my-0.5"></div>
              <p className="text-[10px] text-gray-500 flex items-start gap-1 text-left">
                <Info size={12} className="text-amber-500 shrink-0 mt-0.5" />
                <span>提示：对方没有察觉到你被逐出师门，请小心应对。</span>
              </p>
            </div>
          </motion.div>

          {/* AI Message */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100&h=100" className="w-full h-full object-cover" alt="Avatar" />
            </div>
            <div className="flex flex-col items-start max-w-[80%]">
              <div className="text-[10px] text-gray-500 mb-1 ml-1">小师妹</div>
              <div className="bg-white border border-pink-50 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex flex-col gap-2 relative">
                <p className="text-[13px] text-[#111827] font-medium leading-relaxed pr-6">
                  师兄！真的是你！我还以为你下山采办要很久才会回来呢，师父他老人家前几天还念叨你呢！
                </p>
                <button className="absolute top-3 right-3 text-pink-400 active:scale-95 transition-transform">
                  <Volume2 size={16} />
                </button>
              </div>
              <div className="mt-1 text-[9px] text-gray-400 ml-1">14:24</div>
            </div>
          </motion.div>
          
          <div ref={feedEndRef} />
        </div>
      </main>

      {/* Bottom Input Area */}
      <div className="fixed bottom-[max(env(safe-area-inset-bottom,0px),0px)] w-full max-w-md mx-auto bg-white/95 backdrop-blur-md z-40 pb-4 pt-3 border-t border-gray-100 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        
        {/* Current Phase indicator */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 z-50">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
          当前阶段：重逢试探
        </div>

        {/* Choice Chips */}
        <div className="flex flex-col gap-2 px-4 mb-4">
          <button className="w-full text-left bg-[#f8fafc] border border-[#f1f5f9] hover:bg-pink-50 hover:border-pink-200 transition-colors px-4 py-3 rounded-2xl shadow-sm flex items-start gap-3 group">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">A</span>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#111827] group-hover:text-pink-600 transition-colors">礼貌解释</span>
              <span className="text-[10px] text-gray-400 mt-0.5">"其实我这次回来，是有一件重要的事情..."</span>
            </div>
          </button>
          
          <button className="w-full text-left bg-[#f8fafc] border border-[#f1f5f9] hover:bg-pink-50 hover:border-pink-200 transition-colors px-4 py-3 rounded-2xl shadow-sm flex items-start gap-3 group">
            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">B</span>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#111827] group-hover:text-pink-600 transition-colors">转移话题</span>
              <span className="text-[10px] text-gray-400 mt-0.5">"先别说我了，你最近练功怎么样？"</span>
            </div>
          </button>
        </div>

        {/* Custom Input Bar */}
        <div className="px-4 flex items-center gap-3">
          <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-pink-500 bg-gray-50 rounded-full shrink-0 transition-colors border border-gray-100">
            <Keyboard size={18} />
          </button>
          <div className="flex-1 bg-gray-50 flex items-center px-4 py-2.5 rounded-full border border-gray-100 focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100 transition-all">
            <input
              type="text"
              placeholder="自定义回复..."
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-gray-400 text-[#111827] min-w-0"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="text-gray-400 hover:text-pink-500 ml-2">
              <Mic size={16} />
            </button>
          </div>
          <button 
            disabled={!input.trim()}
            className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-md shadow-pink-500/30 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all shrink-0"
          >
            <Send size={16} className="ml-0.5 -mt-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
