import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Filter, BookOpen, Loader2, PlusSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useGameStore } from "../../stores/gameStore";

export default function RoleplayStorylineList() {
  const navigate = useNavigate();
  const { templates, loadTemplates, templatesLoading } = useGameStore();
  const [activeTab, setActiveTab] = useState("全部");

  useEffect(() => {
    loadTemplates("roleplay");
  }, [loadTemplates]);

  const tabs = ["全部", "我的剧本", "仙侠玄幻", "现代都市", "科幻未来", "悬疑推理"];

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
    if (activeTab === "全部") return roleplayTemplates;
    if (activeTab === "我的剧本") return roleplayTemplates.filter(isCustomScript);
    return roleplayTemplates.filter((tpl) => classifyTemplate(tpl) === activeTab);
  }, [activeTab, roleplayTemplates]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="premium w-full min-h-screen bg-[#fdf2f8] flex flex-col font-sans relative text-[#111827] pb-10"
    >
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-[#fdf2f8]/90 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">剧本代入</h1>
        <div className="flex items-center gap-3 text-gray-700">
          <Search size={20} />
          <Filter size={20} />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 py-2 mt-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[14px] pb-1 shrink-0 ${activeTab === tab ? "font-bold text-pink-500 border-b-2 border-pink-500" : "font-medium text-gray-400"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Story List */}
      <main className="flex-1 px-4 pt-4 flex flex-col gap-4">
        <div
          onClick={() => navigate("/game/custom-story-builder")}
          className="bg-gradient-to-br from-[#fdf4ff] to-[#fce7f3] border border-pink-200/50 p-4 rounded-[20px] flex gap-4 shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-inner border border-pink-100">
            <PlusSquare size={24} className="text-pink-500" />
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="font-bold text-[15px] text-[#111827]">自定义剧本</h3>
            <p className="text-[11px] text-[#6b7280] mt-1 leading-relaxed">
              输入一两句设定，AI 生成完整世界观与分支剧情，并默认加入「我的剧本」列表。
            </p>
            <span className="text-[11px] font-bold text-pink-500 mt-2">创建剧本 →</span>
          </div>
        </div>

        {templatesLoading ? (
           <div className="flex justify-center my-10"><Loader2 className="animate-spin text-pink-400" /></div>
        ) : (
          filteredTemplates.length === 0 ? (
            <div className="text-center text-[12px] text-gray-400 py-8">当前分类暂无剧本</div>
          ) : filteredTemplates.map((tpl) => {
            const config = tpl.config || {};
            const subtitle = tpl.subtitle || config.subtitle || "未知题材";
            const tags = config.learning_focus || tpl.tags || [];

            return (
              <div 
                key={tpl.id}
                onClick={() => navigate(`/game/play/roleplay/${tpl.slug}`)} 
                className="bg-white/80 backdrop-blur-md rounded-[24px] p-4 shadow-sm border border-white flex flex-col relative cursor-pointer active:scale-[0.98] transition-transform"
              >
                {tpl.cover_url || config.cover_url ? (
                  <div className="w-full h-32 rounded-xl mb-3 overflow-hidden shadow-inner border border-white relative">
                    <img src={(tpl.cover_url || config.cover_url) as string} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                      <BookOpen className="text-pink-500" size={16} />
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center mb-3 shadow-inner border border-white">
                    <BookOpen className="text-pink-500" size={24} />
                  </div>
                )}
                
                <h3 className="font-bold text-[18px] text-[#111827] mb-1">{tpl.title as string}</h3>
                <p className="text-[12px] font-medium text-pink-500 mb-2">{subtitle as string}</p>
                <p className="text-[12px] text-gray-500 leading-relaxed mb-4 line-clamp-2">
                  {(tpl.description as string) || ""}
                </p>
                
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {(tags as string[]).slice(0, 3).map((tag: string, i: number) => (
                      <span key={i} className="text-[9px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded border border-pink-100">{tag}</span>
                    ))}
                  </div>
                  <button className="bg-pink-500 text-white text-[11px] font-bold py-1.5 px-4 rounded-full shadow-md">
                    开始故事
                  </button>
                </div>
              </div>
            );
          })
        )}

      </main>
    </motion.div>
  );
}
