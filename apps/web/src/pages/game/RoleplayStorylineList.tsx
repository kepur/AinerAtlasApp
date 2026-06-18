import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Filter, BookOpen, Loader2, PlusSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useGameStore } from "../../stores/gameStore";

const TABS = ["我的剧本", "仙侠玄幻", "现代都市", "科幻未来", "悬疑推理"] as const;
type StoryTab = (typeof TABS)[number];

export default function RoleplayStorylineList() {
  const navigate = useNavigate();
  const { templates, loadTemplates, templatesLoading } = useGameStore();
  const [activeTab, setActiveTab] = useState<StoryTab>("我的剧本");

  useEffect(() => {
    loadTemplates("roleplay");
  }, [loadTemplates]);

  const roleplayTemplates = useMemo(
    () => templates.filter((tpl) => tpl.game_type === "roleplay"),
    [templates]
  );

  const isCustomScript = (tpl: (typeof roleplayTemplates)[number]) => {
    const cfg = (tpl.config || {}) as Record<string, unknown>;
    const tags = (tpl.tags || []).map((x) => x.toLowerCase());
    const source = String(cfg.source || "").toLowerCase();
    const slug = String(tpl.slug || "").toLowerCase();
    return (
      slug.startsWith("roleplay-") ||
      source.includes("custom") ||
      tags.some((t) => t.includes("自定义") || t.includes("custom"))
    );
  };

  const classifyTemplate = (tpl: (typeof roleplayTemplates)[number]) => {
    const text = `${tpl.subtitle || ""} ${(tpl.tags || []).join(" ")} ${(tpl.description || "")}`.toLowerCase();
    if (/仙侠|玄幻|宗门|重生|修仙/.test(text)) return "仙侠玄幻";
    if (/科幻|未来|赛博|cyber|机器人|太空/.test(text)) return "科幻未来";
    if (/悬疑|推理|侦探|案件|谜/.test(text)) return "悬疑推理";
    return "现代都市";
  };

  const filteredTemplates = useMemo(() => {
    if (activeTab === "我的剧本") return roleplayTemplates.filter(isCustomScript);
    return roleplayTemplates.filter((tpl) => classifyTemplate(tpl) === activeTab);
  }, [activeTab, roleplayTemplates]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="premium w-full min-h-screen flex flex-col font-sans relative text-[#111827] pb-10 overflow-hidden bg-gradient-to-b from-[#fdf2f8] via-[#faf5ff] to-[#f3e8ff]"
    >
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-[#f9a8d4]/45 via-[#c084fc]/35 to-transparent blur-3xl animate-pulse-soft" />
        <div className="absolute top-[38%] -left-24 w-56 h-56 rounded-full bg-gradient-to-tr from-[#a78bfa]/30 to-[#fbcfe8]/25 blur-3xl" />
        <div className="absolute bottom-16 right-0 w-64 h-64 rounded-full bg-gradient-to-tl from-[#818cf8]/25 to-transparent blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-white/45 backdrop-blur-2xl border-b border-white/40 shadow-[0_4px_24px_rgba(236,72,153,0.06)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/50 backdrop-blur-md border border-white/60 text-gray-700 active:scale-95 transition-transform"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827] tracking-tight">剧本代入</h1>
        <div className="flex items-center gap-2 text-gray-600">
          <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full bg-white/50 backdrop-blur-md border border-white/60 active:scale-95 transition-transform">
            <Search size={18} />
          </button>
          <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full bg-white/50 backdrop-blur-md border border-white/60 active:scale-95 transition-transform">
            <Filter size={18} />
          </button>
        </div>
      </header>

      {/* Glass tab bar — sliding pill, equal width */}
      <div className="relative z-10 mx-4 mt-3 rounded-[20px] p-1.5 bg-white/40 backdrop-blur-2xl border border-white/55 shadow-[0_8px_32px_rgba(168,85,247,0.12),inset_0_1px_0_rgba(255,255,255,0.75)]">
        <div className="flex w-full gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="relative flex-1 min-w-0 min-h-[42px] py-2.5 rounded-[16px] transition-colors duration-200"
              >
                {active && (
                  <motion.span
                    layoutId="storyline-tab-pill"
                    className="absolute inset-0 rounded-[16px] bg-gradient-to-br from-[#f472b6] via-[#c084fc] to-[#818cf8] shadow-[0_5px_16px_rgba(192,132,252,0.42),inset_0_1px_0_rgba(255,255,255,0.35)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span
                  className={`relative z-10 block w-full text-center text-[13px] font-bold leading-snug truncate px-0.5 transition-colors duration-200 ${
                    active ? "text-white drop-shadow-sm" : "text-[#6b7280]"
                  }`}
                >
                  {tab}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Story List */}
      <main className="relative z-10 flex-1 px-4 pt-4 flex flex-col gap-4">
        <motion.div
          layout
          onClick={() => navigate("/game/custom-story-builder")}
          className="bg-white/50 backdrop-blur-xl border border-white/60 p-4 rounded-[22px] flex gap-4 shadow-[0_8px_28px_rgba(236,72,153,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/90 to-pink-50/80 flex items-center justify-center shrink-0 shadow-inner border border-white/80">
            <PlusSquare size={24} className="text-pink-500" />
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="font-bold text-[15px] text-[#111827]">自定义剧本</h3>
            <p className="text-[11px] text-[#6b7280] mt-1 leading-relaxed">
              输入一两句设定，AI 生成完整世界观与分支剧情，并默认加入「我的剧本」列表。
            </p>
            <span className="text-[11px] font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mt-2">
              创建剧本 →
            </span>
          </div>
        </motion.div>

        {templatesLoading ? (
          <div className="flex justify-center my-10">
            <Loader2 className="animate-spin text-pink-400" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-[12px] text-gray-400 py-8 glass-card rounded-2xl bg-white/35 backdrop-blur-xl border border-white/50"
          >
            当前分类暂无剧本
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4"
          >
            {filteredTemplates.map((tpl, index) => {
              const config = tpl.config || {};
              const subtitle = tpl.subtitle || config.subtitle || "未知题材";
              const tags = config.learning_focus || tpl.tags || [];

              return (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.3 }}
                  onClick={() => navigate(`/game/play/roleplay/${tpl.slug}`)}
                  className="bg-white/55 backdrop-blur-xl rounded-[24px] p-4 shadow-[0_8px_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] border border-white/60 flex flex-col relative cursor-pointer active:scale-[0.98] transition-transform"
                >
                  {tpl.cover_url || config.cover_url ? (
                    <div className="w-full h-32 rounded-xl mb-3 overflow-hidden shadow-inner border border-white/80 relative">
                      <img
                        src={(tpl.cover_url || config.cover_url) as string}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      <div className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-white/75 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/60">
                        <BookOpen className="text-pink-500" size={16} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100/80 to-purple-100/60 flex items-center justify-center mb-3 shadow-inner border border-white/70">
                      <BookOpen className="text-pink-500" size={24} />
                    </div>
                  )}

                  <h3 className="font-bold text-[18px] text-[#111827] mb-1">{tpl.title as string}</h3>
                  <p className="text-[12px] font-medium text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2">
                    {subtitle as string}
                  </p>
                  <p className="text-[12px] text-gray-500 leading-relaxed mb-4 line-clamp-2">
                    {(tpl.description as string) || ""}
                  </p>

                  <div className="flex items-center justify-between border-t border-white/50 pt-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {(tags as string[]).slice(0, 3).map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="text-[9px] bg-white/60 backdrop-blur-sm text-pink-600 px-1.5 py-0.5 rounded-full border border-pink-100/80"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[11px] font-bold py-1.5 px-4 rounded-full shadow-[0_4px_14px_rgba(236,72,153,0.35)]"
                    >
                      开始故事
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}
