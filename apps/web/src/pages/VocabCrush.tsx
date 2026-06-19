import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchVocabulary, ignoreVocabulary, markVocabMastered, practiceVocabulary, type VocabItem } from "../api";
import { useAuthStore } from "../stores/authStore";

const STATUS_LABELS: Record<string, string> = {
  unseen: "未见过",
  seen: "已见过",
  understood: "可理解",
  usable: "可使用",
  mastered: "已掌握",
  reviewing: "复习中",
  ignored: "已忽略"
};

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
            className={"flex-1 h-10 rounded-full text-[14px] font-bold transition-all " + (active ? "bg-primary text-white shadow-md" : "text-on-surface-variant")}
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

export default function VocabCrush() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [items, setItems] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const data = await fetchVocabulary();
      setItems(data.filter((i) => i.mastery_status !== "mastered" && i.mastery_status !== "ignored"));
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  async function act(id: string, action: "practice" | "master" | "ignore") {
    setBusy(id);
    try {
      if (action === "practice") await practiceVocabulary(id);
      else if (action === "master") await markVocabMastered(id);
      else await ignoreVocabulary(id);
      await loadItems();
    } catch {
      /* ignore */
    }
    setBusy(null);
  }

  const crushed = items.filter((i) => i.mastery_score >= 80);
  const focus = [...items].sort((a, b) => a.mastery_score - b.mastery_score).slice(0, 3);
  const gamified = focus[0];

  const grammar = Math.round(profile?.grammar_level_score ?? 0);
  const expression = Math.round(profile?.vocabulary_level_score ?? 0);
  const fluency = Math.round(profile?.fluency_score ?? 0);
  const review = items.length ? Math.round((crushed.length / items.length) * 100) : 0;

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 px-margin-mobile h-touch-target-min flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/profile")} className="material-symbols-outlined text-primary">menu</button>
          <h1 className="font-headline-lg text-[26px] font-bold text-primary">Crush</h1>
        </div>
        <div className="flex items-center bg-surface-container-lowest/50 px-3 py-1 rounded-full border border-outline-variant/30">
          <span className="text-[13px] text-primary">🔥 {crushed.length} 连续学习</span>
        </div>
      </header>

      <main className="px-margin-mobile pb-8 space-y-8 pt-4">
        <p className="font-body-md text-on-surface-variant">把高价值词汇一点点拿下</p>

        <CrushTabsPremium />

        {/* Today Focus */}
        <section className="glass-card premium-shadow rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">今日待掌握</h2>
              <p className="text-[13px] text-on-surface-variant">这些词汇来自你的真实对话，越用越自然</p>
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
        </section>

        {/* Learning Radar */}
        <section className="space-y-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">学习雷达</h2>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            <RadarRing label="Grammar" value={grammar} color="#630ed4" />
            <RadarRing label="Vocabulary" value={expression} color="#00885d" />
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
              <h2 className="font-headline-md text-headline-md text-on-surface">词汇消消乐</h2>
              <span className="text-[13px] text-primary">{crushed.length} / {items.length} 已掌握</span>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl space-y-2 mb-4">
              <p className="text-primary font-headline-md font-bold">{gamified.word}</p>
              {gamified.translation && <p className="text-on-surface-variant font-body-md">{gamified.translation}</p>}
              {gamified.examples?.[0] && <p className="text-on-surface-variant text-[13px] italic">"{gamified.examples[0]}"</p>}
            </div>
            <button
              onClick={() => act(gamified.id, "practice")}
              disabled={busy === gamified.id}
              className="w-full bg-primary text-white h-11 rounded-full font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              继续闯关
            </button>
          </section>
        )}

        {/* Queue */}
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
                    {item.translation && <p className="text-[13px] text-outline truncate">{item.translation}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => act(item.id, "master")} disabled={busy === item.id} className="p-2 text-primary active:scale-90 transition-transform" title="标记已掌握">
                      <span className="material-symbols-outlined">check_circle</span>
                    </button>
                    <button
                      onClick={() => act(item.id, "practice")}
                      disabled={busy === item.id}
                      className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[13px] font-bold active:scale-95 transition-transform disabled:opacity-60"
                    >
                      继续练习
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {gamified && (
        <button
          onClick={() => act(gamified.id, "practice")}
          className="fixed bottom-[88px] left-1/2 translate-x-[60px] h-12 px-5 bg-primary text-white rounded-full shadow-lg flex items-center justify-center gap-2 font-bold z-50 pulse-orb active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          开始练习
        </button>
      )}
    </div>
  );
}
