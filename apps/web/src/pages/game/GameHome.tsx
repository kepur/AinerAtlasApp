import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Play, Brain, Drama, Search, Briefcase, Heart, Dices, RotateCcw, Users, Bell, Search as SearchIcon, Loader2 } from "lucide-react";
import { useGameStore, GameTemplate } from "../../stores/gameStore";

const GAME_TYPE_PATHS: Record<string, (slug: string) => string> = {
  turtle_soup: (slug) => `/game/play/turtle_soup/${slug}`,
  roleplay: (slug) => `/game/play/roleplay/${slug}`,
  detective: (slug) => `/game/play/detective/${slug}`,
  social_logic: () => `/game/social-logic/new`,
};

const CATEGORY_LIST = [
  { id: "turtle_soup", name: "海龟汤", icon: <Brain size={24} className="text-[#3b82f6]" />, bg: "bg-blue-50/80", b1: "bg-gradient-to-b from-blue-100 to-blue-50" },
  { id: "roleplay", name: "角色扮演", icon: <Drama size={24} className="text-[#8b5cf6]" />, bg: "bg-purple-50/80", b1: "bg-gradient-to-b from-purple-100 to-purple-50" },
  { id: "detective", name: "AI侦探", icon: <Search size={24} className="text-[#eab308]" />, bg: "bg-yellow-50/80", b1: "bg-gradient-to-b from-yellow-100 to-yellow-50" },
  { id: "social_logic", name: "狼人杀", icon: <div className="text-[24px]">🐺</div>, bg: "bg-indigo-50/80", b1: "bg-gradient-to-b from-indigo-100 to-indigo-50" },
  { id: "romance", name: "恋爱社交", icon: <Heart size={24} className="text-[#ec4899]" />, bg: "bg-pink-50/80", b1: "bg-gradient-to-b from-pink-100 to-pink-50" },
];

const GAME_TYPE_ICON: Record<string, React.ReactNode> = {
  turtle_soup: <Brain size={10} className="text-[#3b82f6]" />,
  roleplay: <Drama size={10} className="text-[#8b5cf6]" />,
  detective: <Search size={10} className="text-[#eab308]" />,
  social_logic: <span className="text-[10px]">🐺</span>,
};

const GAME_TYPE_LABEL: Record<string, string> = {
  turtle_soup: "海龟汤",
  roleplay: "角色扮演",
  detective: "AI侦探",
  social_logic: "狼人杀",
};

function templatePath(t: GameTemplate): string {
  const fn = GAME_TYPE_PATHS[t.game_type];
  return fn ? fn(t.slug) : `/game/play/${t.game_type}/${t.slug}`;
}

export default function GameHome() {
  const navigate = useNavigate();
  const { templates, templatesLoading, sessions, loadTemplates, loadSessions } = useGameStore();

  useEffect(() => {
    loadTemplates();
    loadSessions("active");
  }, []);

  const lastSession = sessions[0];

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col overflow-y-auto pb-32 relative">
      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-br from-[#eef2ff] via-[#f5f3ff] to-transparent opacity-80 pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 flex justify-between items-center px-5 h-16 pt-2 bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-md flex items-center justify-center p-2">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-white">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.8" />
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-[20px] font-extrabold text-[#111827] tracking-tight leading-tight">Story Game Forge</h1>
            <p className="text-[10px] text-[#6b7280]">在剧情、推理和角色对话中学习语言</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-[#4b5563] hover:text-[#6366f1] transition-colors">
            <SearchIcon size={18} />
          </button>
        </div>
      </header>

      <main className="px-5 mt-4 relative z-10 flex flex-col gap-6">

        {/* Continue Last Game Banner */}
        {lastSession && (
          <div
            onClick={() => navigate(`/game/play/${lastSession.game_type}/${lastSession.id}`)}
            className="w-full rounded-[24px] relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] cursor-pointer group bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] p-5"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-white/80 font-bold text-xs mb-2">
                <RotateCcw size={14} /> 继续上次游戏
              </div>
              <h2 className="text-xl font-extrabold text-white mb-1">{lastSession.title}</h2>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] text-white/70">
                  {GAME_TYPE_LABEL[lastSession.game_type] || lastSession.game_type}
                </span>
                <span className="text-[11px] text-white/70">
                  回合 {lastSession.turn_count}
                </span>
                <span className="text-[11px] text-white/70">
                  阶段：{lastSession.phase}
                </span>
              </div>
              <button className="self-start bg-white text-[#6366f1] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md hover:bg-white/90 active:scale-95 transition-all">
                继续游戏 <Play size={12} className="ml-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* Categories */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-[#111827]">游戏类型</h3>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORY_LIST.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  const t = templates.find((t) => t.game_type === cat.id);
                  if (t) navigate(templatePath(t));
                  else if (cat.id === "social_logic") navigate("/game/social-logic/new");
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl ${cat.bg} border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-md transition-shadow`}
              >
                <div className={`w-12 h-12 rounded-xl ${cat.b1} flex items-center justify-center mb-1 shadow-inner border border-white/60`}>
                  {cat.icon}
                </div>
                <span className="text-[10px] font-bold text-[#374151] whitespace-nowrap">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Template list from backend */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-[#111827]">推荐游戏</h3>
            {templatesLoading && <Loader2 size={14} className="animate-spin text-[#6b7280]" />}
          </div>

          <div className="flex flex-col gap-3">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(templatePath(t))}
                className="bg-white p-3 rounded-[20px] flex gap-3 shadow-sm border border-[#f3f4f6] cursor-pointer"
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-[#6366f1]/20 to-[#8b5cf6]/10 flex items-center justify-center">
                  {t.cover_url ? (
                    <img src={t.cover_url} alt={t.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-4xl opacity-60">
                      {t.game_type === "turtle_soup" ? "🐢" : t.game_type === "roleplay" ? "🎭" : t.game_type === "detective" ? "🔍" : "🐺"}
                    </div>
                  )}
                </div>
                <div className="flex flex-col flex-1 py-0.5 justify-between">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-[#111827] leading-tight mt-0.5">{t.title}</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-[#8b5cf6] bg-[#f5f3ff]">Solo</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#6b7280] font-medium mt-1">
                    <span className="flex items-center gap-0.5">{GAME_TYPE_ICON[t.game_type]} {GAME_TYPE_LABEL[t.game_type] || t.game_type}</span>
                    <span className="flex items-center gap-0.5">🌐 {t.target_language === "en" ? "English" : t.target_language}</span>
                    <span className="flex items-center gap-0.5 font-bold text-[#111827]">{t.difficulty}</span>
                    <span className="flex items-center gap-0.5">⏱ {t.estimated_minutes} 分钟</span>
                  </div>
                  <div className="text-[10px] text-[#9ca3af] leading-tight line-clamp-2 mt-1">
                    {t.description}
                  </div>
                </div>
              </div>
            ))}

            {!templatesLoading && templates.length === 0 && (
              <div className="text-center text-[#9ca3af] text-sm py-8">
                暂无游戏模板，请检查后端连接
              </div>
            )}
          </div>
        </section>

        {/* Quick Start */}
        <section className="mb-4">
          <h3 className="font-bold text-[#111827] mb-3">快速开始</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => {
                const t = templates[Math.floor(Math.random() * templates.length)];
                if (t) navigate(templatePath(t));
              }}
              className="flex items-center gap-3 bg-gradient-to-br from-[#fdf4ff] to-[#fae8ff] border border-[#f0abfc]/30 p-3 rounded-[20px] shadow-sm shrink-0 w-[160px] active:scale-95 transition-transform text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d946ef] to-[#c026d3] text-white flex items-center justify-center shadow-inner shrink-0">
                <Dices size={20} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#701a75]">随机开局</div>
                <div className="text-[9px] text-[#86198f]">匹配随机游戏</div>
              </div>
            </button>

            <button
              onClick={() => {
                if (lastSession) navigate(`/game/play/${lastSession.game_type}/${lastSession.id}`);
              }}
              className="flex items-center gap-3 bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-[#c4b5fd]/30 p-3 rounded-[20px] shadow-sm shrink-0 w-[160px] active:scale-95 transition-transform text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] text-white flex items-center justify-center shadow-inner shrink-0">
                <RotateCcw size={20} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#4c1d95]">继续上次</div>
                <div className="text-[9px] text-[#5b21b6]">从断点继续</div>
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
