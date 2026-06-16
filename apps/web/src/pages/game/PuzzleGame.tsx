import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Flame, Volume2, Search, Leaf, Lightbulb, PlayCircle, Puzzle, Info, Mic, Send, RefreshCw, Home, MessageCircle, Gamepad2, Users, User as UserIcon, CheckCircle2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../stores/gameStore";

export default function PuzzleGame() {
  const navigate = useNavigate();
  const { id: templateSlug } = useParams<{ id: string }>();
  const { currentSession, feedItems, createSession, sendTurn, clearCurrent } = useGameStore();
  
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("T2");
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentSession) {
      createSession("turtle_soup", templateSlug || "passenger", { case_id: templateSlug || "passenger" });
    }
    return () => clearCurrent();
  }, []);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedItems]);

  const handleSend = async () => {
    if (!currentSession || !input.trim()) return;
    const q = input.trim();
    setInput("");
    await sendTurn(currentSession.id, "question", q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="premium w-full h-full bg-[#f8f9fc] flex flex-col font-sans relative text-[#111827] overflow-hidden"
    >
      {/* Header */}
      <header className="px-4 pt-[env(safe-area-inset-top,20px)] h-16 flex items-center justify-between bg-white shadow-sm z-50 shrink-0">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2 flex-1 ml-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-xl">🐢</div>
          <div className="flex flex-col">
            <h1 className="font-bold text-[14px] text-[#111827]">海龟汤</h1>
            <p className="text-[9px] text-gray-500">边玩边学，边推理边练表达</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center active:scale-95 transition-transform">
            <Volume2 size={16} />
          </button>
          <div className="flex items-center gap-1 bg-emerald-500 px-2.5 py-1 rounded-full shadow-sm">
            <Flame size={12} className="text-orange-300 fill-orange-300" />
            <span className="text-[10px] font-bold text-white tracking-wide">12 连续学习</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 py-2 bg-white flex items-center justify-between gap-2 shrink-0 border-b border-gray-100">
        {["T1 表面故事", "T2 第一个问题", "T3 关键线索"].map((tab) => {
          const id = tab.split(" ")[0];
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-full transition-all ${
                isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab}
            </button>
          );
        })}
        <button className="w-6 h-6 flex items-center justify-center text-gray-400">
          <Search size={14} />
        </button>
      </div>

      {/* Main Scrollable Area */}
      <main className="flex-1 overflow-y-auto w-full flex flex-col no-scrollbar bg-[#fdfdff] pb-32">
        
        {/* Learning HUD */}
        <div className="p-4 flex gap-3 overflow-x-auto no-scrollbar shrink-0">
          <div className="min-w-[200px] flex-1 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-3 shadow-sm relative">
            <div className="flex items-center gap-1.5 text-indigo-700 mb-2">
              <Leaf size={14} />
              <span className="text-[11px] font-bold">自然表达</span>
            </div>
            <h3 className="font-bold text-[16px] text-[#111827] leading-tight mb-1">Had he tried this soup before?</h3>
            <p className="text-[11px] text-gray-500 mb-3">他以前喝过这个汤吗？</p>
            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-600 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-200">
              <Flame size={10} className="fill-indigo-600"/> 高频问法
            </span>
            <button className="absolute top-3 right-3 w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center active:scale-95 transition-transform">
              <Volume2 size={12} />
            </button>
          </div>

          <div className="min-w-[240px] flex-1 bg-orange-50/50 border border-orange-100/50 rounded-2xl p-3 shadow-sm relative">
            <div className="flex items-center gap-1.5 text-orange-600 mb-1">
              <Lightbulb size={14} />
              <span className="text-[11px] font-bold">为什么这么写</span>
            </div>
            <h3 className="font-bold text-[13px] text-[#111827] mb-1">Had he + 过去分词 + before?</h3>
            <p className="text-[10px] text-gray-500 leading-snug mb-2 pr-6">
              过去完成时，用于询问过去某事是否在另一件过去的事之前发生。
            </p>
            <div className="flex flex-wrap gap-1">
              <span className="bg-orange-100 text-orange-800 text-[9px] px-2 py-0.5 rounded-full">Is it related to...?</span>
              <span className="bg-orange-100 text-orange-800 text-[9px] px-2 py-0.5 rounded-full">Did he...?</span>
              <span className="bg-orange-100 text-orange-800 text-[9px] px-2 py-0.5 rounded-full">Could it be that...?</span>
            </div>
            <button className="absolute top-3 right-3 text-orange-400">
              <Volume2 size={14} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="px-4 flex flex-col gap-4 pb-4">
          
          {/* Story Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-4 shadow-sm border border-indigo-100/50 relative overflow-hidden"
          >
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                <Search size={20} />
              </div>
              <p className="font-bold text-[15px] text-[#111827] leading-relaxed pt-1 pr-16">
                一个男人走进餐厅，点了一碗海龟汤，喝了一口后突然崩溃自杀。为什么？
              </p>
            </div>
            
            <div className="mt-6 flex items-center justify-between relative z-10 bg-white/60 backdrop-blur-sm p-2 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-medium ml-1">已发现线索 2/6</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white"><CheckCircle2 size={10}/></div>
                  <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white"><CheckCircle2 size={10}/></div>
                  <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                </div>
              </div>
              <button className="flex items-center gap-1 bg-white border border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm">
                <Search size={10} /> 查看线索
              </button>
            </div>
            
            {/* Decorative background image */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-40 mix-blend-multiply pointer-events-none">
              <img src="https://images.unsplash.com/photo-1548943487-a2e4f43b4850?auto=format&fit=crop&q=80&w=200&h=200" alt="Soup" className="w-full h-full object-cover rounded-full blur-sm" />
            </div>
          </motion.div>

          {/* Hardcoded messages based on screenshot to match perfectly */}
          <div className="flex flex-col gap-4 mt-2">
            
            {/* User Message */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
              <div className="flex flex-col items-end">
                <div className="bg-[#6d28d9] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%] relative">
                  <p className="text-[13px] leading-relaxed">他以前喝过这个汤吗？</p>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400">
                  23:04 <span className="text-indigo-400 font-bold">✓✓</span>
                </div>
              </div>
            </motion.div>

            {/* AI Host Message */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                <span className="text-lg">🤖</span>
              </div>
              <div className="flex flex-col items-start">
                <div className="bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
                  <p className="text-[13px] text-[#111827] font-medium">Yes.</p>
                  <Volume2 size={14} className="text-indigo-500" />
                </div>
                <div className="mt-1 text-[9px] text-gray-400 ml-1">23:04</div>
              </div>
            </motion.div>

            {/* System/Clue Message */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
                <Puzzle size={16} className="fill-purple-500 text-purple-500" />
              </div>
              <div className="flex flex-col items-start w-full max-w-[80%]">
                <div className="bg-purple-50/50 border border-purple-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm w-full">
                  <p className="text-[13px] font-bold text-purple-900 mb-1">线索：与过去经历有关</p>
                  <p className="text-[11px] text-purple-600">这个线索可以帮助你缩小范围哦！</p>
                </div>
                <div className="w-full flex justify-end mt-1 text-[9px] text-gray-400 pr-1">23:04</div>
              </div>
            </motion.div>

            {/* User Message 2 */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
              <div className="flex flex-col items-end">
                <div className="bg-[#6d28d9] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%] relative">
                  <p className="text-[13px] leading-relaxed">那这碗汤和他过去发生的事有关吗？</p>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400">
                  23:05 <span className="text-indigo-400 font-bold">✓✓</span>
                </div>
              </div>
            </motion.div>
            
            {/* Dynamic feed items mapped if any */}
            {feedItems.map((item, idx) => {
               if (item.sender === "user") {
                 return (
                  <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
                    <div className="flex flex-col items-end">
                      <div className="bg-[#6d28d9] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%] relative">
                        <p className="text-[13px] leading-relaxed">{String(item.content)}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400">
                        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} <span className="text-indigo-400 font-bold">✓✓</span>
                      </div>
                    </div>
                  </motion.div>
                 );
               } else if (item.type === "system") {
                 return (
                  <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
                      <Puzzle size={16} className="fill-purple-500 text-purple-500" />
                    </div>
                    <div className="flex flex-col items-start w-full max-w-[80%]">
                      <div className="bg-purple-50/50 border border-purple-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm w-full">
                        <p className="text-[13px] font-bold text-purple-900">{String(item.content)}</p>
                      </div>
                    </div>
                  </motion.div>
                 );
               } else {
                 return (
                  <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                      <span className="text-lg">🤖</span>
                    </div>
                    <div className="flex flex-col items-start max-w-[80%]">
                      <div className="bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
                        <p className="text-[13px] text-[#111827] font-medium leading-relaxed">{String(item.content)}</p>
                        <Volume2 size={14} className="text-indigo-500 shrink-0" />
                      </div>
                      <div className="mt-1 text-[9px] text-gray-400 ml-1">
                        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </motion.div>
                 );
               }
            })}
            <div ref={feedEndRef} />
          </div>
        </div>
      </main>

      {/* Bottom Input Area */}
      <div className="fixed bottom-[max(env(safe-area-inset-bottom,64px),64px)] w-full max-w-md mx-auto bg-[#f8f9fc] z-40 pb-2">
        {/* Mode Banner */}
        <div className="mx-4 mb-3 bg-indigo-50/80 border border-indigo-100/50 rounded-xl px-3 py-2 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <TargetIcon size={14} className="text-indigo-500" />
            <span className="text-[11px] text-indigo-900 font-bold">当前模式：提问推理</span>
            <span className="text-indigo-200">|</span>
            <span className="text-[11px] text-indigo-600">输入中文 <ChevronRight size={10} className="inline"/> AI 生成英文问题</span>
          </div>
          <Info size={14} className="text-indigo-400" />
        </div>

        {/* Suggestion Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mb-3 pb-1">
          <button className="whitespace-nowrap flex items-center gap-1.5 bg-white border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm active:scale-95 transition-transform">
            <SparklesIcon size={12} className="text-indigo-500" /> Did he...?
          </button>
          <button className="whitespace-nowrap flex items-center gap-1.5 bg-white border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm active:scale-95 transition-transform">
            <SparklesIcon size={12} className="text-indigo-500" /> Was it because...?
          </button>
          <button className="whitespace-nowrap flex items-center gap-1.5 bg-white border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm active:scale-95 transition-transform">
            <SparklesIcon size={12} className="text-indigo-500" /> Is it related to...?
          </button>
          <button className="whitespace-nowrap flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-500 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm active:scale-95 transition-transform">
            <RefreshCw size={12} /> 换一批
          </button>
        </div>

        {/* Input Bar */}
        <div className="px-4 flex items-center gap-3 bg-white mx-4 py-2 rounded-full shadow-md border border-gray-100">
          <button className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-indigo-500 bg-gray-50 rounded-full shrink-0 transition-colors">
            <Mic size={18} />
          </button>
          <input
            type="text"
            placeholder="输入你的问题，中文或英文都可以..."
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-gray-400 text-[#111827] min-w-0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 flex items-center justify-center bg-[#6d28d9] text-white rounded-full shadow-md shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all shrink-0"
          >
            <Send size={16} className="ml-0.5 -mt-0.5" />
          </button>
        </div>
      </div>

      {/* Bottom Nav Bar */}
      <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-[env(safe-area-inset-bottom,16px)] z-50">
        <div className="flex justify-around items-center h-16 px-2">
          <button onClick={() => navigate("/home")} className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-800 transition-colors">
            <Home size={22} />
            <span className="text-[9px] font-bold">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-800 transition-colors">
            <MessageCircle size={22} />
            <span className="text-[9px] font-bold">Chat</span>
          </button>
          <button onClick={() => navigate("/game")} className="flex flex-col items-center gap-1 text-[#6d28d9] transition-colors relative">
            <Gamepad2 size={24} />
            <span className="text-[9px] font-bold">Game</span>
            <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#6d28d9]"></div>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-800 transition-colors">
            <Search size={22} />
            <span className="text-[9px] font-bold">Assets</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-800 transition-colors">
            <UserIcon size={22} />
            <span className="text-[9px] font-bold">Me</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Simple icons mapped correctly for visual accuracy
function TargetIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}
