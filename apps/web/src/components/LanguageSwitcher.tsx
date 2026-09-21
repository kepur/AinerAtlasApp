import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { apiRequest } from "../api";
import { useLearningLanguageStore } from "../stores/learningLanguageStore";
import { useLocation, useNavigate } from "react-router-dom";

type CourseProgress = {
  current_step: number;
  today_count: number;
  daily_goal: number;
  streak_days: number;
};
type LanguageOption = {
  code: string;
  name: string;
  native_name: string;
  locale: string;
  voice: string;
  progress: CourseProgress | null;
  curriculum?: {completed: number; total: number; next_module: string; modules: {id: string; title: string}[]} | null;
};
type CourseCatalog = {
  selected_language: string;
  target_languages: string[];
  languages: LanguageOption[];
};

const STEPS = ["语言 DNA", "功能按钮", "造句流水线", "场景实战", "完成"];
const LANGUAGE_GLYPHS: Record<string, string> = {
  sr: "SR", en: "EN", es: "ES", fr: "FR", de: "DE", ja: "あ", ko: "한",
};
const LANGUAGE_AURAS: Record<string, string> = {
  sr: "from-sky-400 to-indigo-500",
  en: "from-violet-400 to-fuchsia-500",
  es: "from-amber-400 to-rose-500",
  fr: "from-blue-400 to-violet-500",
  de: "from-slate-500 to-amber-500",
  ja: "from-rose-400 to-pink-500",
  ko: "from-cyan-400 to-blue-600",
};

/**
 * Global language switcher component.
 * - `compact`: Small pill button with current language glyph + name (for nav bars).
 * - `full`: Also usable standalone; wraps the dropdown menu.
 *
 * Reads and writes via `learningLanguageStore`.
 */
export default function LanguageSwitcher({ className }: { className?: string }) {
  const { language, switching, switchLanguage, error } = useLearningLanguageStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [catalog, setCatalog] = useState<CourseCatalog | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiRequest<CourseCatalog>("/api/survival-sprint/catalog")
      .then(setCatalog)
      .catch(() => {});
  }, []);

  async function handleSwitch(code: string) {
    setOpen(false);
    if (code === language) return;
    try {
      await switchLanguage(code);
      // A historical session's language must never be silently relabelled.
      if (/^\/chat\/.+/.test(pathname)) navigate("/chat");
      else if (/^\/game\/.+/.test(pathname)) navigate("/game");
      else if (/^\/assets\/.+/.test(pathname)) navigate("/assets");
    } catch { setOpen(true); }
  }

  const currentLanguage = catalog?.languages.find((l) => l.code === language);
  const nativeName = currentLanguage?.native_name ?? language.toUpperCase();
  const aura = LANGUAGE_AURAS[language] ?? "from-gray-400 to-gray-600";
  const glyph = LANGUAGE_GLYPHS[language] ?? language.toUpperCase().slice(0, 2);

  return (
    <div className={`relative shrink-0 ${className ?? ""}`}>
      {error && <span role="alert" className="absolute right-0 top-full mt-1 w-56 rounded-xl bg-error-container p-2 text-xs text-error z-[80]">{error}</span>}
      <motion.button
        type="button"
        aria-label="切换学习语言"
        aria-expanded={open}
        disabled={switching}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((o) => !o)}
        className="group flex h-10 items-center gap-2 rounded-full border border-primary/15 bg-surface-container-lowest/90 py-1 pl-1 pr-2.5 shadow-[0_8px_24px_rgba(82,43,180,0.10)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(82,43,180,0.16)] disabled:opacity-60"
      >
        <span className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${aura} text-[10px] font-black tracking-tight text-white shadow-sm`}>
          <span className="absolute inset-0 rounded-full bg-white/15 animate-pulse-soft" />
          <span className="relative">{glyph}</span>
        </span>
        <span className="max-w-[72px] truncate text-[11px] font-bold text-on-surface">
          {switching ? "切换中" : nativeName}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="material-symbols-outlined text-[18px] text-primary"
        >
          expand_more
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && catalog && (
          <>
            <motion.button
              type="button"
              aria-label="关闭语言选择"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-label="选择练习语言"
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-[24px] border border-white/70 bg-surface-container-lowest/95 p-3 shadow-[0_24px_70px_rgba(42,23,88,0.24)] backdrop-blur-2xl"
            >
              <div className="flex items-start justify-between px-2 pb-3 pt-1">
                <div>
                  <p className="text-[14px] font-black text-on-surface">今天想练哪一种？</p>
                  <p className="mt-0.5 text-[10px] text-on-surface-variant">切换后全局生效：对话、游戏、资产、报告同步切换</p>
                </div>
                <span className="rounded-full bg-primary/8 px-2 py-1 text-[9px] font-bold text-primary">
                  {catalog.languages.length} 种语言
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {catalog.languages.map((item, index) => {
                  const active = item.code === language;
                  const itemProgress = item.progress;
                  const stage = item.curriculum ? `${item.curriculum.completed}/${item.curriculum.total} 课已学` : "从第 1 模块开始";
                  const completion = item.curriculum ? item.curriculum.completed / item.curriculum.total * 100 : 0;
                  const itemAura = LANGUAGE_AURAS[item.code] ?? "from-gray-400 to-gray-600";
                  const itemGlyph = LANGUAGE_GLYPHS[item.code] ?? item.code.toUpperCase().slice(0, 2);
                  return (
                    <motion.button
                      type="button"
                      key={item.code}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.025 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => void handleSwitch(item.code)}
                      className={`relative min-h-[82px] overflow-hidden rounded-2xl border p-2.5 text-left transition ${active ? "border-primary/35 bg-primary/[0.09] shadow-[inset_0_0_0_1px_rgba(101,54,217,0.08)]" : "border-outline-variant/20 bg-surface/65 hover:border-primary/20 hover:bg-primary/[0.04]"}`}
                    >
                      {active && <motion.span layoutId="language-active-glow" className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-primary/15 blur-xl" />}
                      <div className="relative flex items-center gap-2">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br ${itemAura} text-[10px] font-black text-white shadow-sm`}>
                          {itemGlyph}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="truncate text-[12px] font-black">{item.native_name}</p>
                            {active && <span className="material-symbols-outlined text-[15px] text-primary">check_circle</span>}
                          </div>
                          <p className="truncate text-[9px] text-on-surface-variant">{item.name}</p>
                        </div>
                      </div>
                      <div className="relative mt-2.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-primary/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${completion}%` }}
                            className={`h-full rounded-full bg-gradient-to-r ${itemAura}`}
                          />
                        </div>
                        <span className="max-w-[62px] truncate text-[8px] font-bold text-on-surface-variant">{stage}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
