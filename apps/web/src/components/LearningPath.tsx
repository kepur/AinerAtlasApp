import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useLearningLanguageStore } from "../stores/learningLanguageStore";
import type { LearningPathData } from "../lib/learning";

const TONES = ["from-indigo-500 to-violet-500", "from-sky-500 to-cyan-500", "from-amber-500 to-orange-400", "from-emerald-500 to-teal-500"];

export default function LearningPath() {
  const language = useLearningLanguageStore(s => s.language);
  const navigate = useNavigate();
  const [path, setPath] = useState<LearningPathData | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setPath(null); setError("");
    apiRequest<LearningPathData>(`/api/learning/path?language=${language}`)
      .then(data => { if (live) setPath(data); })
      .catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [language, retry]);
  if (error) return <div role="alert" className="rounded-2xl bg-error/10 p-4 text-sm">课程加载失败：{error}<button onClick={() => setRetry(v => v + 1)} className="ml-3 text-primary">重试</button></div>;
  if (!path) return <div className="h-52 animate-pulse rounded-3xl bg-surface-container" aria-label="加载学习路线" />;
  const current = path.modules.find(m => m.id === path.next_module)!;
  return <section aria-label={`${path.name}学习路线`} className="space-y-4">
    <div className="relative overflow-hidden rounded-[24px] bg-[#20203f] p-5 text-white">
      <div className="pointer-events-none absolute -right-8 -top-14 h-44 w-44 rounded-full bg-violet-500/25 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between text-[10px] tracking-wider text-white/65"><span>MY LANGUAGE PATH · {path.native_name}</span><span>已学 {path.completed}/{path.total}</span></div>
        <h2 className="mt-3 text-[23px] font-bold tracking-tight">先能开口，再把话说完整。</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-white/70">{path.name}专属路线 · 问答 → 结构 → 词汇填句 → 场景</p>
        <div className="mt-5 flex gap-3 items-center">
          <button onClick={() => navigate(`/learn/${path.next_module}`)} className="flex-1 flex justify-between items-center rounded-2xl bg-white px-4 py-3 text-[12px] font-bold text-[#292143]">
            <span>{path.completed ? "继续学习" : "从第一课开始"} · {current.title}</span><span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
          <div className="text-center shrink-0 text-[10px] text-white/70"><strong className="block text-lg text-white">{path.practice.today_count}/{path.practice.daily_goal}</strong>今日练习</div>
        </div>
      </div>
    </div>
    <div className="flex items-center justify-between"><h3 className="font-bold text-sm">四步，搭起你的语言</h3><span className="text-[10px] text-on-surface-variant">按语言独立保存 · 随时继续</span></div>
    <div className="grid grid-cols-2 gap-3">
      {path.modules.map((module, i) => <button key={module.id} onClick={() => navigate(`/learn/${module.id}`)} className={`group relative text-left rounded-[22px] border p-4 transition duration-200 hover:-translate-y-1 active:scale-[.98] motion-reduce:transform-none ${module.unlocked ? "border-primary/15 bg-surface-container-lowest shadow-sm" : "border-outline-variant/20 bg-surface-container-low"}`}>
        <div className="flex items-center justify-between"><span className={`flex w-9 h-9 rounded-xl items-center justify-center text-white font-bold bg-gradient-to-br ${TONES[i]}`}>{module.number.toString().padStart(2, "0")}</span><span className="material-symbols-outlined text-[19px] text-outline">{module.complete ? "check_circle" : module.unlocked ? module.icon : "lock"}</span></div>
        <h4 className="mt-3 text-[13px] font-bold">{module.title}</h4>
        <p className="mt-1 text-[10px] leading-relaxed text-on-surface-variant min-h-[36px]">{module.preview.slice(0, 2).join(" · ")}</p>
        <div className="mt-3 h-1 rounded-full bg-outline-variant/20 overflow-hidden"><div className={`h-full bg-gradient-to-r ${TONES[i]}`} style={{width: `${module.completed / module.total * 100}%`}} /></div>
        <div className="mt-2 flex justify-between text-[10px] text-on-surface-variant"><span>{module.completed}/{module.total} 课</span><span>{module.complete ? "可复习" : module.unlocked ? "开始 / 继续" : "先预览"}</span></div>
      </button>)}
    </div>
    {path.practice.due_review_count > 0 && <p className="text-xs text-on-surface-variant">还有 {path.practice.due_review_count} 个待重练项目，回到对应模块即可复习。</p>}
    <p className="text-[10px] leading-relaxed text-on-surface-variant">先完成入门骨架，再进入 500 → 800 → 1200 词阶梯。阶梯是掌握目标，不代表已提供同等数量的固定课时。</p>
  </section>;
}
