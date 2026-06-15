import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchThoughts, type Thought } from "../api";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function Thoughts() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchThoughts()
      .then(setThoughts)
      .catch(() => setThoughts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <span className="material-symbols-outlined text-primary fill" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
        <h1 className="font-bold text-[20px] text-primary">思想库</h1>
      </header>

      <main className="px-margin-mobile pt-5 pb-24">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : thoughts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[40px] text-primary">ac_unit</span>
            </div>
            <h2 className="font-bold text-[18px] text-on-surface">还没有冻结的思想</h2>
            <p className="text-[14px] text-on-surface-variant text-center max-w-[260px]">
              在对话页点击 Freeze，将多轮思想沉淀为可复用的表达资产。
            </p>
            <button
              onClick={() => navigate("/chat")}
              className="bg-primary text-white px-6 py-3 rounded-full font-bold text-[14px] shadow-[0_8px_30px_rgba(99,14,212,0.25)] active:scale-95 transition-all"
            >
              去对话
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {thoughts.map((thought) => {
              const versionCount = Object.keys(
                thought.freeze_payload?.expression_versions ?? thought.variants ?? {}
              ).length;
              return (
                <button
                  key={thought.id}
                  onClick={() => navigate(`/thoughts/${thought.id}`)}
                  className="w-full glass-card premium-shadow rounded-2xl p-4 text-left flex justify-between items-start gap-3 active:scale-[0.99] transition-transform"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="font-bold text-[15px] text-on-surface line-clamp-1">{thought.title}</h3>
                    {thought.summary && (
                      <p className="text-[13px] text-on-surface-variant line-clamp-2">{thought.summary}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-primary-fixed text-primary text-[10px] rounded-full font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px] fill" style={{ fontVariationSettings: "'FILL' 1" }}>ac_unit</span>
                        已冻结
                      </span>
                      {thought.topic && (
                        <span className="text-[12px] text-on-surface-variant">{thought.topic}</span>
                      )}
                      <span className="text-[12px] text-on-surface-variant">v{thought.version}</span>
                      {versionCount > 0 && (
                        <span className="text-[12px] text-on-surface-variant">{versionCount} 版本</span>
                      )}
                      <span className="text-[11px] text-outline ml-auto">
                        {formatDate(thought.frozen_at ?? thought.created_at)}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0 mt-0.5">chevron_right</span>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
