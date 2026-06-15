import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api";

type Recommendation = {
  id: string;
  target_user_id: string;
  target_username: string;
  score: number;
  reasons: string[];
  icebreaker: string;
  status: string;
  created_at: string;
};

const DIMS = ["话题重合", "语言互补", "目标一致", "沟通风格"];

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    apiRequest<Recommendation[]>("/api/connect/recommendations")
      .then((list) => setRec(list.find((r) => r.id === id) ?? null))
      .catch(() => setRec(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function sendRequest() {
    if (!rec) return;
    try {
      await apiRequest("/api/connect/requests", {
        method: "POST",
        body: JSON.stringify({ to_user_id: rec.target_user_id, message: rec.icebreaker || "想一起练习表达！" }),
      });
    } catch { /* ignore */ }
    setRequested(true);
  }

  async function startTrioChat() {
    if (!rec) return;
    try {
      const room = await apiRequest<{ id: string }>("/api/connect/trio-room", {
        method: "POST",
        body: JSON.stringify({ partner_user_id: rec.target_user_id, icebreaker: rec.icebreaker }),
      });
      navigate(`/trio-chat?room=${room.id}`);
    } catch { navigate("/trio-chat"); }
  }

  const initial = rec?.target_username?.charAt(0).toUpperCase() ?? "?";
  const score = Math.round(rec?.score ?? 0);

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <h1 className="font-bold text-[16px] text-primary">同频详情</h1>
        <span className="w-8" />
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !rec ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 px-margin-mobile">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant">person_search</span>
          <p className="text-[15px] text-on-surface-variant text-center">未找到此推荐，可能已过期</p>
          <button onClick={() => navigate("/match")} className="bg-primary text-white px-6 py-2.5 rounded-full font-bold text-[14px]">返回雷达</button>
        </div>
      ) : (
        <main className="px-margin-mobile pt-6 pb-32 space-y-5">
          {/* Avatar + Score */}
          <section className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {initial}
              </div>
            </div>
            <h2 className="font-bold text-[24px] text-on-surface">{rec.target_username}</h2>
            <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 bg-primary/10 rounded-full">
              <span className="material-symbols-outlined text-primary text-[16px]">radar</span>
              <span className="font-bold text-[16px] text-primary">{score}% 同频</span>
            </div>
          </section>

          {/* Score dimensions */}
          <section className="glass-card premium-shadow rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-[15px] text-on-surface mb-1">匹配维度</h3>
            {DIMS.map((dim, i) => {
              const v = Math.max(50, Math.round(score + (i % 2 === 0 ? 3 : -4) - i * 2));
              return (
                <div key={dim} className="space-y-1">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-on-surface-variant">{dim}</span>
                    <span className="font-bold text-primary">{v}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${v}%` }} />
                  </div>
                </div>
              );
            })}
          </section>

          {/* Common topics */}
          {rec.reasons.length > 0 && (
            <section className="glass-card premium-shadow rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-[15px] text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">hub</span>
                共同话题
              </h3>
              <div className="flex flex-wrap gap-2">
                {rec.reasons.map((r) => (
                  <span key={r} className="px-3 py-1.5 bg-primary/10 text-primary text-[13px] font-medium rounded-full">{r}</span>
                ))}
              </div>
            </section>
          )}

          {/* AI Icebreaker */}
          {rec.icebreaker && (
            <section className="glass-card premium-shadow rounded-2xl p-5 border-l-4 border-primary/40">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
                <span className="font-bold text-[13px] text-primary">AI 破冰建议</span>
              </div>
              <p className="text-[14px] text-on-surface leading-relaxed">{rec.icebreaker}</p>
            </section>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => void startTrioChat()}
              className="w-full h-12 bg-primary text-white rounded-full font-bold text-[15px] shadow-[0_8px_30px_rgba(99,14,212,0.25)] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">forum</span>
              AI 三人对话
            </button>
            <button
              onClick={() => void sendRequest()}
              disabled={requested}
              className="w-full h-12 bg-white border border-primary/30 text-primary rounded-full font-bold text-[15px] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">{requested ? "check" : "person_add"}</span>
              {requested ? "已发送招呼" : "打招呼"}
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
