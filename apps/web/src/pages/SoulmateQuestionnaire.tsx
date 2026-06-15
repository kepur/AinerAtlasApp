import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

type Step = {
  key: "emotional_values" | "lifestyle_prefs" | "relationship_goals";
  title: string;
  subtitle: string;
  icon: string;
  options: { value: string; label: string; emoji: string }[];
};

const STEPS: Step[] = [
  {
    key: "emotional_values",
    title: "情感价值观",
    subtitle: "在亲密关系中，什么对你最重要？",
    icon: "favorite",
    options: [
      { value: "trust", label: "信任与忠诚", emoji: "🤝" },
      { value: "communication", label: "坦诚沟通", emoji: "💬" },
      { value: "independence", label: "尊重独立", emoji: "🦋" },
      { value: "growth", label: "共同成长", emoji: "🌱" },
      { value: "stability", label: "安全感", emoji: "🏡" },
      { value: "adventure", label: "探索冒险", emoji: "🌍" },
    ],
  },
  {
    key: "lifestyle_prefs",
    title: "生活方式",
    subtitle: "哪些生活方式最符合你的状态？",
    icon: "self_improvement",
    options: [
      { value: "introvert", label: "享受独处", emoji: "📚" },
      { value: "extrovert", label: "热爱社交", emoji: "🎉" },
      { value: "night_owl", label: "夜猫子", emoji: "🦉" },
      { value: "early_bird", label: "早起型", emoji: "☀️" },
      { value: "healthy", label: "健康生活", emoji: "🥗" },
      { value: "digital", label: "数字游民", emoji: "💻" },
    ],
  },
  {
    key: "relationship_goals",
    title: "关系目标",
    subtitle: "你在这段语言学习关系中期待什么？",
    icon: "hub",
    options: [
      { value: "language_partner", label: "长期语伴", emoji: "🗣️" },
      { value: "friendship", label: "深度友谊", emoji: "🌸" },
      { value: "study_buddy", label: "学习伙伴", emoji: "📖" },
      { value: "culture_exchange", label: "文化交流", emoji: "🌐" },
      { value: "casual", label: "轻松练习", emoji: "😊" },
      { value: "mentor", label: "互为导师", emoji: "🎓" },
    ],
  },
];

export default function SoulmateQuestionnaire() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({
    emotional_values: [],
    lifestyle_prefs: [],
    relationship_goals: [],
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const current = STEPS[step];

  function toggle(value: string) {
    setSelections((prev) => {
      const arr = prev[current.key];
      return {
        ...prev,
        [current.key]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  }

  function canNext() {
    return selections[current.key].length > 0;
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/api/connect/values", {
        method: "PUT",
        body: JSON.stringify({
          emotional_values: selections.emotional_values,
          lifestyle_prefs: selections.lifestyle_prefs,
          relationship_goals: selections.relationship_goals,
        }),
      });
      setDone(true);
    } catch { /* ignore */ }
    setSaving(false);
  }

  if (done) {
    return (
      <div className="premium min-h-full bg-surface text-on-surface flex flex-col items-center justify-center gap-6 px-margin-mobile">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[48px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
        </div>
        <h2 className="font-bold text-[24px] text-on-surface text-center">问卷完成！</h2>
        <p className="text-[14px] text-on-surface-variant text-center">你的 Soulmate 画像已更新，现在可以开启深度匹配了</p>
        <button
          onClick={() => navigate("/match")}
          className="bg-primary text-white px-8 py-3 rounded-full font-bold text-[15px] shadow-[0_8px_30px_rgba(99,14,212,0.25)] active:scale-95 transition-all"
        >
          开启 Soulmate 匹配
        </button>
      </div>
    );
  }

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate(-1))} className="material-symbols-outlined text-primary">arrow_back</button>
        <div className="flex-1">
          <h1 className="font-bold text-[16px] text-on-surface">Soulmate 画像</h1>
          <p className="text-[11px] text-on-surface-variant">步骤 {step + 1} / {STEPS.length}</p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 w-full bg-surface-container">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <main className="px-margin-mobile pt-8 pb-32 space-y-6">
        {/* Step header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{current.icon}</span>
          </div>
          <h2 className="font-bold text-[22px] text-on-surface">{current.title}</h2>
          <p className="text-[14px] text-on-surface-variant">{current.subtitle}</p>
          <p className="text-[12px] text-primary">可多选</p>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-3">
          {current.options.map((opt) => {
            const selected = selections[current.key].includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={`glass-card rounded-2xl p-4 text-left flex flex-col gap-2 active:scale-95 transition-all border-2 ${selected ? "border-primary bg-primary/5" : "border-transparent"}`}
              >
                <span className="text-[24px]">{opt.emoji}</span>
                <span className={`text-[14px] font-bold ${selected ? "text-primary" : "text-on-surface"}`}>{opt.label}</span>
                {selected && (
                  <span className="material-symbols-outlined text-[16px] text-primary self-end" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-margin-mobile pb-8 pt-4 bg-gradient-to-t from-surface to-transparent">
        <button
          onClick={() => void handleNext()}
          disabled={!canNext() || saving}
          className="w-full h-14 bg-primary text-white rounded-full font-bold text-[16px] shadow-[0_8px_30px_rgba(99,14,212,0.25)] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : step < STEPS.length - 1 ? (
            <>下一步 <span className="material-symbols-outlined">arrow_forward</span></>
          ) : (
            <>完成并保存 <span className="material-symbols-outlined">check</span></>
          )}
        </button>
      </div>
    </div>
  );
}
