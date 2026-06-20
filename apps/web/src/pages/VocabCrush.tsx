import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  fetchVocabulary,
  ignoreVocabulary,
  markVocabMastered,
  startVocabBatch,
  submitVocabBatchSummary,
  submitVocabPractice,
  type VocabBatchResult,
  type VocabBatchStart,
  type VocabBatchSummary,
  type VocabItem,
  type VocabPracticeExercise,
  type VocabPracticeResponse,
  type VocabWordInsight,
} from "../api";
import { useAuthStore } from "../stores/authStore";

const STATUS_LABELS: Record<string, string> = {
  unseen: "未见过",
  seen: "已见过",
  understood: "可理解",
  usable: "可使用",
  mastered: "已掌握",
  reviewing: "复习中",
  ignored: "已忽略",
};

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

function VocabBatchModal({
  batchItems,
  batchIndex,
  totalRemaining,
  phase,
  exercise,
  exerciseToken,
  currentItem,
  busy,
  lastResult,
  batchResults,
  summary,
  onPickWord,
  onNextQuestion,
  onNextBatch,
  onClose,
}: {
  batchItems: VocabItem[];
  batchIndex: number;
  totalRemaining: number;
  phase: BatchPhase;
  exercise: VocabPracticeExercise | null;
  exerciseToken: string;
  currentItem: VocabItem | null;
  busy: boolean;
  lastResult: VocabPracticeResponse | null;
  batchResults: VocabBatchResult[];
  summary: VocabBatchSummary | null;
  onPickWord: (word: string) => void;
  onNextQuestion: () => void;
  onNextBatch: () => void;
  onClose: () => void;
}) {
  const answered = lastResult?.correct != null;
  const sentence = exercise?.sentence || exercise?.hint || "";
  const correctCount = batchResults.filter((r) => r.correct).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "practice" && currentItem && exercise && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider">近义选词 · 第 {batchIndex + 1} / {batchItems.length} 题</p>
                <p className="text-[12px] text-outline mt-0.5">本组还剩 {Math.max(0, batchItems.length - batchIndex - (answered ? 1 : 0))} 题 · 队列共 {totalRemaining} 词</p>
              </div>
              <button type="button" onClick={onClose} className="material-symbols-outlined text-on-surface-variant">
                close
              </button>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-4 mb-4 space-y-3">
              <p className="text-[14px] text-on-surface-variant">{exercise.prompt}</p>
              <p className="text-[17px] text-on-surface leading-relaxed font-medium border-l-4 border-primary/40 pl-3">
                {sentence}
              </p>
              <p className="text-[12px] text-outline">从下方四个近义表达中选一项填入空白</p>
            </div>

            {!answered ? (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(exercise.options ?? []).map((word) => (
                  <button
                    key={word}
                    type="button"
                    disabled={busy}
                    onClick={() => onPickWord(word)}
                    className="px-4 py-3 rounded-xl border border-outline/25 bg-surface-container-low text-[14px] font-semibold text-on-surface active:scale-95 disabled:opacity-50 hover:border-primary hover:bg-primary/10 text-center"
                  >
                    {word}
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
                <p className="font-bold text-[16px] mt-1">{lastResult?.correct ? "选对了！" : "再想想"}</p>
                <p className="text-[13px] mt-1 opacity-90">{lastResult?.message}</p>
                <p className="text-[12px] mt-2">
                  正确答案 <strong>{currentItem.word}</strong>
                  {(currentItem.translation || currentItem.meaning) && (
                    <span className="text-outline"> · {currentItem.translation || currentItem.meaning}</span>
                  )}
                </p>
                <p className="text-[11px] mt-1 text-outline">掌握度 {Math.round(lastResult?.item.mastery_score ?? currentItem.mastery_score)}%</p>
              </div>
            )}

            {answered && (
              <button
                type="button"
                onClick={onNextQuestion}
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
              <button type="button" onClick={onClose} className="material-symbols-outlined text-on-surface-variant">
                close
              </button>
            </div>

            <div className="bg-primary/10 rounded-2xl p-4 mb-4">
              <p className="text-[14px] text-on-surface leading-relaxed">{summary.summary}</p>
              <p className="text-[12px] text-outline mt-2">
                本组 {batchResults.length} 题，答对 {correctCount} 题
              </p>
              {summary.encouragement && (
                <p className="text-[13px] text-primary mt-2 font-medium">{summary.encouragement}</p>
              )}
            </div>

            <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
              {summary.word_insights.map((row: VocabWordInsight) => (
                <div key={row.word} className="glass-card rounded-xl p-3 border border-outline/15">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-primary">{row.word}</span>
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
                {totalRemaining > 0 ? "下一组（10 词）" : "全部消灭！"}
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

export default function VocabCrush() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [items, setItems] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<VocabItem[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [phase, setPhase] = useState<BatchPhase>("practice");
  const [exercise, setExercise] = useState<VocabPracticeExercise | null>(null);
  const [exerciseToken, setExerciseToken] = useState("");
  const [lastResult, setLastResult] = useState<VocabPracticeResponse | null>(null);
  const [batchResults, setBatchResults] = useState<VocabBatchResult[]>([]);
  const [summary, setSummary] = useState<VocabBatchSummary | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchExercises, setBatchExercises] = useState<VocabBatchStart["exercises"]>([]);
  const [preloadedBatch, setPreloadedBatch] = useState<VocabBatchStart | null>(null);

  const prefetchBatch = useCallback(async () => {
    try {
      const data = await startVocabBatch(BATCH_SIZE);
      if (data.items.length > 0 && (data.exercises?.length ?? 0) > 0) {
        setPreloadedBatch(data);
      }
    } catch {
      /* background prefetch — ignore */
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVocabulary();
      setItems(data.filter((i) => i.mastery_status !== "mastered" && i.mastery_status !== "ignored"));
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!loading && items.length > 0) {
      void prefetchBatch();
    }
  }, [loading, items.length, prefetchBatch]);

  const applyExerciseAt = useCallback((index: number, exercises: NonNullable<VocabBatchStart["exercises"]>) => {
    const row = exercises[index];
    if (!row) return;
    setExercise(row.exercise);
    setExerciseToken(row.exercise_token);
    setLastResult(null);
  }, []);

  async function act(id: string, action: "master" | "ignore") {
    setBusy(id);
    try {
      if (action === "master") await markVocabMastered(id);
      else await ignoreVocabulary(id);
      await loadItems();
    } catch {
      /* ignore */
    }
    setBusy(null);
  }

  async function startBatch() {
    setBatchError("");
    setBatchBusy(true);
    try {
      const data = preloadedBatch?.items.length ? preloadedBatch : await startVocabBatch(BATCH_SIZE);
      setPreloadedBatch(null);
      if (!data.items.length || !(data.exercises?.length ?? 0)) {
        setBatchError("暂无待练词汇，多聊几句让 AI 提取高价值词吧");
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
    void loadItems();
    void prefetchBatch();
  }

  async function handlePickWord(word: string) {
    const item = batchItems[batchIndex];
    if (!item || !exerciseToken || batchBusy) return;
    setBatchBusy(true);
    try {
      const data = await submitVocabPractice(item.id, { answer: word, exercise_token: exerciseToken });
      setLastResult(data);
      setBatchResults((prev) => [
        ...prev,
        {
          item_id: item.id,
          word: item.word,
          meaning: item.translation || item.meaning || "",
          sentence: exercise?.sentence || exercise?.hint || "",
          correct: Boolean(data.correct),
          user_answer: word,
        },
      ]);
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
        const analysis = await submitVocabBatchSummary(batchResults);
        setSummary(analysis);
        setPhase("summary");
        await loadItems();
        setTotalRemaining((prev) => Math.max(0, prev - batchItems.length));
        void prefetchBatch();
      } catch {
        setBatchError("AI 解析生成失败，但练习记录已保存");
        setPhase("summary");
        setSummary({
          summary: `本组完成 ${batchResults.length} 题，答对 ${batchResults.filter((r) => r.correct).length} 题。`,
          word_insights: batchResults.map((r) => ({
            word: r.word,
            correct: r.correct,
            explanation: r.correct
              ? `「${r.word}」在句中用法正确。`
              : `目标词是「${r.word}」，你选了「${r.user_answer}」。`,
            tip: r.correct ? "继续保持语境敏感度。" : "先理解中文释义，再在句中定位对应词。",
          })),
          encouragement: "继续下一组，直到清空待练队列。",
        });
        void prefetchBatch();
      } finally {
        setBatchBusy(false);
      }
      return;
    }
    setBatchIndex(nextIndex);
    if (batchExercises?.length) {
      applyExerciseAt(nextIndex, batchExercises);
    }
  }

  async function handleNextBatch() {
    if (totalRemaining <= 0) {
      closeBatch();
      return;
    }
    setBatchOpen(false);
    setBatchItems([]);
    setBatchIndex(0);
    setExercise(null);
    setExerciseToken("");
    setLastResult(null);
    setBatchResults([]);
    setSummary(null);
    await loadItems();
    await startBatch();
  }

  const mastered = items.filter((i) => i.mastery_score >= 90 || i.mastery_status === "mastered");
  const focus = [...items].sort((a, b) => a.mastery_score - b.mastery_score).slice(0, 3);

  const grammar = Math.round(profile?.grammar_level_score ?? 0);
  const expression = Math.round(profile?.vocabulary_level_score ?? 0);
  const fluency = Math.round(profile?.fluency_score ?? 0);
  const review = items.length ? Math.round((mastered.length / (items.length + mastered.length)) * 100) : 0;

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 px-margin-mobile h-touch-target-min flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate("/profile")} className="material-symbols-outlined text-primary">
            menu
          </button>
          <h1 className="font-headline-lg text-[26px] font-bold text-primary">Crush</h1>
        </div>
        <div className="flex items-center bg-surface-container-lowest/50 px-3 py-1 rounded-full border border-outline-variant/30">
          <span className="text-[13px] text-primary">待练 {items.length} 词</span>
        </div>
      </header>

      <main className="px-margin-mobile pb-28 space-y-8 pt-4">
        <p className="font-body-md text-on-surface-variant">句中挖空，从四个近义表达里选出最贴切的一项</p>

        <CrushTabsPremium />

        {batchError && (
          <p className="text-[13px] text-error bg-error/10 rounded-xl px-3 py-2">{batchError}</p>
        )}

        <section className="glass-card premium-shadow rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">今日待掌握</h2>
              <p className="text-[13px] text-on-surface-variant">每 10 词一组：近义辨析 → 即时判对错 → 完成后 AI 解析</p>
            </div>
            <span className="material-symbols-outlined text-primary-container">insights</span>
          </div>
          {loading ? (
            <p className="text-body-md text-on-surface-variant">加载中…</p>
          ) : focus.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant">多进行对话，AI 会自动提取高价值词汇。</p>
          ) : (
            <div className="space-y-4 pt-2">
              {focus.map((item, i) => {
                const colors = ["bg-primary-container", "bg-tertiary-container", "bg-secondary-container"];
                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <code className="font-bold text-primary font-body-md">{item.word}</code>
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
            disabled={batchBusy || items.length === 0}
            className="w-full bg-primary text-white h-12 rounded-full font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            {batchBusy ? "准备中…" : preloadedBatch ? "开始练习（已就绪）" : items.length === 0 ? "暂无词汇可练" : `开始练习（${Math.min(BATCH_SIZE, items.length)} 词/组）`}
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">学习雷达</h2>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            <RadarRing label="Grammar" value={grammar} color="#630ed4" />
            <RadarRing label="Vocabulary" value={expression} color="#00885d" />
            <RadarRing label="Fluency" value={fluency} color="#2170e4" />
            <RadarRing label="Review" value={review} color="#ba1a1a" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">高频词汇队列</h2>
          {items.length === 0 && !loading ? (
            <div className="glass-card premium-shadow rounded-2xl p-6 text-center text-on-surface-variant text-[14px]">
              暂无待练习词汇 — 多聊几句，AI 会自动提取高价值词汇。
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="glass-card premium-shadow rounded-2xl p-4 flex justify-between items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary font-body-lg truncate">{item.word}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 bg-tertiary-container/15 text-tertiary-container">
                        {STATUS_LABELS[item.mastery_status] ?? item.mastery_status}
                      </span>
                    </div>
                    {(item.translation || item.meaning) && (
                      <p className="text-[13px] text-outline truncate">{item.translation || item.meaning}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => act(item.id, "master")}
                      disabled={busy === item.id}
                      className="p-2 text-primary active:scale-90 transition-transform"
                      title="标记已掌握"
                    >
                      <span className="material-symbols-outlined">check_circle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {batchOpen && (
        <VocabBatchModal
          batchItems={batchItems}
          batchIndex={batchIndex}
          totalRemaining={totalRemaining}
          phase={phase}
          exercise={exercise}
          exerciseToken={exerciseToken}
          currentItem={batchItems[batchIndex] ?? null}
          busy={batchBusy}
          lastResult={lastResult}
          batchResults={batchResults}
          summary={summary}
          onPickWord={(word) => void handlePickWord(word)}
          onNextQuestion={() => void handleNextQuestion()}
          onNextBatch={() => void handleNextBatch()}
          onClose={closeBatch}
        />
      )}
    </div>
  );
}
