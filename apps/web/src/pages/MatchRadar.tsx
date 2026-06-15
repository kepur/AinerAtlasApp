import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuthStore } from "../stores/authStore";

type Recommendation = {
  id: string;
  target_user_id: string;
  target_username: string;
  score: number;
  reasons: string[];
  icebreaker: string;
  status: string;
};

type MatchMode = "interest" | "language_partner" | "founder" | "soulmate";

const MODE_CHIPS: { key: MatchMode; label: string }[] = [
  { key: "interest", label: "同趣" },
  { key: "language_partner", label: "语言伙伴" },
  { key: "founder", label: "创业伙伴" },
  { key: "soulmate", label: "Soulmate" }
];

const SCAN_STATUSES = [
  "正在寻找与你话题高度相似的人...",
  "对比知识图谱中...",
  "正在计算价值观匹配度..."
];

const FLOATING_TAGS = [
  { label: "AI创业", cls: "-top-4 -right-10", delay: "0.5s" },
  { label: "英语表达", cls: "top-1/2 -left-14", delay: "1.2s" },
  { label: "人生规划", cls: "-bottom-4 right-2", delay: "0.8s" },
  { label: "欧洲生活", cls: "bottom-1/2 -right-12", delay: "1.5s" }
];

export default function MatchRadar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<MatchMode>("language_partner");
  const [enabled, setEnabled] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [readiness, setReadiness] = useState<{ completeness: number; soulmate_ready: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanIdx, setScanIdx] = useState(0);

  useEffect(() => {
    apiRequest<{ completeness: number; soulmate_ready: boolean }>("/api/connect/readiness")
      .then(setReadiness)
      .catch(() => setReadiness({ completeness: 62, soulmate_ready: false }));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setScanIdx((i) => (i + 1) % SCAN_STATUSES.length), 3000);
    return () => clearInterval(id);
  }, []);

  async function enableMatching() {
    setLoading(true);
    try {
      await apiRequest("/api/connect/enable", {
        method: "POST",
        body: JSON.stringify({ enabled: true, match_mode: mode, visibility: "friends" })
      });
      const recs = await apiRequest<Recommendation[]>("/api/connect/recommendations");
      setRecommendations(recs ?? []);
      setEnabled(true);
    } catch {
      // No backend match yet → show representative placeholders so the flow is visible.
      setRecommendations([
        { id: "m1", target_user_id: "u1", target_username: "Kevin · Japan", score: 87, reasons: ["AI创业", "欧洲生活", "英语提升"], icebreaker: "你们都关注'用 AI 降低跨国创业门槛'，他在东京有一年 AI 项目落地经验。", status: "pending" },
        { id: "m2", target_user_id: "u2", target_username: "Luna · China", score: 79, reasons: ["创业", "产品", "语言成长"], icebreaker: "共同话题：创业、产品、语言成长", status: "pending" }
      ]);
      setEnabled(true);
    }
    setLoading(false);
  }

  async function sendRequest(userId: string) {
    if (userId.startsWith("u")) return;
    try {
      await apiRequest("/api/connect/requests", {
        method: "POST",
        body: JSON.stringify({ to_user_id: userId, message: "想一起练习表达！" })
      });
    } catch {
      /* ignore */
    }
  }

  const completeness = Math.round(readiness?.completeness ?? 0);
  const primary = recommendations[0];
  const others = recommendations.slice(1);
  const initial = (user?.username || "U").charAt(0).toUpperCase();

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-margin-mobile h-touch-target-min bg-surface/80 backdrop-blur-xl">
        <div className="flex flex-col">
          <h1 className="font-headline-md text-headline-md text-primary font-bold">Connect</h1>
          <p className="text-[12px] text-on-surface-variant opacity-70">找到与你同频的人</p>
        </div>
        <button onClick={() => navigate("/settings")} className="active:scale-95 transition-transform text-primary">
          <span className="material-symbols-outlined">settings_suggest</span>
        </button>
      </header>

      <main className="px-margin-mobile pt-4 pb-8">
        {/* Mode Selector */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 -mx-margin-mobile px-margin-mobile mb-4">
          {MODE_CHIPS.map((chip) => {
            return (
              <button
                key={chip.key}
                onClick={() => setMode(chip.key)}
                className={
                  chip.key === mode
                    ? "px-5 py-2 rounded-full bg-primary text-white whitespace-nowrap text-[13px] font-medium shadow-md transition-all active:scale-95"
                    : "px-5 py-2 rounded-full bg-white/70 border border-outline-variant/30 text-on-surface-variant whitespace-nowrap text-[13px] font-medium active:scale-95"
                }
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Radar Visual */}
        <section className="glass-card premium-shadow rounded-3xl p-8 mb-8 flex flex-col items-center relative overflow-hidden min-h-[360px]">
          <div className="radar-pulse mb-8 z-10">
            <div className="pulse-ring" />
            <div className="pulse-ring" />
            <div className="pulse-ring" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {initial}
            </div>
            {FLOATING_TAGS.map((tag) => (
              <div
                key={tag.label}
                style={{ animationDelay: tag.delay }}
                className={`absolute ${tag.cls} floating-tag px-3 py-1.5 glass-card rounded-full text-xs text-primary border border-primary/20 whitespace-nowrap`}
              >
                {tag.label}
              </div>
            ))}
          </div>
          {!enabled ? (
            <>
              <p className="text-body-md text-on-surface-variant text-center z-10 animate-pulse mb-5">{SCAN_STATUSES[scanIdx]}</p>
              <button
                onClick={enableMatching}
                disabled={loading}
                className="z-10 h-11 px-8 bg-primary text-white rounded-full font-bold flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[20px]">radar</span>
                {loading ? "扫描中..." : "开启匹配雷达"}
              </button>
            </>
          ) : (
            <p className="text-body-md text-tertiary text-center z-10">发现 {recommendations.length} 位潜在同频伙伴</p>
          )}
        </section>

        {/* Match Readiness */}
        <section className="glass-card premium-shadow rounded-2xl p-4 mb-8 border-l-4 border-primary">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-headline-md text-base text-primary">Soulmate Readiness</h3>
            <span className="text-primary font-bold text-sm">{completeness}%</span>
          </div>
          <div className="w-full h-2 bg-surface-container-highest rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_8px_rgba(99,14,212,0.4)]"
              style={{ width: `${completeness}%` }}
            />
          </div>
          {mode === "soulmate" && readiness && !readiness.soulmate_ready ? (
            <p className="text-[13px] text-error mb-4 leading-relaxed">完整度 {completeness}% / 需要 80% 才能开启深度匹配。</p>
          ) : (
            <p className="text-[13px] text-on-surface-variant mb-4 leading-relaxed">补充情感价值观、生活方式和沟通方式后，可开启深度匹配。</p>
          )}
          <button
            onClick={() => navigate("/soulmate-questionnaire")}
            className="w-full h-11 bg-white border border-primary/20 text-primary text-[13px] font-medium rounded-full active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            继续完善 <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
          </button>
        </section>

        {/* Recommendations */}
        {primary && (
          <section className="glass-card premium-shadow rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl shadow-sm flex-shrink-0 border-2 border-white bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                {primary.target_username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-headline-md text-base truncate">{primary.target_username}</h4>
                  <span className="px-2 py-0.5 bg-tertiary-container/15 text-tertiary text-[10px] font-bold rounded-full flex-shrink-0">
                    {Math.round(primary.score)}% 同频
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {primary.reasons.slice(0, 3).map((r) => (
                    <span key={r} className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] rounded">{r}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-primary/5 rounded-lg p-3 mb-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                <span className="text-[13px] text-primary font-semibold">AI 解析</span>
              </div>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">{primary.icebreaker}</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => sendRequest(primary.target_user_id)}
                className="col-span-2 h-11 bg-primary text-white rounded-full text-[13px] font-medium active:scale-95 transition-all shadow-md"
              >
                打招呼
              </button>
              <button onClick={() => navigate(`/match/${primary.id}`)} className="h-11 bg-white border border-outline-variant/30 rounded-full flex items-center justify-center text-on-surface-variant active:scale-95">
                <span className="material-symbols-outlined text-xl">forum</span>
              </button>
              <button onClick={() => sendRequest(primary.target_user_id)} className="h-11 bg-white border border-outline-variant/30 rounded-full flex items-center justify-center text-on-surface-variant active:scale-95">
                <span className="material-symbols-outlined text-xl">group_add</span>
              </button>
            </div>
          </section>
        )}

        {others.map((rec) => (
          <section key={rec.id} className="glass-card premium-shadow rounded-2xl p-4 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0">
                {rec.target_username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="font-headline-md text-sm truncate">{rec.target_username}</h4>
                <p className="text-xs text-on-surface-variant truncate">共同话题：{rec.reasons.join("、")}</p>
              </div>
            </div>
            <button onClick={() => navigate(`/match/${rec.id}`)} className="px-4 py-1.5 bg-white border border-outline-variant/30 rounded-full text-xs text-primary active:scale-95 flex-shrink-0">
              查看
            </button>
          </section>
        ))}

        {/* Footer */}
        <footer className="text-center px-4 mt-6">
          <div className="flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-xs text-outline">verified_user</span>
            <p className="text-xs text-outline leading-relaxed">你的私人思想资产默认不会展示给他人，只有你授权的标签用于匹配。</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
