import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  apiRequest,
  startGrammarBatch,
  submitGrammarBatchSummary,
  submitGrammarPractice,
  type GrammarBatchResult,
  type GrammarBatchStart,
  type GrammarBatchSummary,
  type GrammarPracticeResponse,
  type MasteryItem,
  type PracticeExercise,
} from "../api";
import { useAuthStore } from "../stores/authStore";

const BATCH_SIZE = 10;

function CrushTabsPremium() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tabs = [
    { path: "/patterns", label: "语法" },
    { path: "/vocabulary", label: "词汇" },
  ];
  return (
    <div className="flex gap-2 p-1 bg-surface-container-low rounded-full">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={
              "flex-1 h-10 rounded-full text-[14px] font-bold transition-all " +
              (active ? "bg-primary text-white shadow-md" : "text-on-surface-variant")
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function RadarRing({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="min-w-[100px] glass-card premium-shadow rounded-2xl p-3 flex flex-col items-center gap-2">
      <div
        className="relative w-12 h-12 flex items-center justify-center rounded-full circular-progress"
        style={{ ["--percentage" as string]: value, ["--progress-color" as string]: color }}
      >
        <div className="absolute inset-1 bg-surface-container-lowest rounded-full flex items-center justify-center">
          <span className="text-[12px] font-bold">{value}%</span>
        </div>
      </div>
      <span className="text-[13px] text-on-surface-variant">{label}</span>
    </div>
  );
}

type BatchPhase = "practice" | "summary";

function GrammarBatchModal({
  batchItems,
  batchIndex,
  totalRemaining,
  phase,
  exercise,
  busy,
  lastResult,
  batchResults,
  summary,
  onPick,
  onNext,
  onNextBatch,
  onClose,
}: {
  batchItems: MasteryItem[];
  batchIndex: number;
  totalRemaining: number;
  phase: BatchPhase;
  exercise: PracticeExercise | null;
  busy: boolean;
  lastResult: GrammarPracticeResponse | null;
  batchResults: GrammarBatchResult[];
  summary: GrammarBatchSummary | null;
  onPick: (opt: string) => void;
  onNext: () => void;
  onNextBatch: () => void;
  onClose: () => void;
}) {
  const item = batchItems[batchIndex];
  const answered = lastResult?.correct != null;
  const correctCount = batchResults.filter((r) => r.correct).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "practice" && item && exercise && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  句型辨析 · 第 {batchIndex + 1} / {batchItems.length} 题
                </p>
                <p className="text-[12px] text-outline mt-0.5">队列还剩 {totalRemaining} 项</p>
              </div>
              <button type="button" onClick={onClose} className="material-symbols-outlined text-on-surface-variant">close</button>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-4 mb-4">
              <p className="text-[13px] text-outline mb-1">{item.title}</p>
              <p className="text-[15px] text-on-surface leading-relaxed">{exercise.prompt}</p>
              {item.examples?.[0] && (
                <p className="text-[13px] text-primary italic mt-2">"{item.examples[0]}"</p>
              )}
            </div>

            {!answered ? (
              <div className="space-y-2 mb-4">
                {(exercise.options ?? []).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={busy}
                    onClick={() => onPick(opt)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-outline/20 text-[14px] text-on-surface active:scale-[0.99] disabled:opacity-50 hover:border-primary hover:bg-primary/10"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div
                className={
                  "rounded-2xl p-4 mb-4 text-center " +
                  (lastResult?.correct ? "bg-tertiary-container/15 text-tertiary-container" : "bg-error/10 text-error")
                }
              >
                <span className="material-symbols-outlined text-[32px]">
                  {lastResult?.correct ? "check_circle" : "cancel"}
                </span>
                <p className="font-bold text-[16px] mt-1">{lastResult?.correct ? "选对了！" : "不对，再记一下"}</p>
                <p className="text-[12px] mt-2">掌握度 {Math.round(lastResult?.item.mastery_score ?? item.mastery_score)}%</p>
              </div>
            )}

            {answered && (
              <button
                type="button"
                onClick={onNext}
                disabled={busy}
                className="w-full py-3 rounded-2xl bg-primary text-white font-semibold disabled:opacity-40"
              >
                {batchIndex + 1 >= batchItems.length ? "查看本组 AI 解析" : "下一题"}
              </button>
            )}
          </>
        )}

        {phase === "summary" && summary && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[18px] text-on-surface">本组练习总结</h3>
              <button type="button" onClick={onClose} className="material-symbols-outlined text-on-surface-variant">close</button>
            </div>
            <div className="bg-primary/10 rounded-2xl p-4 mb-4">
              <p className="text-[14px] text-on-surface leading-relaxed">{summary.summary}</p>
              <p className="text-[12px] text-outline mt-2">本组 {batchResults.length} 题，答对 {correctCount} 题</p>
              {summary.encouragement && (
                <p className="text-[13px] text-primary mt-2 font-medium">{summary.encouragement}</p>
              )}
            </div>
            <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
              {summary.insights.map((row) => (
                <div key={row.title} className="glass-card rounded-xl p-3 border border-outline/15">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-primary truncate">{row.title}</span>
                    <span className={"text-[10px] px-2 py-0.5 rounded-full font-bold " + (row.correct ? "bg-tertiary-container/15 text-tertiary-container" : "bg-error/10 text-error")}>
                      {row.correct ? "正确" : "错题"}
                    </span>
                  </div>
                  <p className="text-[13px] text-on-surface leading-relaxed">{row.explanation}</p>
                  {row.tip && <p className="text-[12px] text-outline mt-1">💡 {row.tip}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onNextBatch}
                disabled={busy}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-semibold disabled:opacity-40"
              >
                {totalRemaining > 0 ? "下一组（10 题）" : "全部消灭！"}
              </button>
              <button type="button" onClick={onClose} className="px-5 py-3 rounded-2xl border border-outline/20 text-on-surface-variant font-semibold">
                返回
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PatternCrush() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [queue, setQueue] = useState<MasteryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [batchError, setBatchError] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<MasteryItem[]>([]);
  const [batchExercises, setBatchExercises] = useState<NonNullable<GrammarBatchStart["exercises"]>>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [phase, setPhase] = useState<BatchPhase>("practice");
  const [exercise, setExercise] = useState<PracticeExercise | null>(null);
  const [exerciseToken, setExerciseToken] = useState("");
  const [lastResult, setLastResult] = useState<GrammarPracticeResponse | null>(null);
  const [batchResults, setBatchResults] = useState<GrammarBatchResult[]>([]);
  const [summary, setSummary] = useState<GrammarBatchSummary | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [preloadedBatch, setPreloadedBatch] = useState<GrammarBatchStart | null>(null);

  const prefetchBatch = useCallback(async () => {
    try {
      const data = await startGrammarBatch(BATCH_SIZE);
      if (data.items.length > 0 && (data.exercises?.length ?? 0) > 0) {
        setPreloadedBatch(data);
      }
    } catch {
      /* background prefetch */
    }
  }, []);

  async function loadQueue() {
    setLoading(true);
    try {
      const data = await apiRequest<MasteryItem[]>("/api/grammar/queue");
      setQueue(data.filter((q) => q.item_type !== "vocabulary"));
    } catch {
      setQueue([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  useEffect(() => {
    if (!loading && queue.length > 0) {
      void prefetchBatch();
    }
  }, [loading, queue.length, prefetchBatch]);

  const applyExerciseAt = useCallback((index: number, exercises: NonNullable<GrammarBatchStart["exercises"]>) => {
    const row = exercises[index];
    if (!row) return;
    setExercise(row.exercise);
    setExerciseToken(row.exercise_token);
    setLastResult(null);
  }, []);

  async function act(item: MasteryItem, action: "mark-mastered" | "ignore") {
    setBusy(item.id);
    try {
      await apiRequest(`/api/grammar/${item.id}/${action}`, { method: "POST" });
      await loadQueue();
    } catch {
      /* ignore */
    }
    setBusy(null);
  }

  async function startBatch() {
    setBatchError("");
    setBatchBusy(true);
    try {
      const data = preloadedBatch?.items.length ? preloadedBatch : await startGrammarBatch(BATCH_SIZE);
      setPreloadedBatch(null);
      if (!data.items.length || !(data.exercises?.length ?? 0)) {
        setBatchError("暂无待练句型，多聊几句让 AI 发现你的短板吧");
        return;
      }
      setBatchItems(data.items);
      setBatchExercises(data.exercises ?? []);
      setBatchIndex(0);
      setTotalRemaining(data.total_remaining);
      setBatchResults([]);
      setSummary(null);
      setPhase("practice");
      setBatchOpen(true);
      applyExerciseAt(0, data.exercises ?? []);
    } catch {
      setBatchError("启动练习失败，请稍后重试");
    } finally {
      setBatchBusy(false);
    }
  }

  function closeBatch() {
    setBatchOpen(false);
    setBatchItems([]);
    setBatchExercises([]);
    setBatchIndex(0);
    setExercise(null);
    setExerciseToken("");
    setLastResult(null);
    setBatchResults([]);
    setSummary(null);
    void loadQueue();
    void prefetchBatch();
  }

  async function handlePick(opt: string) {
    const item = batchItems[batchIndex];
    if (!item || !exerciseToken || batchBusy) return;
    setBatchBusy(true);
    try {
      const data = await submitGrammarPractice(item.id, { answer: opt, exercise_token: exerciseToken });
      setLastResult(data);
      setBatchResults((prev) => [
        ...prev,
        {
          item_id: item.id,
          title: item.title,
          example: item.examples?.[0] ?? "",
          correct: Boolean(data.correct),
          user_answer: opt,
        },
      ]);
      await loadQueue();
    } catch {
      setBatchError("提交答案失败");
    } finally {
      setBatchBusy(false);
    }
  }

  async function handleNextQuestion() {
    const nextIndex = batchIndex + 1;
    if (nextIndex >= batchItems.length) {
      setBatchBusy(true);
      try {
        const analysis = await submitGrammarBatchSummary(batchResults);
        setSummary(analysis);
        setPhase("summary");
        await loadQueue();
        setTotalRemaining((prev) => Math.max(0, prev - batchItems.length));
        void prefetchBatch();
      } catch {
        setBatchError("AI 解析生成失败，但练习记录已保存");
        setPhase("summary");
        setSummary({
          summary: `本组完成 ${batchResults.length} 题，答对 ${batchResults.filter((r) => r.correct).length} 题。`,
          insights: batchResults.map((r) => ({
            title: r.title,
            correct: r.correct,
            explanation: r.correct ? `「${r.title}」是更自然的表达。` : `更自然的是「${r.title}」。`,
            tip: r.correct ? "继续保持。" : "注意句型搭配。",
          })),
          encouragement: "继续下一组，把高频句型一个个消灭掉。",
        });
        void prefetchBatch();
      } finally {
        setBatchBusy(false);
      }
      return;
    }
    setBatchIndex(nextIndex);
    if (batchExercises.length) {
      applyExerciseAt(nextIndex, batchExercises);
    }
  }

  async function handleNextBatch() {
    if (totalRemaining <= 0) {
      closeBatch();
      return;
    }
    closeBatch();
    await startBatch();
  }

  const crushed = queue.filter((q) => q.mastery_score >= 80);
  const focus = [...queue].sort((a, b) => a.mastery_score - b.mastery_score).slice(0, 3);

  const grammar = Math.round(profile?.grammar_level_score ?? 0);
  const expression = Math.round(profile?.vocabulary_level_score ?? 0);
  const fluency = Math.round(profile?.fluency_score ?? 0);
  const review = queue.length ? Math.round((crushed.length / queue.length) * 100) : 0;

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 px-margin-mobile h-touch-target-min flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/profile")} className="material-symbols-outlined text-primary">menu</button>
          <h1 className="font-headline-lg text-[26px] font-bold text-primary">Crush</h1>
        </div>
        <div className="flex items-center bg-surface-container-lowest/50 px-3 py-1 rounded-full border border-outline-variant/30">
          <span className="text-[13px] text-primary">待练 {queue.length} 项</span>
        </div>
      </header>

      <main className="px-margin-mobile pb-28 space-y-8 pt-4">
        <p className="font-body-md text-on-surface-variant">四选一辨析句型，即时判对错，10 题完成后 AI 解析</p>

        <CrushTabsPremium />

        {batchError && (
          <p className="text-[13px] text-error bg-error/10 rounded-xl px-3 py-2">{batchError}</p>
        )}

        <section className="glass-card premium-shadow rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">今日待消灭</h2>
              <p className="text-[13px] text-on-surface-variant">每 10 题一组，题目进入页面前台预生成</p>
            </div>
            <span className="material-symbols-outlined text-primary-container">insights</span>
          </div>
          {loading ? (
            <p className="text-body-md text-on-surface-variant">加载中…</p>
          ) : focus.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant">多进行对话，AI 会自动发现你的语法短板。</p>
          ) : (
            <div className="space-y-4 pt-2">
              {focus.map((item, i) => {
                const colors = ["bg-primary-container", "bg-tertiary-container", "bg-secondary-container"];
                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <code className="font-bold text-primary font-body-md">{item.title}</code>
                      <span className="text-[12px] text-outline">{Math.round(item.mastery_score)}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i % 3]} rounded-full transition-all duration-700`} style={{ width: `${item.mastery_score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => void startBatch()}
            disabled={batchBusy || queue.length === 0}
            className="w-full bg-primary text-white h-12 rounded-full font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            {batchBusy ? "准备中…" : preloadedBatch ? "开始练习（已就绪）" : queue.length === 0 ? "暂无句型可练" : `开始练习（${Math.min(BATCH_SIZE, queue.length)} 题/组）`}
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">学习雷达</h2>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            <RadarRing label="Grammar" value={grammar} color="#630ed4" />
            <RadarRing label="Expression" value={expression} color="#00885d" />
            <RadarRing label="Fluency" value={fluency} color="#2170e4" />
            <RadarRing label="Review" value={review} color="#ba1a1a" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">高频句型队列</h2>
          {queue.length === 0 && !loading ? (
            <div className="glass-card premium-shadow rounded-2xl p-6 text-center text-on-surface-variant text-[14px]">
              暂无待消除项 — 多聊几句，AI 会自动发现你的短板。
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => (
                <div key={item.id} className="glass-card premium-shadow rounded-2xl p-4 flex justify-between items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="font-bold text-primary font-body-lg truncate block">{item.title}</span>
                    {item.examples?.[0] && <p className="text-[13px] text-outline truncate">{item.examples[0]}</p>}
                  </div>
                  <button
                    onClick={() => act(item, "mark-mastered")}
                    disabled={busy === item.id}
                    className="p-2 text-primary active:scale-90 transition-transform"
                    title="标记已掌握"
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {batchOpen && (
        <GrammarBatchModal
          batchItems={batchItems}
          batchIndex={batchIndex}
          totalRemaining={totalRemaining}
          phase={phase}
          exercise={exercise}
          busy={batchBusy}
          lastResult={lastResult}
          batchResults={batchResults}
          summary={summary}
          onPick={(opt) => void handlePick(opt)}
          onNext={() => void handleNextQuestion()}
          onNextBatch={() => void handleNextBatch()}
          onClose={closeBatch}
        />
      )}
    </div>
  );
}
