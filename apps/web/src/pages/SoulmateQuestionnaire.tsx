import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Heart, Sparkles } from "lucide-react";
import { apiRequest } from "../api";

type Step = {
  key: "emotional_values" | "lifestyle_prefs" | "relationship_goals";
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  options: { value: string; label: string; emoji: string; desc: string }[];
};

const STEPS: Step[] = [
  {
    key: "emotional_values",
    title: "情感价值观",
    subtitle: "在亲密关系中，什么对你最重要？",
    emoji: "💜",
    color: "from-[#8b5cf6] to-[#6366f1]",
    options: [
      { value: "trust", label: "信任与忠诚", emoji: "🤝", desc: "坦诚、承诺、长期稳定" },
      { value: "communication", label: "坦诚沟通", emoji: "💬", desc: "直接表达、积极倾听" },
      { value: "independence", label: "尊重独立", emoji: "🦋", desc: "保有自我空间与边界" },
      { value: "growth", label: "共同成长", emoji: "🌱", desc: "相互激励、持续进步" },
      { value: "stability", label: "安全感", emoji: "🏡", desc: "稳定、可预期、可依赖" },
      { value: "adventure", label: "探索冒险", emoji: "🌍", desc: "开放体验、打破边界" },
    ],
  },
  {
    key: "lifestyle_prefs",
    title: "生活方式",
    subtitle: "哪些生活方式最符合你的状态？",
    emoji: "✨",
    color: "from-[#6366f1] to-[#3b82f6]",
    options: [
      { value: "introvert", label: "享受独处", emoji: "📚", desc: "安静、深思、充电型" },
      { value: "extrovert", label: "热爱社交", emoji: "🎉", desc: "人群中感到充实" },
      { value: "night_owl", label: "夜猫子", emoji: "🦉", desc: "深夜是最有创意的时刻" },
      { value: "early_bird", label: "早起型", emoji: "☀️", desc: "清晨计划、高效执行" },
      { value: "healthy", label: "健康生活", emoji: "🥗", desc: "运动、饮食、作息规律" },
      { value: "digital", label: "数字游民", emoji: "💻", desc: "远程工作、全球流动" },
    ],
  },
  {
    key: "relationship_goals",
    title: "关系目标",
    subtitle: "你在这段语言交流关系中期待什么？",
    emoji: "🎯",
    color: "from-[#ec4899] to-[#8b5cf6]",
    options: [
      { value: "language_partner", label: "长期语伴", emoji: "🗣️", desc: "持续练习、互相陪伴" },
      { value: "friendship", label: "深度友谊", emoji: "🌸", desc: "超越语言的真实连接" },
      { value: "study_buddy", label: "学习伙伴", emoji: "📖", desc: "共同打卡、目标一致" },
      { value: "culture_exchange", label: "文化交流", emoji: "🌐", desc: "了解不同世界的视角" },
      { value: "casual", label: "轻松练习", emoji: "😊", desc: "低压力、随时开始" },
      { value: "mentor", label: "互为导师", emoji: "🎓", desc: "互相指导、共同提升" },
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
  const progress = ((step + 1) / STEPS.length) * 100;

  function toggle(value: string) {
    setSelections((prev) => {
      const arr = prev[current.key];
      return {
        ...prev,
        [current.key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
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
    } catch { /* ignore */ }
    setSaving(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#fdf2f8] via-[#f5f3ff] to-[#eef2ff] flex flex-col items-center justify-center px-6 gap-5">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] flex items-center justify-center shadow-xl">
          <Sparkles size={48} className="text-white" />
        </div>
        <div className="text-center">
          <h2 className="font-extrabold text-[#111827] text-2xl mb-2">画像完成！</h2>
          <p className="text-[#6b7280] text-[13px] leading-relaxed">你的 Soulmate 画像已更新，<br />现在可以开启深度匹配了</p>
        </div>
        <div className="w-full max-w-sm bg-white rounded-[20px] p-4 shadow-sm border border-[#f5f3ff]">
          <h4 className="font-bold text-[#111827] text-sm mb-3">你的画像标签</h4>
          <div className="flex flex-wrap gap-1.5">
            {[...selections.emotional_values, ...selections.lifestyle_prefs, ...selections.relationship_goals].map((v) => {
              const opt = STEPS.flatMap((s) => s.options).find((o) => o.value === v);
              return opt ? (
                <span key={v} className="bg-[#f5f3ff] text-[#6366f1] px-2.5 py-1 rounded-full text-[10px] font-bold border border-[#ede9fe]">
                  {opt.emoji} {opt.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
        <button
          onClick={() => navigate("/match")}
          className="w-full max-w-sm h-12 bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white rounded-full font-bold text-[15px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Heart size={18} className="fill-white" /> 开启 Soulmate 匹配
        </button>
        <button onClick={() => navigate(-1)} className="text-[12px] text-[#9ca3af]">暂时跳过</button>
      </div>
    );
  }

  const canNext = selections[current.key].length > 0;

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className={`fixed top-0 left-0 w-full h-[200px] bg-gradient-to-br ${current.color} opacity-8 pointer-events-none z-0`} />

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 h-14 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <button
          onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate(-1))}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-[#111827]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-[#111827] text-[15px]">Soulmate 画像</h1>
          <p className="text-[10px] text-[#6b7280]">步骤 {step + 1} / {STEPS.length}</p>
        </div>
        <div className="text-sm font-bold text-[#8b5cf6]">{Math.round(progress)}%</div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-100 shrink-0">
        <div
          className={`h-full bg-gradient-to-r ${current.color} rounded-full transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-28 no-scrollbar relative z-10">
        {/* Step Header */}
        <div className="flex flex-col items-center text-center mb-6 gap-2">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg`}>
            <span className="text-3xl">{current.emoji}</span>
          </div>
          <h2 className="font-extrabold text-[#111827] text-xl">{current.title}</h2>
          <p className="text-[13px] text-[#6b7280]">{current.subtitle}</p>
          <span className="text-[11px] text-[#8b5cf6] bg-[#f5f3ff] px-3 py-0.5 rounded-full font-medium border border-[#ede9fe]">可多选</span>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-3">
          {current.options.map((opt) => {
            const selected = selections[current.key].includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={`bg-white rounded-2xl p-4 text-left flex flex-col gap-2 active:scale-95 transition-all shadow-sm border-2 ${
                  selected ? "border-[#8b5cf6] bg-[#f5f3ff]" : "border-gray-100"
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className={`text-[13px] font-bold ${selected ? "text-[#6d28d9]" : "text-[#111827]"}`}>{opt.label}</p>
                  <p className="text-[10px] text-[#9ca3af] mt-0.5 leading-snug">{opt.desc}</p>
                </div>
                {selected && (
                  <div className="self-end w-5 h-5 rounded-full bg-[#8b5cf6] flex items-center justify-center">
                    <Check size={11} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-5 pt-3 pb-[env(safe-area-inset-bottom,16px)] z-50">
        <button
          onClick={() => void handleNext()}
          disabled={!canNext || saving}
          className={`w-full h-12 bg-gradient-to-r ${current.color} text-white rounded-full font-bold text-[15px] shadow-md active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2`}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : step < STEPS.length - 1 ? (
            <> 下一步 <ArrowRight size={18} /> </>
          ) : (
            <> 完成并保存 <Check size={18} /> </>
          )}
        </button>
      </div>
    </div>
  );
}
