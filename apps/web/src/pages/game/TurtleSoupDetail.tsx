import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Flame, Globe, BarChart2, Clock, Leaf, Keyboard, Mic, HelpCircle, Brain, History, CheckCircle2, MessageSquare, Search, Lightbulb, User, Users, Play, Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import { useGameStore, GameTemplate } from "../../stores/gameStore";

export default function TurtleSoupDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { loadTemplate } = useGameStore();
  const [tpl, setTpl] = useState<GameTemplate | null>(null);

  useEffect(() => {
    if (!id) return;
    loadTemplate(id).then(setTpl).catch(() => setTpl(null));
  }, [id]);

  // Real template data with sensible fallbacks (keeps the page if API misses).
  const title = tpl?.title || "消失的乘客";
  const subtitle = tpl?.subtitle || "海龟汤 · Situation Puzzle";
  const description = tpl?.description || "一名男子上了火车，在旅途中神秘消失。没人看到他下车，也没有人知道他去了哪里。发生了什么？";
  const coverUrl = tpl?.cover_url || "https://images.unsplash.com/photo-1555581290-955aee470762?auto=format&fit=crop&q=80&w=800&h=400";
  const difficulty = tpl?.difficulty || "B1";
  const minutes = tpl?.estimated_minutes || 10;
  const targetLang = (tpl?.target_language === "en" || !tpl) ? "English" : (tpl?.target_language || "English");
  const learningFocus = (tpl?.learning_focus && tpl.learning_focus.length > 0)
    ? tpl.learning_focus
    : ["提问句", "推理表达", "过去时", "Yes/No Questions"];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="premium w-full min-h-screen bg-[#f8f9fc] flex flex-col font-sans relative text-[#111827] pb-28 overflow-x-hidden"
    >
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 bg-white rounded-full shadow-sm border border-gray-100 active:scale-95 transition-transform">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">Game Detail</h1>
        <div className="flex items-center gap-1 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-100 px-2.5 py-1 rounded-full shadow-sm">
          <Flame size={14} className="text-orange-500 fill-orange-400" />
          <span className="text-[10px] font-bold text-orange-600">连续学习 12</span>
        </div>
      </header>

      <main className="flex-1 w-full px-4 pt-4 pb-32 flex flex-col gap-5">
        
        {/* Banner Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="w-full h-48 rounded-[24px] overflow-hidden relative shadow-lg shadow-indigo-900/10"
        >
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e1b4b] via-[#312e81]/80 to-transparent"></div>
          
          <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform">
            <Search size={16} />
          </div>

          <div className="absolute bottom-5 left-5 flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-white tracking-wide shadow-black/50 drop-shadow-md">{title}</h2>
            <div className="flex items-center gap-2 text-indigo-200 text-[11px] font-medium tracking-wide">
              <span>{subtitle}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full w-max text-[10px] text-white border border-white/20">
              Solo / Party
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="grid grid-cols-4 gap-2"
        >
          <div className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 shadow-sm border border-gray-50">
            <Globe size={18} className="text-indigo-500" />
            <div className="text-[10px] text-gray-400">目标语言</div>
            <div className="text-[11px] font-bold text-[#111827]">{targetLang}</div>
          </div>
          <div className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 shadow-sm border border-gray-50">
            <BarChart2 size={18} className="text-indigo-500" />
            <div className="text-[10px] text-gray-400">难度</div>
            <div className="text-[11px] font-bold text-[#111827]">{difficulty}</div>
          </div>
          <div className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 shadow-sm border border-gray-50">
            <Clock size={18} className="text-indigo-500" />
            <div className="text-[10px] text-gray-400">预计时长</div>
            <div className="text-[11px] font-bold text-[#111827]">{minutes} 分钟</div>
          </div>
          <div className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 shadow-sm border border-gray-50">
            <Leaf size={18} className="text-emerald-500" />
            <div className="text-[10px] text-gray-400">AI 成本</div>
            <div className="text-[11px] font-bold text-[#111827]">低</div>
          </div>
        </motion.div>

        {/* Mode Toggles */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex flex-col gap-3"
        >
          <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-50">
            <button className="flex-1 py-2.5 bg-indigo-50 rounded-xl text-indigo-600 font-bold text-[13px] flex items-center justify-center gap-1.5 transition-colors">
              <User size={16} /> Solo
            </button>
            <button className="flex-1 py-2.5 text-gray-400 font-medium text-[13px] flex items-center justify-center gap-1.5 hover:text-gray-700 transition-colors">
              <Users size={16} /> Party
            </button>
          </div>
          <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-50">
            <button className="flex-1 py-2.5 bg-indigo-50 rounded-xl text-indigo-600 font-bold text-[13px] flex items-center justify-center gap-1.5 transition-colors">
              <Keyboard size={16} /> 文字模式
            </button>
            <button className="flex-1 py-2.5 text-gray-400 font-medium text-[13px] flex items-center justify-center gap-1.5 hover:text-gray-700 transition-colors">
              <Mic size={16} /> 语音模式
            </button>
          </div>
        </motion.div>

        {/* Learning Focus */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
            <h3 className="font-bold text-[15px] text-[#111827]">学习重点</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {learningFocus.map((f, i) => {
              const Icon = [HelpCircle, Brain, History, CheckCircle2][i % 4];
              return (
                <span key={i} className="flex items-center gap-1 bg-white border border-gray-100 shadow-sm px-3 py-1.5 rounded-full text-[11px] font-medium text-gray-700"><Icon size={12} className="text-indigo-500" /> {f}</span>
              );
            })}
          </div>
        </motion.section>

        {/* Story Background */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
            <h3 className="font-bold text-[15px] text-[#111827]">故事背景</h3>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
            {description}
          </p>
        </motion.section>

        {/* What you will learn */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
            <h3 className="font-bold text-[15px] text-[#111827]">你将学到</h3>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { icon: MessageSquare, text: "Did he...?", sub: "练习提出假设性问题" },
              { icon: Search, text: "Was it related to...?", sub: "练习因果与关联推理表达" },
              { icon: Lightbulb, text: "I think the answer is...", sub: "练习给出推理结论" },
              { icon: User, text: "How to ask better detective-style questions", sub: "学习更有效的追问技巧" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-sm border border-gray-50 active:scale-95 transition-transform cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <item.icon size={20} className="text-indigo-500" />
                  </div>
                  <div>
                    <div className="font-bold text-[13px] text-[#111827]">{item.text}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{item.sub}</div>
                  </div>
                </div>
                <ChevronLeft size={16} className="text-gray-300 rotate-180 shrink-0" />
              </div>
            ))}
          </div>
        </motion.section>

        {/* Suitable For */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
            <h3 className="font-bold text-[15px] text-[#111827]">适合人群</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1 bg-indigo-50/50 border border-indigo-100/50 px-3 py-1.5 rounded-full text-[11px] font-medium text-indigo-700"><Search size={12}/> 喜欢推理</span>
            <span className="flex items-center gap-1 bg-indigo-50/50 border border-indigo-100/50 px-3 py-1.5 rounded-full text-[11px] font-medium text-indigo-700"><User size={12}/> 社恐友好</span>
            <span className="flex items-center gap-1 bg-indigo-50/50 border border-indigo-100/50 px-3 py-1.5 rounded-full text-[11px] font-medium text-indigo-700"><Globe size={12}/> 可中英混输</span>
            <span className="flex items-center gap-1 bg-indigo-50/50 border border-indigo-100/50 px-3 py-1.5 rounded-full text-[11px] font-medium text-indigo-700"><Clock size={12}/> 碎片化学习</span>
          </div>
        </motion.section>

        {/* Opening Preview */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
            <h3 className="font-bold text-[15px] text-[#111827]">开局预览</h3>
          </div>
          <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100/50 flex items-start gap-3 relative">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200 overflow-hidden">
              <span className="text-xl">🤖</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-bold text-[12px] text-indigo-900">AI Host</span>
                <span className="bg-indigo-100 text-indigo-600 text-[8px] font-bold px-1 rounded uppercase tracking-wider">AI</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed pr-8">
                欢迎来到《{title}》，我是你的 AI Host。请记住：你可以问任何“是/否”或“相关性”的问题来揭开真相。
              </p>
            </div>
            <button className="absolute top-1/2 -translate-y-1/2 right-4 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform">
              <Play size={14} className="ml-0.5 fill-white" />
            </button>
          </div>
        </motion.section>

      </main>

      {/* Floating Action Bar */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
        className="fixed bottom-[max(env(safe-area-inset-bottom,16px),16px)] left-0 w-full px-4 z-50 pointer-events-none"
      >
        <div className="max-w-md mx-auto flex gap-3 pointer-events-auto">
          <button 
            onClick={() => navigate("/game/play/turtle_soup/" + (id || "passenger"))}
            className="flex-[2] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <span className="text-[16px]">开始游戏</span>
          </button>
          <button className="flex-1 bg-white text-indigo-600 border border-indigo-100 font-bold py-3.5 rounded-2xl shadow-lg shadow-gray-200/50 flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all">
            <Bookmark size={16} />
            <span className="text-[10px]">收藏 / 稍后玩</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
