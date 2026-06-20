import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api";

type RoomSummary = {
  room_id: string;
  title: string;
  status: string;
  topic_id?: string | null;
  summary: Record<string, unknown>;
  message_count: number;
  user_message_count: number;
  grammar_tips: { pattern: string; explanation: string }[];
  key_expressions: string[];
};

type WizardStep = "loading" | "active" | "ending" | "ended" | "frozen" | "published";

export default function CircleSummary() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<RoomSummary | null>(null);
  const [step, setStep] = useState<WizardStep>("loading");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [thoughtId, setThoughtId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);

  function loadSummary() {
    if (!roomId) return;
    apiRequest<RoomSummary>(`/api/circles/${roomId}/summary`)
      .then((r) => {
        setData(r);
        setTopicId(r.topic_id ?? null);
        setStep(r.status === "ended" ? "ended" : "active");
      })
      .catch(() => {
        setError("无法加载讨论回顾");
        setStep("active");
      });
  }

  useEffect(() => {
    loadSummary();
  }, [roomId]);

  const summaryRecord = data?.summary && typeof data.summary === "object" ? data.summary : {};
  const summaryText =
    typeof data?.summary === "string"
      ? data.summary
      : (summaryRecord.summary as string | undefined) ||
        (Array.isArray(summaryRecord.main_points) ? summaryRecord.main_points.join(" · ") : undefined);

  const mainPoints = Array.isArray(summaryRecord.main_points) ? (summaryRecord.main_points as string[]) : [];
  const consensus = Array.isArray(summaryRecord.consensus) ? (summaryRecord.consensus as string[]) : [];
  const goldenQuotes = Array.isArray(summaryRecord.golden_quotes) ? (summaryRecord.golden_quotes as string[]) : [];

  async function handleEndDiscussion() {
    if (!roomId || busy) return;
    setBusy("end");
    setError(null);
    try {
      const res = await apiRequest<{ summary: Record<string, unknown>; status: string; topic_id?: string }>(
        `/api/circles/${roomId}/end`,
        { method: "POST" },
      );
      setData((prev) =>
        prev
          ? { ...prev, status: res.status, summary: res.summary, topic_id: res.topic_id ?? prev.topic_id }
          : prev,
      );
      setTopicId(res.topic_id ?? topicId);
      setStep("ended");
    } catch {
      setError("生成总结失败，请检查 LLM 配置后重试");
    } finally {
      setBusy("");
    }
  }

  async function handleFreeze() {
    if (!roomId || busy) return;
    setBusy("freeze");
    setError(null);
    try {
      const res = await apiRequest<{ thought_id: string }>(`/api/circles/${roomId}/freeze`, { method: "POST" });
      setThoughtId(res.thought_id);
      setStep("frozen");
    } catch {
      setError("冻结失败，请稍后重试");
    } finally {
      setBusy("");
    }
  }

  async function handlePublish() {
    if (!roomId || busy) return;
    setBusy("publish");
    setError(null);
    try {
      const res = await apiRequest<{ topic_id: string }>(`/api/circles/${roomId}/publish-topic`, {
        method: "POST",
        body: JSON.stringify({ thought_id: thoughtId, title: data?.title }),
      });
      setTopicId(res.topic_id);
      setStep("published");
    } catch {
      setError("发布话题失败，请稍后重试");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <h1 className="font-bold text-[16px] text-on-surface">讨论回顾</h1>
      </header>

      <main className="px-margin-mobile pt-5 pb-24 space-y-5">
        <section className="glass-card premium-shadow rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-tertiary-container/10 pointer-events-none" />
          <div className="relative z-10">
            <span className="material-symbols-outlined text-[48px] text-primary fill" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
            <h2 className="font-bold text-[20px] text-on-surface mt-3 mb-2">{data?.title || "小组总结"}</h2>
            <p className="text-[14px] text-on-surface-variant">
              {data?.status === "active"
                ? "结束讨论后，AI 将生成本次总结，并可一键 Freeze / 发布话题"
                : summaryText || "AI 已整理本次讨论的要点与学习收获。"}
            </p>
          </div>
        </section>

        {error && (
          <p className="text-[13px] text-error bg-error/10 rounded-xl px-4 py-3">{error}</p>
        )}

        <section className="grid grid-cols-3 gap-3">
          {[
            { val: String(data?.user_message_count ?? "—"), label: "发言次数", icon: "chat_bubble" },
            { val: String(data?.grammar_tips.length ?? "—"), label: "语法提示", icon: "spellcheck" },
            { val: String(data?.key_expressions.length ?? "—"), label: "精彩表达", icon: "auto_awesome" },
          ].map((s) => (
            <div key={s.label} className="glass-card premium-shadow rounded-2xl p-4 flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">{s.icon}</span>
              <p className="font-bold text-[20px] text-primary">{s.val}</p>
              <p className="text-[11px] text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </section>

        {mainPoints.length > 0 && (
          <section className="glass-card premium-shadow rounded-2xl p-5 space-y-2">
            <h3 className="font-bold text-[16px]">讨论要点</h3>
            {mainPoints.map((p, i) => (
              <p key={i} className="text-[14px] text-on-surface-variant leading-relaxed">· {p}</p>
            ))}
          </section>
        )}

        {consensus.length > 0 && (
          <section className="glass-card premium-shadow rounded-2xl p-5 space-y-2">
            <h3 className="font-bold text-[16px]">共识</h3>
            {consensus.map((p, i) => (
              <p key={i} className="text-[14px] text-on-surface-variant">· {p}</p>
            ))}
          </section>
        )}

        {(goldenQuotes.length > 0 || (data?.key_expressions.length ?? 0) > 0) && (
          <section className="glass-card premium-shadow rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-[16px]">精彩表达</h3>
            {(goldenQuotes.length ? goldenQuotes : data!.key_expressions).map((q, i) => (
              <div key={i} className="bg-surface-container-low p-3 rounded-xl border-l-2 border-primary/30">
                <p className="text-[14px] text-on-surface italic">"{q}"</p>
              </div>
            ))}
          </section>
        )}

        <section className="glass-card premium-shadow rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-[16px] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">route</span>
            闭环向导
          </h3>
          <ol className="space-y-2 text-[13px] text-on-surface-variant">
            <li className={step !== "loading" && data?.status === "active" ? "text-primary font-bold" : ""}>① 结束讨论并生成 AI 总结</li>
            <li className={step === "ended" || step === "frozen" || step === "published" ? "text-primary font-bold" : ""}>② Freeze 到思想库</li>
            <li className={step === "published" ? "text-primary font-bold" : ""}>③ 发布到话题广场（多人可继续加入）</li>
          </ol>

          <div className="as-btn-row pt-1">
          {data?.status === "active" && (
            <button
              type="button"
              onClick={() => void handleEndDiscussion()}
              disabled={!!busy}
              className="as-btn as-btn--primary as-btn--block"
            >
              {busy === "end" ? "AI 总结生成中..." : "结束讨论并生成总结"}
            </button>
          )}

          {(step === "ended" || step === "frozen" || step === "published") && (
            <button
              type="button"
              onClick={() => void handleFreeze()}
              disabled={!!busy || step === "frozen" || step === "published"}
              className={`as-btn as-btn--block ${thoughtId || step === "frozen" ? "as-btn--success" : "as-btn--soft"}`}
            >
              {busy === "freeze" ? "冻结中..." : thoughtId || step === "frozen" ? "已 Freeze 到思想库" : "Freeze 讨论到思想库"}
            </button>
          )}

          {(step === "ended" || step === "frozen" || step === "published") && (
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={!!busy || step === "published"}
              className={`as-btn as-btn--block ${step === "published" ? "as-btn--success" : "as-btn--glass"}`}
            >
              {busy === "publish" ? "发布中..." : step === "published" ? "已发布到话题广场" : "发布为公开话题"}
            </button>
          )}

          {thoughtId && (
            <button
              type="button"
              onClick={() => navigate(`/thoughts/${thoughtId}`)}
              className="as-btn as-btn--muted as-btn--block"
              style={{ minHeight: "40px", fontSize: "13px" }}
            >
              查看思想详情 →
            </button>
          )}

          {topicId && step === "published" && (
            <button
              type="button"
              onClick={() => {
                void apiRequest<{ id: string }>("/api/circles/join-topic", {
                  method: "POST",
                  body: JSON.stringify({ topic_id: topicId }),
                }).then((room) => navigate(`/circles/${room.id}`));
              }}
              className="as-btn as-btn--primary as-btn--block"
            >
              进入公开讨论室
            </button>
          )}
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate("/home#today-topics")}
          className="as-btn as-btn--muted as-btn--block"
        >
          返回话题广场
        </button>
      </main>
    </div>
  );
}
