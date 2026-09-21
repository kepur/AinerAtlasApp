import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import type { LearningSummary } from "../lib/learning";
import { useLearningLanguageStore } from "../stores/learningLanguageStore";

export default function Report() {
  const language = useLearningLanguageStore(s => s.language);
  const [data, setData] = useState<LearningSummary | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    apiRequest<LearningSummary>(`/api/learning/summary?language=${language}`)
      .then(value => { if (live) {setData(value); setError("");} })
      .catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [language, retry]);
  const attempts = data?.week.reduce((n, day) => n + day.attempts, 0) || 0;
  const correct = data?.week.reduce((n, day) => n + day.correct, 0) || 0;
  const peak = Math.max(1, ...(data?.week.map(day => day.attempts) || []));
  return <div className="premium min-h-full bg-surface text-on-surface px-4 py-6 pb-28 space-y-6">
    <header><p className="text-primary text-xs tracking-wider font-bold">YOUR LEARNING JOURNEY</p><h1 className="mt-2 text-2xl font-bold">{data?.name || "当前语言"} · 成长报告</h1><p className="mt-2 text-xs text-on-surface-variant">只统计这门语言，不把其他语言的成绩算进来。</p></header>
    {error && <p role="alert" className="text-error text-sm">{error}<button className="ml-3 underline" onClick={() => setRetry(r => r + 1)}>重试</button></p>}
    {!data && !error && <p>正在加载学习记录…</p>}
    {data && <>
      <section className="rounded-3xl bg-[#20203f] p-5 text-white"><p className="text-xs text-white/65">入门课程进度</p><div className="mt-2 text-4xl font-bold">{data.path.completed}<span className="text-lg text-white/60"> / {data.path.total} 课</span></div><p className="mt-3 text-xs text-white/70">连续练习 {data.practice.streak_days} 天 · 今日 {data.practice.today_count} 次 · 待重练 {data.practice.due_review_count} 项</p><Link to={`/learn/${data.path.next_module}`} className="block mt-5 text-sm font-bold">回到下一课 →</Link></section>
      <section className="rounded-3xl bg-surface-container-lowest p-5 border border-outline-variant/20"><h2 className="text-base font-bold">近 7 天课程练习</h2><p className="text-xs text-on-surface-variant mt-1">{attempts} 次提交 · {attempts ? `${Math.round(correct / attempts * 100)}% 正确率` : "尚无记录"}</p><div className="mt-6 flex items-end gap-3 h-28">{data.week.map(day => <div key={day.date} className="flex-1 h-full flex flex-col justify-end items-center gap-1"><span className="text-[10px] text-on-surface-variant">{day.attempts}</span><div className="w-full max-w-8 rounded-t-lg bg-primary/70 min-h-[2px]" style={{height:`${day.attempts / peak * 72}px`}} /><span className="text-[9px] text-on-surface-variant">{day.date.slice(5)}</span></div>)}</div><p className="mt-4 text-[10px] text-on-surface-variant">按服务端 UTC 日期统计真实课程提交，含重练；Crush 的熟练度单独保存在复习队列。</p></section>
      <section className="grid grid-cols-2 gap-3">{[["词汇已收集", data.vocabulary], ["词汇已掌握", data.mastered_words], ["句型与表达", data.patterns], ["对话记录", data.conversations], ["表达资产", data.assets], ["游戏会话", data.games]].map(([label, value]) => <div key={label} className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20"><strong className="block text-2xl">{value}</strong><span className="text-xs text-on-surface-variant">{label}</span></div>)}</section>
      <p className="text-[11px] text-on-surface-variant">课时完成度不等于语言水平测试分数。这里不再用跨语言的默认能力分数充当本语言成绩。</p>
    </>}
  </div>;
}
