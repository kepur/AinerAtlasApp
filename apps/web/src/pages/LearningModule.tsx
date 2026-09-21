import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api";
import LanguageSwitcher from "../components/LanguageSwitcher";
import TTSButton from "../components/TTSButton";
import VocabularyLadder from "../components/VocabularyLadder";
import type { CourseModule, LearningPathData } from "../lib/learning";
import { useLearningLanguageStore } from "../stores/learningLanguageStore";

type Result = { correct: boolean; expected_answer: string; explanation: string; path: LearningPathData };

export default function LearningModule() {
  const { moduleId = "foundations" } = useParams();
  const language = useLearningLanguageStore(s => s.language);
  const navigate = useNavigate();
  const [data, setData] = useState<CourseModule | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [studying, setStudying] = useState(true);
  const request = useRef("");
  const lesson = data?.lessons[index];
  useEffect(() => {
    let live = true;
    apiRequest<CourseModule>(`/api/learning/modules/${moduleId}?language=${language}`)
      .then(value => { if (live) { setData(value); setIndex(Math.max(0, value.lessons.findIndex(l => l.id === value.next_lesson))); setError(""); } })
      .catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [moduleId, language, retry]);
  function goTo(i: number) { setIndex(i); setAnswer(""); setResult(null); setError(""); request.current = ""; setStudying(true); }
  async function submit() {
    if (!lesson || !answer || busy) return;
    if (!request.current) request.current = crypto.randomUUID();
    setBusy(true); setError("");
    try {
      const value = await apiRequest<Result>(`/api/learning/modules/${moduleId}/answer`, {method: "POST", body: JSON.stringify({ language, lesson_id: lesson.id, answer, request_id: request.current })});
      setResult(value);
      const module = value.path.modules.find(m => m.id === moduleId)!;
      setData(old => old ? { ...old, ...module, state: { ...old.state,
        completed: value.correct ? Array.from(new Set([...(old.state.completed || []), lesson.id])) : old.state.completed,
        mistakes: value.correct ? (old.state.mistakes || []).filter(id => id !== lesson.id) : Array.from(new Set([...(old.state.mistakes || []), lesson.id])) }} : old);
    } catch (e) { setError(e instanceof Error ? e.message : "保存失败，请重试；答案尚未计入进度"); }
    finally { setBusy(false); }
  }
  return <div className="premium min-h-full bg-surface text-on-surface pb-28">
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
      <button aria-label="返回学习路线" onClick={() => navigate("/home")} className="material-symbols-outlined text-primary">arrow_back</button>
      <span className="text-sm font-bold">{data ? `${data.number.toString().padStart(2, "0")} · ${data.title}` : "课程模块"}</span><LanguageSwitcher />
    </header>
    <main className="px-4 py-5 space-y-5">
      {error && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm">{error}{!data && <button onClick={() => setRetry(r => r + 1)} className="ml-3 underline">重试</button>}</div>}
      {!data && !error && <p className="text-center text-sm py-20">加载课程与进度…</p>}
      {data && lesson && <>
        <div><div className="flex justify-between text-[11px] text-on-surface-variant"><span>{data.name} · 第 {index + 1} / {data.total} 课</span><span>{data.completed} 课已通过 · 自动保存</span></div><div className="mt-3 h-1.5 bg-primary/10 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{width:`${data.completed / data.total * 100}%`}} /></div></div>
        {!data.unlocked && <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">当前为预览。请先完成前面的模块，再解锁本模块练习。<Link to="/home" className="block mt-2 font-bold">回到学习路线 →</Link></div>}
        <section className="rounded-[26px] bg-surface-container-lowest border border-outline-variant/20 shadow-sm p-5 space-y-4">
          <div className="text-[10px] text-primary font-bold tracking-widest">{studying ? "先听 · 再理解 · 然后自己选" : "轮到你了"}</div>
          <h1 className="text-xl font-bold">{lesson.title}</h1>
          {studying ? <>
            <div className="rounded-2xl bg-primary/5 p-4 flex items-start gap-3"><div className="flex-1 min-w-0"><p lang={language} className="text-[23px] leading-relaxed font-semibold break-words">{lesson.target}</p><p className="mt-2 text-sm text-on-surface-variant">{lesson.meaning}</p></div><TTSButton text={lesson.target} lang={language} voice={data.voice} size={23} className="text-primary mt-1" /></div>
            <p className="text-sm leading-7 text-on-surface-variant">{lesson.rule}</p>
            <button disabled={!data.unlocked} onClick={() => setStudying(false)} className="w-full rounded-2xl bg-primary text-white py-3 font-bold text-sm disabled:opacity-40">我理解了，试一题</button>
          </> : <>
            <p className="text-base leading-relaxed whitespace-pre-line">{lesson.prompt}</p>
            <div className="space-y-2">{lesson.options.map(option => <button key={option} disabled={busy || !!result} onClick={() => { setAnswer(option); request.current = ""; }} className={`w-full text-left rounded-2xl border p-4 text-sm transition ${option === answer ? "border-primary bg-primary/10" : "border-outline-variant/30"} ${result && option === result.expected_answer ? "border-emerald-500 bg-emerald-50" : ""}`}>{option}</button>)}</div>
            {!result && <button onClick={() => void submit()} disabled={!answer || busy} className="w-full rounded-2xl bg-primary text-white py-3 font-bold text-sm disabled:opacity-40">{busy ? "判分并保存…" : "检查答案"}</button>}
            {result && <div aria-live="polite" className={`rounded-2xl p-4 text-sm ${result.correct ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}><strong>{result.correct ? "答对了，进度已保存" : "先记住这一处，再试一次"}</strong><p className="mt-2">{result.expected_answer}</p><p className="mt-2 leading-relaxed">{result.explanation}</p></div>}
            {result && <button onClick={() => {
              if (!result.correct) { setResult(null); setAnswer(""); request.current = ""; return; }
              if (index + 1 < data.total) goTo(index + 1); else navigate("/home");
            }} className="w-full rounded-2xl bg-primary text-white py-3 font-bold text-sm">{result.correct ? index + 1 < data.total ? "下一课 →" : "模块完成，回到路线 →" : "重试本题"}</button>}
          </>}
        </section>
        <section><div className="flex justify-between items-center"><h2 className="font-bold text-sm">本模块课时</h2><span className="text-[10px] text-on-surface-variant">✓ 已通过　↻ 需重练</span></div><div className="flex flex-wrap gap-2 mt-3">{data.lessons.map((item, i) => { const done = data.state.completed?.includes(item.id); const due = data.state.mistakes?.includes(item.id); return <button key={item.id} disabled={busy || (data.unlocked && !done && item.id !== data.next_lesson)} onClick={() => goTo(i)} aria-label={`${i + 1}. ${item.title}`} className={`rounded-xl min-w-10 py-2 px-3 border text-xs disabled:opacity-35 ${i === index ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/30"}`}>{i + 1}{due ? " ↻" : done ? " ✓" : ""}</button>; })}</div></section>
        {moduleId === "vocabulary" && data.complete && <><VocabularyLadder language={language} /><Link to="/vocabulary?practice=1" className="block text-primary font-bold text-sm">到词汇 Crush 复习已学词汇 →</Link></>}
        <p className="text-[10px] leading-relaxed text-on-surface-variant">固定入门课不依赖 AI 出题。完成不是永久掌握：所学表达会进入当前语言的 Crush 队列，后续通过复习巩固。</p>
      </>}
    </main>
  </div>;
}
