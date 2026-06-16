import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Flame, Coffee, Heart, CalendarHeart, Shield, Volume2, Puzzle, MapPin, CheckCheck, Star, Mic, Send, Smile, ShieldAlert, Loader, HeartHandshake } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { motion, AnimatePresence } from "framer-motion";

export default function RomanceSocial() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { createSession, currentSession, sendTurn, feedItems, turnLoading } = useGameStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createSession("romance", undefined, { target_id: id || "mia" });
  }, [id, createSession]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feedItems, turnLoading]);

  const handleSend = async (actionType = "message") => {
    if (!currentSession) return;
    if (actionType === "message" && !input.trim()) return;

    const userInput = input;
    setInput("");
    await sendTurn(currentSession.id, actionType, userInput, { action_type: actionType });
  };

  const target = currentSession?.view?.target as Record<string, any> || {};
  const score = currentSession?.view?.relationship_score as number || 0;
  const phase = currentSession?.phase || "icebreaker";

  const getPhaseStyles = (p: string) => {
    const isActive = phase === p;
    if (p === "icebreaker") return isActive ? "bg-white text-pink-500 font-bold shadow-sm" : "text-[#6b7280]";
    if (p === "flirting") return isActive ? "bg-white text-pink-500 font-bold shadow-sm" : "text-[#6b7280]";
    if (p === "dating") return isActive ? "bg-white text-pink-500 font-bold shadow-sm" : "text-[#6b7280]";
    if (p === "couple") return isActive ? "border-b-2 border-pink-400 text-pink-500 font-bold" : "border-b-2 border-transparent text-gray-400";
    return "text-[#6b7280]";
  };

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
            {target.name || "Romance"}<Heart className="fill-pink-400 text-pink-400" size={14} />
          </div>
          <div className="text-[10px] text-[#6b7280] font-medium tracking-wide">好感度 {score}/100</div>
        </div>

        <button className="flex items-center gap-1 bg-gradient-to-r from-orange-50 to-orange-100 px-2.5 py-1.5 rounded-full border border-orange-200 shadow-sm shrink-0">
          <Flame className="fill-orange-500 text-orange-500" size={14} />
          <span className="text-[10px] font-bold text-[#c2410c]">7 天连胜 &gt;</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="relative z-50 px-4 mt-2 shrink-0">
        <div className="flex justify-between items-center bg-white/40 backdrop-blur-md rounded-2xl p-1 shadow-sm border border-white/50">
          <button className={`flex-1 flex items-center justify-center gap-1.5 text-[12px] py-2 rounded-xl relative ${getPhaseStyles("icebreaker")}`}>
            <Coffee size={14} className={phase === "icebreaker" ? "text-pink-400" : ""} /> 暖场
            {phase === "icebreaker" && <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-8 h-1 bg-pink-400 rounded-full"></div>}
          </button>
          <button className={`flex-1 flex items-center justify-center gap-1.5 text-[12px] py-2 rounded-xl relative ${getPhaseStyles("flirting")}`}>
            <Heart size={14} className={phase === "flirting" ? "text-pink-400" : ""} /> 暧昧
            {phase === "flirting" && <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-8 h-1 bg-pink-400 rounded-full"></div>}
          </button>
          <button className={`flex-1 flex items-center justify-center gap-1.5 text-[12px] py-2 rounded-xl relative ${getPhaseStyles("dating")}`}>
            <CalendarHeart size={14} className={phase === "dating" ? "text-pink-400" : ""} /> 约会
            {phase === "dating" && <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-8 h-1 bg-pink-400 rounded-full"></div>}
          </button>
          <button className={`flex-1 py-3 flex items-center justify-center gap-1.5 ${getPhaseStyles("couple")}`}>
            <HeartHandshake size={16} /> <span>情侣</span>
          </button>
        </div>
      </div>

      <main ref={scrollRef} className="flex-1 w-full overflow-y-auto px-4 pt-4 pb-48 flex flex-col gap-4 no-scrollbar relative z-10">
        
        {!currentSession ? (
           <div className="flex-1 flex items-center justify-center">
             <Loader className="animate-spin text-pink-400" />
           </div>
        ) : (
          <div className="flex flex-col gap-4">
            
            {/* Setting Intro */}
            <div className="flex items-center gap-2 justify-center mt-2 mb-2">
              <MapPin size={12} className="text-pink-400" />
              <span className="text-[11px] font-medium text-pink-500 bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
                场景：{target.initial_scene}
              </span>
            </div>

            <AnimatePresence>
              {feedItems.map((item, idx) => {
                if (item.type === "hint_card") {
                  const breakdown = item.breakdown as string[] | undefined;
                  return (
                    <motion.div key={idx} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
                      <div className="w-[240px] shrink-0 bg-white/80 backdrop-blur-xl rounded-[24px] p-4 shadow-sm border border-white flex flex-col relative">
                        <div className="flex items-center gap-1.5 text-pink-500 font-bold text-[11px] mb-3">
                          <Star size={12} className="fill-pink-400" /> {(item.title as string) || "自然表达"}
                        </div>
                        <div className="flex justify-between items-start mb-2">
                          <h2 className="font-serif font-bold text-[#111827] text-xl leading-tight pr-2">
                            {(item.en as string) || item.text_en}
                          </h2>
                          <button className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 shrink-0 hover:bg-pink-200 transition-colors">
                            <Volume2 size={16} />
                          </button>
                        </div>
                        <p className="text-[13px] text-[#4b5563] mb-4">{(item.zh as string) || (item.text_zh as string)}</p>
                      </div>
                      
                      {breakdown && breakdown.length > 0 && (
                        <div className="w-[200px] shrink-0 bg-white/80 backdrop-blur-xl rounded-[24px] p-4 shadow-sm border border-white flex flex-col">
                           <div className="flex items-center gap-1.5 text-pink-500 font-bold text-[11px] mb-4">
                            <LightbulbIcon className="text-pink-400" /> 为什么这么说
                          </div>
                          <div className="flex flex-col gap-3">
                            {breakdown.map((bd: string, i: number) => (
                               <div key={i} className="flex items-start gap-2">
                                <MenuIcon className="text-pink-400 mt-0.5" />
                                <div className="text-[10px] text-[#4b5563] leading-snug">{bd}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                }

                if (item.type === "user_msg") {
                  return (
                    <motion.div key={idx} initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="flex flex-col items-end w-full pl-12">
                      <div className="bg-gradient-to-br from-purple-100 to-purple-50 text-[#111827] rounded-[24px] rounded-br-sm px-4 py-3 shadow-sm border border-purple-100 relative max-w-full">
                        <p className="text-[14px] leading-relaxed break-words">{item.text}</p>
                        <div className="flex justify-end mt-1.5 text-purple-400 text-[10px] font-medium items-center gap-1">
                          <CheckCheck size={12} />
                        </div>
                        <div className="absolute -left-6 bottom-1 text-pink-300">
                          <Heart size={14} className="fill-transparent" />
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                if (item.type === "char_msg") {
                  const lp = item.learning_point as { title: string; desc: string } | undefined;
                  return (
                    <motion.div key={idx} initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="flex gap-2.5 w-full pr-12">
                      <div className="w-9 h-9 rounded-full bg-pink-100 overflow-hidden shrink-0 shadow-sm border border-white mt-1">
                        {item.speaker_avatar ? (
                          <img src={item.speaker_avatar as string} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                          <div className="w-full h-full bg-pink-200"></div>
                        )}
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="bg-white/90 backdrop-blur-md rounded-[24px] rounded-tl-sm px-4 py-4 shadow-sm border border-pink-50 relative">
                          <p className="text-[14px] leading-relaxed text-[#111827]">{(item.text_zh as string) || item.text}</p>
                          <button className="absolute top-3 right-2 text-pink-400 w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center hover:bg-pink-100 transition-colors">
                            <Volume2 size={14} />
                          </button>
                          
                          {lp && (
                            <div className="mt-3 bg-[#fdf2f8] border border-pink-100 rounded-xl p-2 flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5 text-pink-600 font-bold">
                                <div className="bg-pink-200/50 p-1 rounded-md flex items-center gap-0.5">
                                  <Star size={10} className="fill-pink-500 text-pink-500" /> {lp.title}
                                </div>
                                <span className="text-[#6b7280] font-normal ml-1">{lp.desc}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                return null;
              })}

              {turnLoading && (
                 <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex items-center gap-2 text-pink-400 text-[12px] pl-12 mt-2">
                   <Loader size={14} className="animate-spin" /> {target.name} 正在回复...
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Bottom Area */}
      <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-pink-100 pt-3 pb-[env(safe-area-inset-bottom,16px)] flex flex-col gap-3 z-50">
        
        {/* Action Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4">
          <button onClick={() => handleSend("轻松回应")} disabled={turnLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-600 text-[11px] font-medium shrink-0 shadow-sm active:scale-95 transition-transform disabled:opacity-50">
            <MessageSquareIcon className="text-purple-500" /> 轻松回应
          </button>
          <button onClick={() => handleSend("表达好感")} disabled={turnLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pink-200 bg-pink-50 text-pink-600 text-[11px] font-medium shrink-0 shadow-sm active:scale-95 transition-transform disabled:opacity-50">
            <Heart size={12} className="fill-pink-500 text-pink-500" /> 表达好感
          </button>
          <button onClick={() => handleSend("幽默一点")} disabled={turnLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-[11px] font-medium shrink-0 shadow-sm active:scale-95 transition-transform disabled:opacity-50">
            <Smile size={12} className="text-orange-500" /> 幽默一点
          </button>
          <button onClick={() => handleSend("增进感情")} disabled={turnLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50 text-rose-600 text-[11px] font-medium shrink-0 shadow-sm active:scale-95 transition-transform disabled:opacity-50">
            <Flame size={12} className="text-rose-500" /> 增进感情
          </button>
        </div>

        {/* Input Box */}
        <div className="flex items-center gap-3 px-4">
          <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 hover:bg-gray-200 transition-colors">
            <Mic size={20} />
          </button>
          <div className="flex-1 bg-white border border-gray-200 rounded-full h-10 flex items-center px-4 shadow-sm relative overflow-hidden">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend("message")}
              disabled={turnLoading}
              placeholder="输入中文或英文，AI 帮你升级表达..." 
              className="w-full h-full text-[12px] bg-transparent focus:outline-none text-[#111827] placeholder:text-gray-400 disabled:opacity-50" 
            />
          </div>
          <button 
            onClick={() => handleSend("message")}
            disabled={turnLoading || !input.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white shrink-0 shadow-md hover:opacity-90 transition-opacity active:scale-95 pl-0.5 disabled:opacity-50"
          >
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
