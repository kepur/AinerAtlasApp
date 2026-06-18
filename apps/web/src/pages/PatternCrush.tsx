import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  apiRequest,
  fetchGrammarPractice,
  submitGrammarPractice,
  type GrammarPracticeResponse,
  type MasteryItem,
  type PracticeExercise,
} from "../api";
import { useAuthStore } from "../stores/authStore";

function CrushTabsPremium() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tabs = [
    { path: "/patterns", label: "语法" },
    { path: "/vocabulary", label: "词汇" }
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
        <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
          <span className="text-[12px] font-bold">{value}%</span>
        </div>
      </div>
      <span className="text-[13px] text-on-surface-variant">{label}</span>
    </div>
  );
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  mastered: { label: "已掌握", cls: "bg-tertiary-container/15 text-tertiary-container" },
  learning: { label: "学习中", cls: "bg-tertiary-container/15 text-tertiary-container" },
  new: { label: "新发现", cls: "bg-primary-fixed text-primary" }
};

const EXERCISE_LABEL: Record<string, string> = {
  translate: "翻译练习",
  fix_error: "改错练习",
  choose_natural: "选择更自然表达",
};

function PracticeModal({
  item,
  exercise,
  answer,
  busy,
  result,
  onAnswer,
  onSubmit,
  onNext,
  onClose,
}: {
  item: MasteryItem;
  exercise: PracticeExercise;
  answer: string;
  busy: boolean;
  result: GrammarPracticeResponse | null;
  onAnswer: (value: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const isChoice = exercise.exercise_type === "choose_natural" && (exercise.options?.length ?? 0) > 0;
  const answered = result?.correct != null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-6 animate-[fadeInUp_0.3s_ease-out] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
              {EXERCISE_LABEL[exercise.exercise_type] ?? "语法练习"}
            </p>
            <h3 className="font-bold text-[18px] text-on-surface">{item.title}</h3>
          </div>
          <button onClick={onClose} className="material-symbols-outlined text-on-surface-variant">close</button>
        </div>

        <div className="bg-surface-container-low rounded-2xl p-4 mb-4">
          <p className="text-[15px] text-on-surface leading-relaxed">{exercise.prompt}</p>
          {exercise.hint && !answered && (
            <p className="text-[12px] text-outline mt-2">提示：{exercise.hint}</p>
          )}
        </div>

        {!answered && (
          isChoice ? (
            <div className="space-y-2 mb-4">
              {exercise.options!.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onAnswer(opt)}
                  disabled={busy}
                  className={
                    "w-full text-left px-4 py-3 rounded-xl border text-[14px] transition-all " +
                    (answer === opt
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-outline/20 text-on-surface active:scale-[0.99]")
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
              placeholder="输入你的答案…"
              rows={3}
              className="w-full rounded-2xl border border-outline/20 px-4 py-3 text-[15px] mb-4 resize-none focus:outline-none focus:border-primary"
            />
          )
        )}

        {answered && (
          <div
            className={
              "rounded-2xl p-4 mb-4 text-center " +
              (result?.correct ? "bg-tertiary-container/15 text-tertiary-container" : "bg-error/10 text-error")
            }
          >
            <span className="material-symbols-outlined text-[32px] mb-1">
              {result?.correct ? "check_circle" : "cancel"}
            </span>
            <p className="font-bold text-[16px]">{result?.correct ? "回答正确！" : "再试一次"}</p>
            <p className="text-[13px] mt-1 opacity-80">{result?.message}</p>
            <p className="text-[12px] mt-2">掌握度 {Math.round(result?.item.mastery_score ?? item.mastery_score)}%</p>
          </div>
        )}

        <div className="flex gap-3">
          {!answered ? (
            <button
              onClick={onSubmit}
              disabled={busy || !answer.trim()}
              className="flex-1 py-3 rounded-2xl bg-primary text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {busy ? "判分中…" : "提交答案"}
            </button>
          ) : (
            <>
              <button
                onClick={onNext}
                disabled={busy}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                下一题
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-2xl border border-outline/20 text-on-surface-variant font-semibold"
              >
                完成
              </button>
            </>
          )}
        </div>
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
  const [practiceItem, setPracticeItem] = useState<MasteryItem | null>(null);
  const [exercise, setExercise] = useState<PracticeExercise | null>(null);
  const [exerciseToken, setExerciseToken] = useState("");
  const [answer, setAnswer] = useState("");
  const [practiceBusy, setPracticeBusy] = useState(false);
  const [practiceResult, setPracticeResult] = useState<GrammarPracticeResponse | null>(null);

  useEffect(() => {
    loadQueue();
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

  async function openPractice(item: MasteryItem) {
    setPracticeBusy(true);
    setPracticeResult(null);
    setAnswer("");
    try {
      const data = await fetchGrammarPractice(item.id);
      if (!data.exercise || !data.exercise_token) return;
      setPracticeItem(data.item);
      setExercise(data.exercise);
      setExerciseToken(data.exercise_token);
    } catch {
      setPracticeItem(null);
      setExercise(null);
    }
    setPracticeBusy(false);
  }

  async function submitPractice() {
    if (!practiceItem || !exercise || !exerciseToken || !answer.trim()) return;
    setPracticeBusy(true);
    try {
      const data = await submitGrammarPractice(practiceItem.id, {
        answer: answer.trim(),
        exercise_token: exerciseToken,
      });
      setPracticeResult(data);
      setPracticeItem(data.item);
      await loadQueue();
    } catch {
      /* ignore */
    }
    setPracticeBusy(false);
  }

  async function nextPractice() {
    if (!practiceItem) return;
    setPracticeResult(null);
    setAnswer("");
    setPracticeBusy(true);
    try {
      const data = await fetchGrammarPractice(practiceItem.id);
      if (data.exercise && data.exercise_token) {
        setExercise(data.exercise);
        setExerciseToken(data.exercise_token);
      }
    } catch {
      /* ignore */
    }
    setPracticeBusy(false);
  }

  function closePractice() {
    setPracticeItem(null);
    setExercise(null);
    setExerciseToken("");
    setAnswer("");
    setPracticeResult(null);
  }

  const crushed = queue.filter((q) => q.mastery_score >= 80);
  const focus = [...queue].sort((a, b) => a.mastery_score - b.mastery_score).slice(0, 3);
  const gamified = focus[0];

  const grammar = Math.round(profile?.grammar_level_score ?? 0);
  const expression = Math.round(profile?.vocabulary_level_score ?? 0);
  const fluency = Math.round(profile?.fluency_score ?? 0);
  const review = queue.length ? Math.round((crushed.length / queue.length) * 100) : 0;

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/profile")} className="material-symbols-outlined text-primary">menu</button>
          <h1 className="font-headline-lg text-[26px] font-bold text-primary">Crush</h1>
        </div>
        <div className="flex items-center bg-white/50 px-3 py-1 rounded-full border border-white/40">
          {/* TODO(backend): real streak count */}
          <span className="text-[13px] text-primary">🔥 {crushed.length} 连续学习</span>
        </div>
      </header>

      <main className="px-margin-mobile pb-8 space-y-8 pt-4">
        <p className="font-body-md text-on-surface-variant">把高频语法一点点消灭</p>

        <CrushTabsPremium />

        {/* Today Focus */}
        <section className="glass-card premium-shadow rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">今日待消灭</h2>
              <p className="text-[13px] text-on-surface-variant">这些句型来自你的真实对话，越学越地道</p>
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
        </section>

        {/* Learning Radar */}
        <section className="space-y-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">学习雷达</h2>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            <RadarRing label="Grammar" value={grammar} color="#630ed4" />
            <RadarRing label="Expression" value={expression} color="#00885d" />
            <RadarRing label="Fluency" value={fluency} color="#2170e4" />
            <RadarRing label="Review" value={review} color="#ba1a1a" />
          </div>
        </section>

        {/* Gamified Practice */}
        {gamified && (
          <section className="glass-card premium-shadow rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3">
              <span className="bg-primary-container text-white px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase">Focus</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-headline-md text-headline-md text-on-surface">消消乐练习</h2>
              <span className="text-[13px] text-primary">{crushed.length} / {queue.length} 已消除</span>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl space-y-2 mb-4">
              <p className="text-on-surface-variant font-body-md">{gamified.title}</p>
              {gamified.examples?.[0] && <p className="text-primary font-headline-md font-bold italic">"{gamified.examples[0]}"</p>}
            </div>
            <button
              onClick={() => void openPractice(gamified)}
              disabled={busy === gamified.id || practiceBusy}
              className="w-full bg-primary text-white h-11 rounded-full font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              继续闯关
            </button>
          </section>
        )}

        {/* High-frequency Queue */}
        <section className="space-y-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">高频句型队列</h2>
          {queue.length === 0 && !loading ? (
            <div className="glass-card premium-shadow rounded-2xl p-6 text-center text-on-surface-variant text-[14px]">
              暂无待消除项 — 多聊几句，AI 会自动发现你的短板。
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => {
                const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.learning;
                return (
                  <div key={item.id} className="glass-card premium-shadow rounded-2xl p-4 flex justify-between items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary font-body-lg truncate">{item.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                      </div>
                      {item.examples?.[0] && <p className="text-[13px] text-outline truncate">{item.examples[0]}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => act(item, "mark-mastered")}
                        disabled={busy === item.id}
                        className="p-2 text-primary active:scale-90 transition-transform"
                        title="标记已掌握"
                      >
                        <span className="material-symbols-outlined">check_circle</span>
                      </button>
                      <button
                        onClick={() => void openPractice(item)}
                        disabled={busy === item.id || practiceBusy}
                        className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[13px] font-bold active:scale-95 transition-transform disabled:opacity-60"
                      >
                        继续练习
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Review Plan */}
        <section className="space-y-4">
          <div className="glass-card premium-shadow rounded-2xl p-4 bg-gradient-to-br from-white/80 to-primary-fixed/30">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">复习计划</h3>
            {/* TODO(backend): spaced-repetition schedule counts */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "今天", val: queue.filter((q) => q.mastery_score < 80).length },
                { label: "明天", val: Math.max(0, Math.round(queue.length * 0.4)) },
                { label: "3天后", val: Math.max(0, Math.round(queue.length * 0.3)) },
                { label: "7天后", val: crushed.length }
              ].map((d, i) => (
                <div key={d.label} className={`p-2 rounded-lg ${i === 0 ? "bg-white/60" : "bg-white/40"}`}>
                  <p className="text-[12px] text-outline">{d.label}</p>
                  <p className="text-headline-md font-bold text-primary">{d.val}</p>
                </div>
              ))}
            </div>
          </div>
          {crushed.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] text-outline px-1">最近已掌握</p>
              <div className="flex flex-wrap gap-2">
                {crushed.slice(0, 6).map((item) => (
                  <span key={item.id} className="bg-tertiary-container/10 border border-tertiary-fixed-dim text-tertiary-container px-3 py-1 rounded-full text-[13px] inline-flex items-center gap-1">
                    <span className="material-symbols-outlined fill text-[14px]">check_circle</span>
                    {item.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* FAB */}
      {gamified && (
        <button
          onClick={() => void openPractice(gamified)}
          className="fixed bottom-[88px] left-1/2 translate-x-[60px] h-12 px-5 bg-primary text-white rounded-full shadow-lg flex items-center justify-center gap-2 font-bold z-50 pulse-orb active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          开始练习
        </button>
      )}

      {practiceItem && exercise && (
        <PracticeModal
          item={practiceItem}
          exercise={exercise}
          answer={answer}
          busy={practiceBusy}
          result={practiceResult}
          onAnswer={setAnswer}
          onSubmit={() => void submitPractice()}
          onNext={() => void nextPractice()}
          onClose={closePractice}
        />
      )}
    </div>
  );
}
