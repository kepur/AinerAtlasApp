import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Brain, Search, Heart, Dices, RotateCcw, Users, Bell, Search as SearchIcon, Loader2, Library } from "lucide-react";
import { useGameStore, GameTemplate } from "../../stores/gameStore";
import "./GameHome.css";

const GAME_TYPE_PATHS: Record<string, (slug: string) => string> = {
  turtle_soup: (slug) => `/game/turtle-soup/detail/${slug}`,
  roleplay: (slug) => `/game/play/roleplay/${slug}`,
  detective: (slug) => `/game/detective-board/${slug}`,
  social_logic: () => `/game/social-logic/new`,
  romance: (slug) => `/game/romance-social/${slug}`,
};

const GAME_TYPE_LABEL: Record<string, string> = {
  turtle_soup: "海龟汤",
  roleplay: "剧本代入",
  detective: "AI侦探",
  social_logic: "狼人杀",
};

const CATEGORY_LIST = [
  { id: "storyline", name: "剧本代入", icon: <Library size={22} className="text-violet-500" />, tint: "from-violet-500/20 to-violet-600/5" },
  { id: "turtle_soup", name: "海龟汤", icon: <Brain size={22} className="text-blue-500" />, tint: "from-blue-500/20 to-blue-600/5" },
  { id: "detective", name: "AI侦探", icon: <Search size={22} className="text-amber-500" />, tint: "from-amber-500/20 to-amber-600/5" },
  { id: "social_logic", name: "狼人杀", icon: <span className="text-[22px] leading-none">🐺</span>, tint: "from-indigo-500/20 to-indigo-600/5" },
  { id: "romance", name: "恋爱社交", icon: <Heart size={22} className="text-pink-500" />, tint: "from-pink-500/20 to-pink-600/5" },
];

const COVER_IMAGES: Record<string, string> = {
  turtle_soup: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=200&h=200",
  roleplay: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?auto=format&fit=crop&q=80&w=200&h=200",
  detective: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=200&h=200",
  social_logic: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200",
};

const BANNER_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuCZlFZQMM21gzuCqg6ZrHEs4Zj4SlTbGQe3EUZXH3c0OKViHpLAFezHanubs7RCpOVCOimlmSL8o2TyGRoN5r3Ti0h67aqOZrosbj9okfLhOSbS9IE5dnq4A-44zrBr8tkHd0ZIV1jaGo727moTZdc9J2cQJh-r9YG3gEED3b8ocLbsBn1vdYMmu7VWDNYdfNUPbWk8BamHOJNw8RrAqCDHiElKTCLLzd6tDz6ef8jhUxfAVrlJg9ldwId9VEM0HC-v3Gs2Nef5Z908";

function templatePath(t: GameTemplate): string {
  const fn = GAME_TYPE_PATHS[t.game_type];
  return fn ? fn(t.slug) : `/game/play/${t.game_type}/${t.slug}`;
}

function sessionPath(gameType: string, id: string): string {
  switch (gameType) {
    case "detective": return `/game/detective-board/${id}`;
    case "romance": return `/game/romance-social/${id}`;
    case "social_logic": return `/game/social-logic/${id}`;
    case "roleplay": return `/game/play/roleplay/${id}`;
    default: return `/game/play/${gameType}/${id}`;
  }
}

export default function GameHome() {
  const navigate = useNavigate();
  const { templates, templatesLoading, sessions, loadTemplates, loadSessions } = useGameStore();

  useEffect(() => {
    loadTemplates();
    loadSessions("active");
  }, [loadTemplates, loadSessions]);

  const lastSession = sessions[0];
  const otherTemplates = templates.filter((t) => t.game_type !== "roleplay");
  const progress = lastSession ? Math.min(lastSession.turn_count * 15, 95) : 0;

  return (
    <div className="premium game-home w-full h-full flex flex-col overflow-y-auto">
      <div className="game-home-aurora" aria-hidden>
        <span />
      </div>

      <header className="game-home-header">
        <div className="flex items-center gap-3">
          <div className="game-home-logo">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-white p-1.5">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.85" />
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="game-home-title">Story Game Forge</h1>
            <p className="game-home-subtitle">在剧情、推理和角色对话中学习语言</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="game-home-icon-btn" aria-label="搜索">
            <SearchIcon size={18} />
          </button>
          <button type="button" className="game-home-icon-btn relative" aria-label="通知">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-slate-900/20" />
          </button>
        </div>
      </header>

      <main className="game-home-main">
        {lastSession && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(sessionPath(lastSession.game_type, lastSession.id))}
            onKeyDown={(e) => e.key === "Enter" && navigate(sessionPath(lastSession.game_type, lastSession.id))}
            className="game-home-continue"
          >
            <img src={BANNER_IMAGE} alt="" />
            <div className="game-home-continue-overlay" />
            <div className="game-home-continue-body">
              <div className="game-home-continue-label">
                <RotateCcw size={14} /> 继续上次游戏
              </div>
              <h2 className="game-home-continue-title">{lastSession.title}</h2>
              <div className="game-home-continue-meta">
                <span>{GAME_TYPE_LABEL[lastSession.game_type] || lastSession.game_type}</span>
                <span>回合 {lastSession.turn_count} · {lastSession.phase}</span>
              </div>
              <div className="game-home-progress">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[10px] font-medium mb-1.5" style={{ color: "var(--gh-text-secondary)" }}>
                    <span>游戏进度</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="game-home-progress-bar">
                    <div className="game-home-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <button type="button" className="game-home-btn-primary flex items-center gap-1">
                  继续 <Play size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="game-home-section-title">游戏类型</h3>
            <span className="game-home-section-meta">全部类型 ›</span>
          </div>
          <div className="game-home-cat-grid">
            {CATEGORY_LIST.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (cat.id === "storyline") navigate("/game/roleplay/storylines");
                  else if (cat.id === "social_logic") navigate("/game/social-logic/new");
                  else if (cat.id === "romance") navigate("/game/romance-social/characters");
                  else if (cat.id === "detective") navigate("/game/detective-board");
                  else if (cat.id === "turtle_soup") navigate("/game/turtle-soup/detail/passenger");
                  else {
                    const t = templates.find((item) => item.game_type === cat.id);
                    if (t) navigate(templatePath(t));
                  }
                }}
                className="game-home-cat-btn"
              >
                <div className={`game-home-cat-icon bg-gradient-to-br ${cat.tint}`}>
                  {cat.icon}
                </div>
                <span className="game-home-cat-label">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="game-home-section-title">推荐游戏</h3>
            {templatesLoading ? (
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--gh-text-muted)" }} />
            ) : (
              <span className="game-home-section-meta">更多推荐 ›</span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {otherTemplates.filter((t) => t.game_type !== "romance").map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(templatePath(t))}
                onKeyDown={(e) => e.key === "Enter" && navigate(templatePath(t))}
                className="game-home-glass game-home-rec-card"
              >
                <div className="game-home-rec-cover">
                  <img src={t.cover_url || COVER_IMAGES[t.game_type] || COVER_IMAGES.turtle_soup} alt={t.title} />
                </div>
                <div className="flex flex-col flex-1 min-w-0 justify-between py-0.5">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="game-home-rec-title">{t.title}</h4>
                      <span className="game-home-badge shrink-0">Solo</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium mt-1" style={{ color: "var(--gh-text-muted)" }}>
                      <span className="flex items-center gap-0.5">
                        {t.game_type === "turtle_soup" ? <Brain size={10} /> : t.game_type === "roleplay" ? <Users size={10} /> : <Search size={10} />}
                        {GAME_TYPE_LABEL[t.game_type] || t.game_type}
                      </span>
                      <span>{t.target_language === "en" ? "English" : t.target_language}</span>
                      <span>{t.difficulty}</span>
                      <span>{t.estimated_minutes} 分钟</span>
                    </div>
                  </div>
                  <p className="game-home-rec-desc mt-1">{t.description}</p>
                </div>
              </div>
            ))}

            {!templatesLoading && otherTemplates.length === 0 && (
              <div className="game-home-glass game-home-empty">暂无游戏模板，请检查后端连接</div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="game-home-section-title">快速开始</h3>
            <div className="game-home-tag-row">
              <span className="game-home-tag">Solo</span>
              <span className="game-home-tag game-home-tag--live">Party</span>
            </div>
          </div>
          <div className="game-home-quick-scroll">
            <button
              type="button"
              onClick={() => {
                const t = templates[Math.floor(Math.random() * templates.length)];
                if (t) navigate(templatePath(t));
              }}
              className="game-home-quick-card"
            >
              <div className="game-home-quick-icon bg-gradient-to-br from-fuchsia-500 to-fuchsia-700">
                <Dices size={20} />
              </div>
              <div className="game-home-quick-title">随机开局</div>
              <div className="game-home-quick-desc">匹配随机游戏</div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (lastSession) navigate(sessionPath(lastSession.game_type, lastSession.id));
              }}
              className="game-home-quick-card"
            >
              <div className="game-home-quick-icon bg-gradient-to-br from-violet-500 to-violet-700">
                <RotateCcw size={20} />
              </div>
              <div className="game-home-quick-title">继续上次</div>
              <div className="game-home-quick-desc">从断点继续</div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/game/werewolf-room/new")}
              className="game-home-quick-card"
            >
              <div className="game-home-quick-icon bg-gradient-to-br from-emerald-500 to-emerald-700">
                <Users size={20} />
              </div>
              <div className="game-home-quick-title">狼人杀房间</div>
              <div className="game-home-quick-desc">真人组队 · 最少4人</div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
