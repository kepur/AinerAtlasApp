import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuthStore } from "../stores/authStore";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LANGUAGES = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "sr", label: "Srpski" }
];
const GOALS = ["日常聊天", "面试求职", "商务沟通", "社交拓展", "写作表达", "Vlog 创作", "学术研究", "旅行交流"];
const TOPICS = ["人生规划", "AI 与科技", "创业商业", "情感关系", "移民生活", "文化差异", "健康生活", "艺术设计", "金融投资", "教育成长"];
const CORRECTION_STYLES = [
  { value: "gentle", label: "温和", desc: "只纠正重要错误，鼓励为主" },
  { value: "balanced", label: "平衡", desc: "适度纠正，兼顾鼓励和改进" },
  { value: "strict", label: "严格", desc: "严格纠正每个错误，追求精准" }
];
const COACH_STYLES = [
  { value: "socratic", label: "苏格拉底追问", desc: "通过深度提问引导思考" },
  { value: "structured", label: "结构化教学", desc: "系统讲解语法和表达" },
  { value: "immersive", label: "沉浸式对话", desc: "自然对话中潜移默化提升" }
];

const STEP_LABELS = ["基础设定", "当前水平", "学习目标", "兴趣话题", "AI 教练偏好"];
const TOTAL = 5;

function Chip({ active, onClick, children, full }: { active: boolean; onClick: () => void; children: React.ReactNode; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={
        (full ? "w-full " : "") +
        "px-5 h-11 rounded-full inline-flex items-center justify-center gap-1 whitespace-nowrap text-body-md transition-all active:scale-95 border " +
        (active
          ? "bg-primary text-white border-primary shadow-md"
          : "glass-card premium-shadow text-on-surface-variant border-transparent")
      }
    >
      {children}
    </button>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [nativeLang, setNativeLang] = useState("zh");
  const [targetLang, setTargetLang] = useState("en");
  const [level, setLevel] = useState("B1");
  const [goals, setGoals] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [correction, setCorrection] = useState("balanced");
  const [coach, setCoach] = useState("socratic");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const loadProfile = useAuthStore((s) => s.loadProfile);

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void) {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await apiRequest("/api/profile/onboarding", {
        method: "POST",
        body: JSON.stringify({
          native_language: nativeLang,
          target_languages: [targetLang],
          primary_target_language: targetLang,
          current_level: level,
          learning_goals: goals,
          favorite_topics: topics,
          correction_style: correction,
          coach_style: coach,
          explanation_language: nativeLang,
          ui_language: nativeLang
        })
      });
      await loadProfile();
      navigate("/home", { replace: true });
    } catch {
      setSubmitting(false);
    }
  }

  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <div className="premium relative min-h-full bg-surface text-on-surface flex flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />

      <main className="relative flex-1 px-margin-mobile pt-12 pb-44 flex flex-col">
        {/* Header */}
        <header className="flex flex-col items-start gap-2 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-[32px]">bubble_chart</span>
            <span className="font-headline-lg text-[26px] font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">AinerWise</span>
          </div>
          <h1 className="font-headline-lg text-[26px] text-on-surface">让 AI 更了解你</h1>
          <p className="font-body-md text-on-surface-variant opacity-80 leading-relaxed">这些信息会帮助 AI 给你更适合的表达建议和学习路径。</p>
        </header>

        {/* Progress */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[12px] text-primary font-semibold uppercase tracking-wider">Step {step + 1} / {TOTAL}</span>
            <span className="text-[13px] text-outline">{STEP_LABELS[step]}</span>
          </div>
          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </section>

        {/* Content */}
        <div className="flex-grow space-y-8">
          {step === 0 && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-md text-headline-md">你的母语是？</h2>
                  <span className="text-[12px] text-outline opacity-60">Native Language</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {LANGUAGES.map((l) => (
                    <Chip key={l.code} active={nativeLang === l.code} onClick={() => setNativeLang(l.code)}>
                      {l.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-md text-headline-md">你想学习的目标语言？</h2>
                  <span className="text-[12px] text-outline opacity-60">Target Language</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {LANGUAGES.filter((l) => l.code !== nativeLang).map((l) => (
                    <Chip key={l.code} active={targetLang === l.code} onClick={() => setTargetLang(l.code)}>
                      {l.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-headline-md">你现在大概什么水平？</h2>
                <span className="text-[12px] text-outline opacity-60">Current Level</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {LEVELS.map((l) => (
                  <Chip key={l} active={level === l} onClick={() => setLevel(l)} full>
                    {l}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-headline-md text-headline-md">你想提升哪些方面的表达？<span className="text-[12px] text-outline opacity-60 ml-1">可多选</span></h2>
              <div className="flex flex-wrap gap-3">
                {GOALS.map((g) => (
                  <Chip key={g} active={goals.includes(g)} onClick={() => toggleItem(goals, g, setGoals)}>
                    {goals.includes(g) && <span className="material-symbols-outlined text-[16px]">check</span>}
                    {g}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-headline-md text-headline-md">你平时喜欢聊什么？<span className="text-[12px] text-outline opacity-60 ml-1">可多选</span></h2>
              <div className="flex flex-wrap gap-3">
                {TOPICS.map((tp) => (
                  <Chip key={tp} active={topics.includes(tp)} onClick={() => toggleItem(topics, tp, setTopics)}>
                    {topics.includes(tp) && <span className="material-symbols-outlined text-[16px]">check</span>}
                    {tp}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <div className="space-y-3">
                <h3 className="font-headline-md text-headline-md">纠错偏好</h3>
                {CORRECTION_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setCorrection(s.value)}
                    className={
                      "w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.99] " +
                      (correction === s.value ? "border-2 border-primary bg-[#fefcff]" : "glass-card premium-shadow border-transparent")
                    }
                  >
                    <strong className="block text-on-surface">{s.label}</strong>
                    <span className="text-[13px] text-on-surface-variant">{s.desc}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="font-headline-md text-headline-md">教练风格</h3>
                {COACH_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setCoach(s.value)}
                    className={
                      "w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.99] " +
                      (coach === s.value ? "border-2 border-primary bg-[#fefcff]" : "glass-card premium-shadow border-transparent")
                    }
                  >
                    <strong className="block text-on-surface">{s.label}</strong>
                    <span className="text-[13px] text-on-surface-variant">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="premium fixed bottom-0 left-1/2 -translate-x-1/2 w-[min(100%,430px)] px-margin-mobile pt-6 pb-6 bg-gradient-to-t from-surface via-surface/95 to-transparent z-50">
        {step === 0 && (
          <div className="flex items-start gap-2 max-w-[320px] mx-auto mb-4">
            <span className="material-symbols-outlined text-outline text-[18px] mt-0.5">lock_open</span>
            <p className="text-[13px] text-on-surface-variant text-center opacity-70 leading-relaxed">你的私人思想资产默认不会公开，匹配和公开功能需要你主动开启。</p>
          </div>
        )}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-12 h-12 flex-shrink-0 rounded-full glass-card premium-shadow flex items-center justify-center text-on-surface-variant active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          {step < TOTAL - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 h-12 bg-primary text-white font-headline-md text-[16px] font-bold rounded-full shadow-[0_8px_30px_rgba(99,14,212,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              下一步
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-12 bg-primary text-white font-headline-md text-[16px] font-bold rounded-full shadow-[0_8px_30px_rgba(99,14,212,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? "保存中..." : "开始使用"}
              {!submitting && <span className="material-symbols-outlined">rocket_launch</span>}
            </button>
          )}
        </div>
        {step === 0 && (
          <button onClick={() => navigate("/home")} className="w-full h-10 mt-2 text-on-surface-variant text-[13px] active:opacity-60 transition-opacity">
            稍后再说
          </button>
        )}
      </footer>
    </div>
  );
}
