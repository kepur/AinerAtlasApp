import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Filter, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "../../api";

type RomanceCharacter = {
  id: string;
  target_id: string;
  template_id: string | null;
  source: "builtin" | "template";
  name: string;
  name_en?: string;
  age?: number;
  role?: string;
  avatar_url?: string;
  category?: string;
  personality?: string;
  initial_scene?: string;
  tags?: string[];
  difficulty?: string;
};

const CATEGORY_TABS = ["恋爱社交", "旅游出差", "商务谈判", "移民生活"];

const getListTheme = (category: string) => {
  const c = category || "恋爱社交";
  if (c === "商务谈判") {
    return {
      bg: "bg-[#f0f7ff]",
      bgHeader: "bg-[#f0f7ff]/90",
      textActive: "text-blue-600",
      badgeHot: "bg-blue-100 text-blue-500",
      heart: "text-blue-500 fill-blue-500",
      cta: "text-blue-500",
      tagCategory: "bg-blue-50 text-blue-500 border border-blue-100",
      filterBorder: "border-blue-100",
    };
  }
  if (c === "移民生活") {
    return {
      bg: "bg-[#f0fdfa]",
      bgHeader: "bg-[#f0fdfa]/90",
      textActive: "text-teal-600",
      badgeHot: "bg-teal-100 text-teal-500",
      heart: "text-teal-500 fill-teal-500",
      cta: "text-teal-500",
      tagCategory: "bg-teal-50 text-teal-500 border border-teal-100",
      filterBorder: "border-teal-100",
    };
  }
  if (c === "旅游出差") {
    return {
      bg: "bg-[#faf5ff]",
      bgHeader: "bg-[#faf5ff]/90",
      textActive: "text-violet-600",
      badgeHot: "bg-violet-100 text-violet-500",
      heart: "text-violet-500 fill-violet-500",
      cta: "text-violet-500",
      tagCategory: "bg-violet-50 text-violet-500 border border-violet-100",
      filterBorder: "border-violet-100",
    };
  }
  if (c === "校园大学") {
    return {
      bg: "bg-[#fffaf0]",
      bgHeader: "bg-[#fffaf0]/90",
      textActive: "text-amber-600",
      badgeHot: "bg-amber-100 text-amber-600",
      heart: "text-amber-500 fill-amber-500",
      cta: "text-amber-600",
      tagCategory: "bg-amber-50 text-amber-600 border border-amber-100",
      filterBorder: "border-amber-100",
    };
  }
  return {
    bg: "bg-[#fdf2f8]",
    bgHeader: "bg-[#fdf2f8]/90",
    textActive: "text-pink-600",
    badgeHot: "bg-pink-100 text-pink-500",
    heart: "text-pink-500 fill-pink-500",
    cta: "text-pink-500",
    tagCategory: "bg-pink-50 text-pink-500 border border-pink-100",
    filterBorder: "border-pink-100",
  };
};

export default function RoleplayCharacterList() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("恋爱社交");
  const th = getListTheme(activeCategory);
  const [characters, setCharacters] = useState<RomanceCharacter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const qs = `?category=${encodeURIComponent(activeCategory)}`;
        const data = await apiRequest<RomanceCharacter[]>(`/api/games/romance-characters${qs}`);
        setCharacters(data);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [activeCategory]);

  const visibleCharacters = useMemo(() => characters, [characters]);

  const ctaText = (c: RomanceCharacter) => {
    if (c.category === "商务谈判") return "开始谈判";
    if (c.category === "移民生活") return "开始对话";
    if (c.category === "旅游出差") return "开始对话";
    if (c.category === "校园大学") return "进入剧情";
    return "进入对话";
  };

  const openCharacter = (c: RomanceCharacter) => {
    // Builtins use target_id; admin templates start via template_id.
    if (c.template_id) {
      navigate(`/game/romance-social?template=${c.template_id}`);
      return;
    }
    navigate(`/game/romance-social/${c.target_id}`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`premium w-full min-h-screen ${th.bg} flex flex-col font-sans relative text-[#111827] pb-10 transition-colors duration-500`}
    >
      {/* Header */}
      <header className={`sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between ${th.bgHeader} backdrop-blur-md transition-colors duration-500`}>
        <button onClick={() => navigate("/game")} className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">选择角色</h1>
        <div className="flex items-center gap-3 text-gray-700">
          <Search size={20} />
          <Filter size={20} />
        </div>
      </header>

      {/* Tabs (iOS Segmented Control style with sliding background) */}
      <div className="mx-4 mt-2 bg-black/5 dark:bg-white/10 p-1.5 rounded-2xl flex relative select-none gap-1 overflow-x-auto no-scrollbar">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeCategory === tab;
          return (
            <button
              key={tab}
              className={`flex-1 shrink-0 py-2.5 px-3 rounded-xl text-center text-[13px] relative z-10 transition-all duration-300 font-bold ${
                isActive 
                  ? `scale-110 ${th.textActive} font-extrabold` 
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveCategory(tab)}
            >
              {/* Sliding Capsule Background */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white rounded-xl shadow-md border border-white/60 -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              {tab}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-2 mt-2">
        <button className={`bg-white border ${th.filterBorder} text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm flex items-center gap-1`}>性格 <ChevronLeft size={10} className="-rotate-90 text-gray-400"/></button>
        <button className={`bg-white border ${th.filterBorder} text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm flex items-center gap-1`}>场景 <ChevronLeft size={10} className="-rotate-90 text-gray-400"/></button>
        <button className={`bg-white border ${th.filterBorder} text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm flex items-center gap-1`}>语言 <ChevronLeft size={10} className="-rotate-90 text-gray-400"/></button>
        <button className={`bg-white border ${th.filterBorder} text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm flex items-center gap-1`}>难度 <ChevronLeft size={10} className="-rotate-90 text-gray-400"/></button>
      </div>

      {/* Character List */}
      <main className="flex-1 px-4 pt-4 flex flex-col gap-4">
        {loading && <div className="text-center text-xs text-gray-400 py-6">加载中...</div>}
        {!loading && visibleCharacters.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-6">该分类暂无角色</div>
        )}

        {visibleCharacters.map((c, idx) => (
          <div key={c.id} className="bg-white/80 backdrop-blur-md rounded-[24px] p-3 shadow-sm border border-white flex gap-3 relative">
            <div className="w-24 h-[120px] rounded-2xl overflow-hidden shrink-0 shadow-inner bg-gray-100">
              {c.avatar_url ? (
                <img src={c.avatar_url} className="w-full h-full object-cover" alt={c.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Avatar</div>
              )}
            </div>
            <div className="flex flex-col flex-1 py-1">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[18px] text-[#111827]">{c.name}</h3>
                  <span className={`${th.badgeHot} text-[9px] font-bold px-1.5 py-0.5 rounded`}>{idx === 0 ? "热门" : "推荐"}</span>
                </div>
                <Heart size={16} className={idx === 0 ? "text-gray-300" : th.heart} />
              </div>
              <p className="text-[11px] font-medium text-gray-500 mt-0.5">{c.age || 24}岁 | {c.role || "角色"}</p>
              <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">性格：{c.personality || "自然交流"}</p>
              <p className="text-[10px] text-gray-400 line-clamp-1">场景：{c.initial_scene || "日常对话练习"}</p>
              <p className="text-[10px] text-gray-400 line-clamp-1 mb-2">练习重点：{(c.tags || []).slice(0, 3).join("、") || "表达、回应、推进话题"}</p>
              <div className="flex gap-1.5 flex-wrap mt-auto">
                <span className={`${th.tagCategory} text-[9px] px-1.5 py-0.5 rounded`}>{c.category || "恋爱社交"}</span>
                <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded">{(c.tags || [])[1] || "轻松"}</span>
                <span className="bg-indigo-50 text-indigo-500 text-[9px] px-1.5 py-0.5 rounded">{c.difficulty || (c.tags || [])[2] || "B1-B2"}</span>
              </div>
              <button onClick={() => openCharacter(c)} className={`absolute bottom-3 right-3 ${th.cta} text-[12px] font-bold flex items-center gap-0.5`}>
                {ctaText(c)} <ChevronLeft size={12} className="rotate-180" />
              </button>
            </div>
          </div>
        ))}
      </main>
    </motion.div>
  );
}
