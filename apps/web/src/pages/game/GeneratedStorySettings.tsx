import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Play, Edit3, Sparkles, BookOpen, User, Target, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useGameStore, type GeneratedStoryOutline } from "../../stores/gameStore";

type LocationState = { prompt?: string };

export default function GeneratedStorySettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const prompt = (location.state as LocationState | null)?.prompt?.trim() || "";
  const { generateStoryOutline, createGameTemplate } = useGameStore();

  const [outline, setOutline] = useState<GeneratedStoryOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!prompt) {
      setError("缺少故事设定，请返回重新输入。");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await generateStoryOutline(prompt);
        if (!cancelled) setOutline(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "AI 生成失败，请检查 LLM 是否已在 Admin 配置。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prompt, generateStoryOutline]);

  async function handleStart() {
    if (!outline || starting) return;
    setStarting(true);
    setError(null);
    try {
      const created = await createGameTemplate({
        title: outline.title || "自定义故事",
        description: outline.description || prompt,
        game_type: "roleplay",
        config: { ...outline, source_prompt: prompt },
      });
      navigate(`/game/play/roleplay/${created.slug}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建故事失败");
      setStarting(false);
    }
  }

  const player = outline?.characters?.[0] as Record<string, string> | undefined;
  const partner = outline?.characters?.[1] as Record<string, string> | undefined;
  const tags = outline?.learning_focus || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="premium w-full min-h-screen bg-[#fdf2f8] flex flex-col font-sans relative text-[#111827] pb-24"
    >
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] h-14 flex items-center justify-between bg-[#fdf2f8]/90 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center text-gray-700 active:scale-95 transition-transform"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[16px] text-[#111827]">故事设定</h1>
        <div className="w-8" />
      </header>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500">
          <Loader2 size={28} className="animate-spin text-pink-400" />
          <p className="text-sm">AI 正在生成世界观与剧情…</p>
        </div>
      )}

      {!loading && error && (
        <div className="px-4 pt-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm leading-relaxed">
            {error}
          </div>
          <button
            type="button"
            onClick={() => navigate("/game/custom-story-builder")}
            className="mt-4 w-full py-3 rounded-2xl border border-pink-200 text-pink-600 font-bold"
          >
            返回修改设定
          </button>
        </div>
      )}

      {!loading && outline && (
        <main className="flex-1 px-4 pt-2 flex flex-col gap-4">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mb-3 shadow-inner border border-white">
              <Sparkles size={28} className="text-pink-500" />
            </div>
            <h2 className="text-2xl font-black text-[#111827] mb-2 tracking-wide">{outline.title}</h2>
            <div className="flex gap-1.5 flex-wrap justify-center">
              {(outline.subtitle ? [outline.subtitle] : []).map((tag) => (
                <span key={tag} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center">
                <BookOpen size={12} className="text-pink-500" />
              </div>
              <h3 className="font-bold text-[15px] text-[#111827]">故事主线</h3>
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
              {outline.description || outline.setting || prompt}
            </p>
          </div>

          {(player || partner) && (
            <div className="flex flex-col gap-3">
              {player && (
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                    <User size={14} className="text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[13px] text-[#111827] mb-0.5">你的设定</h4>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      {player.personality || player.name || "主角"}
                    </p>
                  </div>
                </div>
              )}
              {partner && (
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                    <span className="text-[14px]">🌸</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[13px] text-[#111827] mb-0.5">对方设定</h4>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      {partner.personality || partner.name || "关键角色"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white mt-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center">
                  <Target size={12} className="text-orange-500" />
                </div>
                <h3 className="font-bold text-[15px] text-[#111827]">学习重点</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-orange-50/50 text-orange-600 text-[11px] px-3 py-1.5 rounded-full border border-orange-100 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {!loading && outline && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
          className="fixed bottom-[max(env(safe-area-inset-bottom,16px),16px)] left-0 w-full px-4 z-50 pointer-events-none"
        >
          <div className="max-w-md mx-auto flex gap-3 pointer-events-auto">
            <button
              type="button"
              onClick={() => navigate("/game/custom-story-builder", { state: { prompt } })}
              className="flex-1 bg-white text-gray-600 border border-gray-200 font-bold py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Edit3 size={16} />
              <span className="text-[14px]">修改设定</span>
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={starting}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-pink-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={14} className="fill-white" />}
              <span className="text-[14px]">{starting ? "创建中…" : "开始故事"}</span>
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
