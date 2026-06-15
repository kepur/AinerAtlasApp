import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api";

type RoomSummary = {
  room_id: string;
  title: string;
  status: string;
  summary: Record<string, unknown>;
  message_count: number;
  user_message_count: number;
  grammar_tips: { pattern: string; explanation: string }[];
  key_expressions: string[];
};

export default function CircleSummary() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<RoomSummary | null>(null);

  useEffect(() => {
    if (!roomId) return;
    apiRequest<RoomSummary>(`/api/circles/${roomId}/summary`)
      .then(setData)
      .catch(() => {});
  }, [roomId]);

  const summaryText = data?.summary
    ? typeof data.summary === "string"
      ? data.summary
      : (data.summary as Record<string, unknown>).summary as string | undefined
    : undefined;

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <h1 className="font-bold text-[16px] text-on-surface">讨论回顾</h1>
      </header>

      <main className="px-margin-mobile pt-5 pb-24 space-y-5">
        {/* Summary hero */}
        <section className="glass-card premium-shadow rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none" />
          <div className="relative z-10">
            <span className="material-symbols-outlined text-[48px] text-primary fill" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
            <h2 className="font-bold text-[20px] text-on-surface mt-3 mb-2">
              {data?.title || "小组总结"}
            </h2>
            <p className="text-[14px] text-on-surface-variant">
              {summaryText || "AI 已为您生成本次讨论的详细语法和词汇报告。"}
            </p>
          </div>
        </section>

        {/* Key stats */}
        <section className="grid grid-cols-3 gap-3">
          {[
            {
              val: String(data?.user_message_count ?? "—"),
              label: "发言次数",
              icon: "chat_bubble",
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              val: String(data?.grammar_tips.length ?? "—"),
              label: "语法提示",
              icon: "spellcheck",
              color: "text-tertiary-container",
              bg: "bg-tertiary-container/10",
            },
            {
              val: String(data?.key_expressions.length ?? "—"),
              label: "精彩表达",
              icon: "auto_awesome",
              color: "text-secondary-container",
              bg: "bg-secondary-container/10",
            },
          ].map((s) => (
            <div key={s.label} className="glass-card premium-shadow rounded-2xl p-4 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                <span className={`material-symbols-outlined text-[20px] ${s.color}`}>{s.icon}</span>
              </div>
              <p className={`font-bold text-[20px] ${s.color}`}>{s.val}</p>
              <p className="text-[11px] text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Key expressions */}
        {((data?.key_expressions.length ?? 0) > 0) && (
          <section className="glass-card premium-shadow rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-[16px] text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">lightbulb</span>
              本次精彩表达
            </h3>
            {data!.key_expressions.map((q, i) => (
              <div key={i} className="bg-surface-container-low p-3 rounded-xl border-l-2 border-primary/30">
                <p className="text-[14px] text-on-surface italic">"{q}"</p>
              </div>
            ))}
          </section>
        )}

        {/* Grammar tips */}
        {((data?.grammar_tips.length ?? 0) > 0) && (
          <section className="glass-card premium-shadow rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-[16px] text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">spellcheck</span>
              语法要点
            </h3>
            <div className="flex flex-wrap gap-2">
              {data!.grammar_tips.map((tip, i) => (
                <div key={i} className="px-3 py-2 bg-primary/5 border border-primary/15 rounded-xl">
                  <p className="text-[13px] font-bold text-primary">{tip.pattern}</p>
                  <p className="text-[12px] text-on-surface-variant mt-0.5">{tip.explanation}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Placeholder when no data */}
        {!data && (
          <section className="glass-card premium-shadow rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-[16px] text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">lightbulb</span>
              本次精彩表达
            </h3>
            {[
              "The relationship between creativity and technology is not adversarial.",
              "We need to preserve the human element in automated systems.",
            ].map((q, i) => (
              <div key={i} className="bg-surface-container-low p-3 rounded-xl border-l-2 border-primary/30">
                <p className="text-[14px] text-on-surface italic">"{q}"</p>
              </div>
            ))}
          </section>
        )}

        <button
          onClick={() => navigate(-1)}
          className="w-full h-12 bg-primary text-white rounded-full font-bold text-[15px] shadow-[0_8px_30px_rgba(99,14,212,0.25)] active:scale-95 transition-all"
        >
          完成
        </button>
      </main>
    </div>
  );
}
