import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import TTSButton from "../components/TTSButton";
import VocabularyLadder from "../components/VocabularyLadder";
import { useAuthStore } from "../stores/authStore";

type Example = { target: string; native: string };
type DnaCard = {
  id: string; title: string; rule: string; formula: string;
  examples: Example[]; pitfall: string; drill: string;
};
type EngineItem = {
  concept_id: string; intent: string; target: string; pronunciation: string;
  pattern: string; examples: Example[]; confusable: string; scenario_ids: string[];
};
type ScenarioTurn = {
  concept_id?: string; partner: string; prompt_zh: string; hint: string; target_answer: string;
};
type Scenario = {
  id: string; title: string; goal: string; required_concepts: string[]; turns: ScenarioTurn[];
};
type CourseProgress = {
  language: string;
  current_step: number;
  scenario_index: number;
  turn_index: number;
  completed_steps: number[];
  correct_count: number;
  mistake_count: number;
  total_sessions: number;
  streak_days: number;
  last_practice_on: string | null;
  today_count: number;
  daily_goal: number;
  daily_complete: boolean;
  due_review_count: number;
  due_review_items: Array<{ item_id: string; target?: string; native?: string; mistakes?: number }>;
};
type SprintData = {
  course: {
    code: string; locale: string; voice: string; name: string;
    stage: string; budget: string; method: string;
  };
  dna_cards: DnaCard[];
  engine_items: EngineItem[];
  sentence_lab: {
    intent: string;
    slots: Array<{ id: string; label: string; options: Array<Record<string, unknown>> }>;
    transfer_prompt: string;
  };
  scenarios: Scenario[];
  milestones: Array<{ level: string; count: string; outcome: string }>;
  accuracy_note: string;
  learner: {
    native_language: string;
    current_target_language: string;
    current_level: string;
    review_gap_count: number;
    target_languages: string[];
    progress: CourseProgress;
  };
};
type LanguageOption = {
  code: string; name: string; native_name: string; locale: string; voice: string;
  progress: CourseProgress | null;
};
type CourseCatalog = {
  selected_language: string;
  target_languages: string[];
  languages: LanguageOption[];
};

const STEPS = ["语言 DNA", "功能按钮", "造句流水线", "场景实战", "完成"];
const COURSE_LANGUAGE_KEY = "ainerspeak:survival-language";
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

export default function SurvivalSprint() {
  const navigate = useNavigate();
  const loadProfile = useAuthStore((state) => state.loadProfile);
  const [catalog, setCatalog] = useState<CourseCatalog | null>(null);
  const [language, setLanguage] = useState("");
  const [data, setData] = useState<SprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [expandedDna, setExpandedDna] = useState("");
  const [reviewing, setReviewing] = useState<Set<string>>(new Set());
  const [reviewMessage, setReviewMessage] = useState("");
  const [stateId, setStateId] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [turnIndex, setTurnIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);

  useEffect(() => {
    apiRequest<CourseCatalog>("/api/survival-sprint/catalog")
      .then((result) => {
        setCatalog(result);
        const remembered = localStorage.getItem(COURSE_LANGUAGE_KEY);
        const supported = new Set(result.languages.map((item) => item.code));
        setLanguage(remembered && supported.has(remembered) ? remembered : result.selected_language);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!language) return;
    setLoading(true);
    setReviewMessage("");
    setReviewing(new Set());
    apiRequest<SprintData>(`/api/survival-sprint?language=${encodeURIComponent(language)}`)
      .then((result) => {
        setData(result);
        const progress = result.learner.progress;
        setStep(Math.min(progress.current_step, STEPS.length - 1));
        setScenarioIndex(Math.min(progress.scenario_index, Math.max(0, result.scenarios.length - 1)));
        setTurnIndex(progress.turn_index);
        setExpandedDna(result.dna_cards[0]?.id ?? "");
        setStateId(String(result.sentence_lab.slots[0]?.options[0]?.id ?? ""));
        setPlaceId(String(result.sentence_lab.slots[1]?.options[0]?.id ?? ""));
        setAnswerVisible(false);
      })
      .finally(() => {
        setLoading(false);
        setSwitching(false);
      });
  }, [language]);

  const sentence = useMemo(() => {
    if (!data) return "";
    const state = data.sentence_lab.slots[0]?.options.find((item) => item.id === stateId);
    const place = data.sentence_lab.slots[1]?.options.find((item) => item.id === placeId);
    if (!state || !place) return "";
    const forms = place.forms as Record<string, string>;
    return String(state.value)
      .replace("{place_locative}", forms.locative)
      .replace("{place_accusative}", forms.accusative)
      .replace("{place_genitive}", forms.genitive);
  }, [data, stateId, placeId]);

  function replaceProgress(progress: CourseProgress) {
    setData((current) => current ? {
      ...current,
      learner: { ...current.learner, progress },
    } : current);
  }

  async function switchLanguage(nextLanguage: string) {
    setLanguageMenuOpen(false);
    if (nextLanguage === language) return;
    setSwitching(true);
    localStorage.setItem(COURSE_LANGUAGE_KEY, nextLanguage);
    try {
      await apiRequest("/api/survival-sprint/select-language", {
        method: "POST",
        body: JSON.stringify({ language: nextLanguage }),
      });
      await loadProfile();
      setLanguage(nextLanguage);
    } catch {
      setSwitching(false);
      setReviewMessage("语言切换失败，请稍后重试。");
    }
  }

  async function persistPosition(nextStep: number, nextScenario = scenarioIndex, nextTurn = turnIndex) {
    setStep(nextStep);
    setScenarioIndex(nextScenario);
    setTurnIndex(nextTurn);
    try {
      const progress = await apiRequest<CourseProgress>("/api/survival-sprint/progress", {
        method: "PUT",
        body: JSON.stringify({
          language,
          current_step: nextStep,
          scenario_index: nextScenario,
          turn_index: nextTurn,
        }),
      });
      replaceProgress(progress);
    } catch {
      setReviewMessage("学习位置暂时未保存，请稍后重试。");
    }
  }

  async function addGap(conceptId: string) {
    setReviewMessage("");
    try {
      const result = await apiRequest<{ message: string }>("/api/survival-sprint/review-gap", {
        method: "POST",
        body: JSON.stringify({ concept_id: conceptId, language }),
      });
      setReviewing((current) => new Set(current).add(conceptId));
      setReviewMessage(result.message);
    } catch {
      setReviewMessage("加入复习失败，请稍后再试。");
    }
  }

  function advanceScenario() {
    if (!data) return;
    const currentScenario = data.scenarios[scenarioIndex];
    setAnswerVisible(false);
    if (turnIndex + 1 < currentScenario.turns.length) {
      void persistPosition(3, scenarioIndex, turnIndex + 1);
      return;
    }
    if (scenarioIndex + 1 < data.scenarios.length) {
      void persistPosition(3, scenarioIndex + 1, 0);
      return;
    }
    void persistPosition(4, scenarioIndex, turnIndex);
  }

  async function recordAttempt(correct: boolean) {
    if (!data) return;
    const scenario = data.scenarios[scenarioIndex];
    const turn = scenario?.turns[turnIndex];
    if (!turn) return;
    setSubmittingAttempt(true);
    try {
      const progress = await apiRequest<CourseProgress>("/api/survival-sprint/attempt", {
        method: "POST",
        body: JSON.stringify({
          language,
          activity_type: "scenario",
          item_id: turn.concept_id ?? `${scenario.id}:${turnIndex}`,
          correct,
          expected_answer: turn.target_answer,
          native_meaning: turn.prompt_zh,
          details: { scenario_id: scenario.id, turn_index: turnIndex },
        }),
      });
      replaceProgress(progress);
      advanceScenario();
    } catch {
      setReviewMessage("本轮结果没有保存成功，请重试。");
    } finally {
      setSubmittingAttempt(false);
    }
  }

  if (loading || !catalog) {
    return <div className="min-h-full bg-surface flex items-center justify-center text-primary">正在恢复你的学习进度…</div>;
  }
  if (!data) {
    return <div className="min-h-full bg-surface flex items-center justify-center text-error">课程加载失败</div>;
  }

  const progress = data.learner.progress;
  const scenario = data.scenarios[scenarioIndex];
  const safeTurnIndex = Math.min(turnIndex, Math.max(0, (scenario?.turns.length ?? 1) - 1));
  const turn = scenario?.turns[safeTurnIndex];
  const dailyPercent = Math.min(100, Math.round((progress.today_count / progress.daily_goal) * 100));
  const currentLanguage = catalog.languages.find((item) => item.code === language) ?? catalog.languages[0];

  return (
    <div className="premium min-h-full bg-surface text-on-surface pb-24">
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/20 px-margin-mobile py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/home")} className="material-symbols-outlined text-primary">arrow_back</button>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-[16px] truncate">{data.course.name}</h1>
            <p className="text-[11px] text-on-surface-variant">{data.course.stage} · {STEPS[step]} · 自动保存</p>
          </div>
          <div className="relative shrink-0">
            <motion.button
              type="button"
              aria-label="切换学习语言"
              aria-expanded={languageMenuOpen}
              disabled={switching}
              whileTap={{ scale: 0.96 }}
              onClick={() => setLanguageMenuOpen((open) => !open)}
              className="group flex h-10 items-center gap-2 rounded-full border border-primary/15 bg-surface-container-lowest/90 py-1 pl-1 pr-2.5 shadow-[0_8px_24px_rgba(82,43,180,0.10)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(82,43,180,0.16)] disabled:opacity-60"
            >
              <span className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${LANGUAGE_AURAS[language]} text-[10px] font-black tracking-tight text-white shadow-sm`}>
                <span className="absolute inset-0 rounded-full bg-white/15 animate-pulse-soft" />
                <span className="relative">{LANGUAGE_GLYPHS[language] ?? language.toUpperCase()}</span>
              </span>
              <span className="max-w-[72px] truncate text-[11px] font-bold text-on-surface">
                {switching ? "切换中" : currentLanguage?.native_name}
              </span>
              <motion.span
                animate={{ rotate: languageMenuOpen ? 180 : 0 }}
                className="material-symbols-outlined text-[18px] text-primary"
              >
                expand_more
              </motion.span>
            </motion.button>

            <AnimatePresence>
              {languageMenuOpen && (
                <>
                  <motion.button
                    type="button"
                    aria-label="关闭语言选择"
                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setLanguageMenuOpen(false)}
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
                        <p className="mt-0.5 text-[10px] text-on-surface-variant">每种语言都有独立进度</p>
                      </div>
                      <span className="rounded-full bg-primary/8 px-2 py-1 text-[9px] font-bold text-primary">7 种语言</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {catalog.languages.map((item, index) => {
                        const active = item.code === language;
                        const itemProgress = active ? progress : item.progress;
                        const stage = itemProgress ? STEPS[itemProgress.current_step] : "从 L0 开始";
                        const completion = itemProgress ? ((itemProgress.current_step + 1) / STEPS.length) * 100 : 0;
                        return (
                          <motion.button
                            type="button"
                            key={item.code}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.025 }}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => void switchLanguage(item.code)}
                            className={`relative min-h-[82px] overflow-hidden rounded-2xl border p-2.5 text-left transition ${active ? "border-primary/35 bg-primary/[0.09] shadow-[inset_0_0_0_1px_rgba(101,54,217,0.08)]" : "border-outline-variant/20 bg-surface/65 hover:border-primary/20 hover:bg-primary/[0.04]"}`}
                          >
                            {active && <motion.span layoutId="language-active-glow" className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-primary/15 blur-xl" />}
                            <div className="relative flex items-center gap-2">
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br ${LANGUAGE_AURAS[item.code]} text-[10px] font-black text-white shadow-sm`}>
                                {LANGUAGE_GLYPHS[item.code] ?? item.code.toUpperCase()}
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
                                  className={`h-full rounded-full bg-gradient-to-r ${LANGUAGE_AURAS[item.code]}`}
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
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-surface-container overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <main className="px-margin-mobile pt-5 space-y-4">
        <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">今日快速练习</p>
              <h2 className="mt-1 text-[17px] font-bold">{progress.today_count}/{progress.daily_goal} 轮</h2>
            </div>
            <div className="text-right text-[11px] text-on-surface-variant">
              <p>连续 {progress.streak_days} 天</p>
              <p className={progress.due_review_count ? "text-error font-bold" : ""}>待回炉 {progress.due_review_count}</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${dailyPercent}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-on-surface-variant">
            已自动恢复到 {STEPS[step]}；答错内容会进入原有词汇复习，本课答对后退出当前回炉清单。
          </p>
        </section>

        <VocabularyLadder language={language} />

        {progress.due_review_items.length > 0 && (
          <section className="rounded-2xl border border-error/20 bg-error/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-error">今日优先回炉</p>
                <h2 className="mt-1 text-[15px] font-bold">先重练最近说错的 {progress.due_review_count} 项</h2>
              </div>
              <button onClick={() => navigate(`/vocabulary?language=${language}`)} className="text-[11px] font-bold text-primary">进入错题练习</button>
            </div>
            <div className="mt-3 space-y-2">
              {progress.due_review_items.slice(0, 3).map((item) => (
                <div key={item.item_id} className="flex items-center gap-2 rounded-xl bg-surface-container-lowest px-3 py-2">
                  {item.target && <TTSButton text={item.target} lang={data.course.locale} voice={data.course.voice} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold">{item.target || item.item_id}</p>
                    <p className="truncate text-[10px] text-on-surface-variant">{item.native || `累计错 ${item.mistakes ?? 1} 次`}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {reviewMessage && (
          <div className="rounded-xl bg-primary/10 text-primary px-3 py-2 text-[12px] font-semibold">{reviewMessage}</div>
        )}

        {step === 0 && (
          <>
            <section className="rounded-2xl p-4 bg-gradient-to-br from-primary/15 to-tertiary-fixed/10 border border-primary/15">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">先压缩整门语言</span>
              <h2 className="text-[18px] font-bold mt-1">先抓决定性结构，再进入 500 词阶梯</h2>
              <p className="text-[12px] text-on-surface-variant mt-2 leading-relaxed">{data.course.method}</p>
              <p className="text-[11px] text-on-surface-variant mt-2">{data.course.budget}</p>
            </section>
            {data.dna_cards.map((card, index) => {
              const open = expandedDna === card.id;
              return (
                <section key={card.id} className="rounded-2xl bg-surface-container-lowest border border-outline-variant/25 overflow-hidden">
                  <button className="w-full p-4 text-left flex items-center gap-3" onClick={() => setExpandedDna(open ? "" : card.id)}>
                    <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-bold">{index + 1}</span>
                    <span className="flex-1 font-bold text-[14px]">{card.title}</span>
                    <span className="material-symbols-outlined text-on-surface-variant">{open ? "expand_less" : "expand_more"}</span>
                  </button>
                  {open && <div className="px-4 pb-4 space-y-3">
                    <p className="text-[13px] leading-relaxed">{card.rule}</p>
                    <div className="rounded-xl bg-primary/8 px-3 py-2 text-[12px] font-bold text-primary">{card.formula}</div>
                    {card.examples.map((example) => <div key={example.target} className="flex items-center gap-2">
                      <TTSButton text={example.target} lang={data.course.locale} voice={data.course.voice} />
                      <div><p className="text-[14px] font-semibold">{example.target}</p><p className="text-[11px] text-on-surface-variant">{example.native}</p></div>
                    </div>)}
                    <p className="text-[11px] text-error">易错：{card.pitfall}</p>
                    <p className="text-[11px] font-semibold">立刻练：{card.drill}</p>
                  </div>}
                </section>
              );
            })}
            <button onClick={() => void persistPosition(1)} className="w-full h-11 rounded-xl bg-primary text-white font-bold text-[13px]">开始学习功能按钮</button>
          </>
        )}

        {step === 1 && (
          <>
            <section className="rounded-2xl bg-primary/10 p-4">
              <h2 className="font-bold">不是先背散词，而是先装“语言按钮”</h2>
              <p className="text-[12px] text-on-surface-variant mt-1">每个概念共享稳定 ID，各语言表达、发音和错题记录彼此独立。</p>
            </section>
            <div className="grid grid-cols-1 gap-3">
              {data.engine_items.map((item) => (
                <section key={item.concept_id} className="rounded-2xl p-4 bg-surface-container-lowest border border-outline-variant/25">
                  <div className="flex items-start gap-3">
                    <TTSButton text={item.target} lang={data.course.locale} voice={data.course.voice} size={18} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-[15px]">{item.intent} · {item.target}</h3>
                        <span className="text-[9px] text-primary font-mono">{item.concept_id}</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-1">发音提示：{item.pronunciation}</p>
                      <p className="text-[12px] mt-2 font-semibold">{item.pattern}</p>
                      <p className="text-[12px] mt-2">{item.examples[0]?.target} <span className="text-on-surface-variant">· {item.examples[0]?.native}</span></p>
                      <p className="text-[11px] text-error mt-2">易混：{item.confusable}</p>
                      <button onClick={() => void addGap(item.concept_id)} className="mt-3 text-[11px] font-bold text-primary">
                        {reviewing.has(item.concept_id) ? "✓ 已进复习队列" : "+ 我容易卡住，加入复习"}
                      </button>
                    </div>
                  </div>
                </section>
              ))}
            </div>
            <button onClick={() => void persistPosition(2)} className="w-full h-11 rounded-xl bg-primary text-white font-bold text-[13px]">用按钮造句</button>
          </>
        )}

        {step === 2 && (
          <>
            <section className="rounded-2xl p-5 bg-gradient-to-br from-primary/15 to-secondary-container/10 border border-primary/15">
              <span className="text-[10px] font-bold text-primary uppercase">方向与地点填槽</span>
              <h2 className="text-[18px] font-bold mt-1">{data.sentence_lab.intent}</h2>
              <div className="mt-5 space-y-4">
                <label className="block text-[12px] font-bold">方向</label>
                <div className="grid grid-cols-3 gap-2">
                  {data.sentence_lab.slots[0]?.options.map((option) => <button key={String(option.id)} onClick={() => setStateId(String(option.id))} className={`rounded-xl py-2 text-[12px] font-bold ${stateId === option.id ? "bg-primary text-white" : "bg-surface"}`}>{String(option.label)}</button>)}
                </div>
                <label className="block text-[12px] font-bold">地点</label>
                <div className="grid grid-cols-2 gap-2">
                  {data.sentence_lab.slots[1]?.options.map((option) => <button key={String(option.id)} onClick={() => setPlaceId(String(option.id))} className={`rounded-xl py-2 text-[12px] font-bold ${placeId === option.id ? "bg-primary text-white" : "bg-surface"}`}>{String(option.label)}</button>)}
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-surface-container-lowest p-4 flex items-center gap-3">
                <TTSButton text={sentence} lang={data.course.locale} voice={data.course.voice} size={20} />
                <p className="text-[20px] font-bold">{sentence}</p>
              </div>
            </section>
            <section className="rounded-2xl bg-tertiary-fixed/15 p-4">
              <p className="text-[11px] font-bold text-tertiary-container">换场景复测</p>
              <p className="text-[13px] mt-1 leading-relaxed">{data.sentence_lab.transfer_prompt}</p>
            </section>
            <button onClick={() => void persistPosition(3, 0, 0)} className="w-full h-11 rounded-xl bg-primary text-white font-bold text-[13px]">进入真实场景</button>
          </>
        )}

        {step === 3 && turn && (
          <>
            <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant/25 p-4">
              <div className="flex justify-between gap-3">
                <div><span className="text-[10px] font-bold text-primary">场景 {scenarioIndex + 1}/{data.scenarios.length}</span><h2 className="text-[18px] font-bold mt-1">{scenario.title}</h2></div>
                <span className="text-[11px] text-on-surface-variant">第 {safeTurnIndex + 1}/{scenario.turns.length} 轮</span>
              </div>
              <p className="text-[12px] text-on-surface-variant mt-2">任务：{scenario.goal}</p>
            </section>
            <section className="rounded-2xl bg-primary/8 p-4">
              <p className="text-[12px] text-on-surface-variant">对方</p>
              <p className="text-[15px] font-semibold mt-1">{turn.partner}</p>
            </section>
            <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant/25 p-5">
              <p className="text-[15px] font-bold">轮到你：{turn.prompt_zh}</p>
              <p className="text-[12px] text-primary mt-3">最小提示：{turn.hint}</p>
              {answerVisible ? <div className="mt-4 rounded-xl bg-tertiary-fixed/15 p-3 flex items-center gap-2">
                <TTSButton text={turn.target_answer} lang={data.course.locale} voice={data.course.voice} />
                <span className="font-bold text-[14px]">{turn.target_answer}</span>
              </div> : <button onClick={() => setAnswerVisible(true)} className="mt-4 w-full h-10 rounded-xl border border-primary text-primary font-bold text-[12px]">我尝试过了，显示参考表达</button>}
            </section>
            {answerVisible ? (
              <div className="grid grid-cols-2 gap-3">
                <button disabled={submittingAttempt} onClick={() => void recordAttempt(false)} className="h-11 rounded-xl border border-error text-error font-bold text-[12px]">没说对 · 回炉</button>
                <button disabled={submittingAttempt} onClick={() => void recordAttempt(true)} className="h-11 rounded-xl bg-primary text-white font-bold text-[12px]">说对了 · 下一轮</button>
              </div>
            ) : (
              <p className="text-center text-[11px] text-on-surface-variant">先开口，再对照参考表达；系统会按你的判断保存正确或错误。</p>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <section className="rounded-3xl p-6 text-center bg-gradient-to-br from-primary/15 to-tertiary-fixed/20 border border-primary/15">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary text-white flex items-center justify-center material-symbols-outlined text-[28px]">flag</div>
              <h2 className="text-[21px] font-bold mt-4">第一轮生存闭环完成</h2>
              <p className="text-[13px] text-on-surface-variant mt-2">本语言累计答对 {progress.correct_count}，答错 {progress.mistake_count}。固定课负责高频骨架，错题交给复习系统，LLM 教练用于解释与变体练习。</p>
            </section>
            <div className="space-y-2">
              {data.milestones.map((milestone) => <div key={milestone.level} className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-3 flex gap-3"><span className="font-bold text-primary w-8">{milestone.level}</span><div><p className="text-[12px] font-bold">{milestone.count}</p><p className="text-[11px] text-on-surface-variant">{milestone.outcome}</p></div></div>)}
            </div>
            <p className="text-[11px] text-error text-center">{data.accuracy_note}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate(`/vocabulary?language=${language}`)} className="h-11 rounded-xl border border-primary text-primary font-bold text-[12px]">去复习缺口</button>
              <button onClick={() => { setAnswerVisible(false); void persistPosition(0, 0, 0); }} className="h-11 rounded-xl bg-primary text-white font-bold text-[12px]">再练一轮</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
