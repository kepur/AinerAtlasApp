import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, UserPlus, Check, Sparkles, ChevronRight, Heart, Globe, Target, MessageSquare } from "lucide-react";
import { apiRequest } from "../api";

type Recommendation = {
  id: string;
  target_user_id: string;
  target_username: string;
  score: number;
  reasons: string[];
  icebreaker: string;
  status: string;
};

const DIMS = [
  { label: "话题重合", icon: "💬", offset: 3 },
  { label: "目标一致", icon: "🎯", offset: -2 },
  { label: "语言互补", icon: "🌐", offset: -8 },
  { label: "沟通风格", icon: "🤝", offset: 2 },
];

const AVATAR_COLORS = [
  "from-[#6366f1] to-[#8b5cf6]",
  "from-[#ec4899] to-[#f43f5e]",
  "from-[#10b981] to-[#06b6d4]",
];

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiRequest<Recommendation[]>("/api/connect/recommendations")
      .then((list) => setRec(list?.find((r) => r.id === id) ?? null))
      .catch(() => setRec({
        id: id ?? "m1",
        target_user_id: "u1",
        target_username: "Kevin · Japan",
        score: 87,
        reasons: ["AI创业", "欧洲生活", "英语提升", "产品思维"],
        icebreaker: "你们都关注「用 AI 降低跨国创业门槛」，他在东京有一年 AI 项目落地经验，建议用这个话题破冰。",
        status: "pending",
      }))
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
    setChatLoading(true);
    try {
      const room = await apiRequest<{ id: string }>("/api/connect/trio-room", {
        method: "POST",
        body: JSON.stringify({ partner_user_id: rec.target_user_id, icebreaker: rec.icebreaker }),
      });
      if (!room?.id) throw new Error("no room id");
      navigate(`/trio-chat?room=${room.id}`);
    } catch {
      setErr("发起对话失败，请稍后重试");
      window.setTimeout(() => setErr(""), 2600);
    }
    setChatLoading(false);
  }

  if (loading) {
    return (
      <div className="w-full h-full bg-[#f8f9fc] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6366f1]/30 border-t-[#6366f1] rounded-full animate-spin" />
      </div>
    );
  }

  if (!rec) {
    return (
      <div className="w-full h-full bg-[#f8f9fc] flex flex-col items-center justify-center gap-4 px-5">
        <div className="text-5xl">🔍</div>
        <p className="text-[#4b5563] text-sm text-center">未找到此推荐，可能已过期</p>
        <button onClick={() => navigate("/match")} className="bg-[#6366f1] text-white px-6 py-2.5 rounded-full font-bold text-[14px]">返回雷达</button>
      </div>
    );
  }

  const score = Math.round(rec.score);
  const initial = rec.target_username.charAt(0).toUpperCase();

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col overflow-y-auto pb-36 no-scrollbar">
      {err && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full bg-[#1f2937]/90 text-white text-[13px] font-bold shadow-lg whitespace-nowrap">
          {err}
        </div>
      )}
      {/* Background */}
      <div className="fixed top-0 left-0 w-full h-[250px] bg-gradient-to-br from-[#eef2ff] via-[#f5f3ff] to-transparent opacity-60 pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-[#111827]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-[#111827] text-[15px]">同频详情</h1>
        <span className="w-8" />
      </header>

      <main className="px-5 pt-5 flex flex-col gap-4 relative z-10">

        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-3">
          <div className={`w-24 h-24 rounded-[28px] bg-gradient-to-br ${AVATAR_COLORS[0]} flex items-center justify-center text-white text-4xl font-black shadow-lg`}>
            {initial}
          </div>
          <div className="text-center">
            <h2 className="font-extrabold text-[#111827] text-xl">{rec.target_username}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-[11px] text-[#10b981] font-bold">{score}% 同频</span>
            </div>
          </div>
        </div>

        {/* Score Dimensions */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-[#111827] text-sm mb-3">匹配维度</h3>
          <div className="flex flex-col gap-2.5">
            {DIMS.map((dim) => {
              const v = Math.max(50, Math.min(99, score + dim.offset));
              return (
                <div key={dim.label} className="flex items-center gap-3">
                  <span className="text-base w-5 shrink-0">{dim.icon}</span>
                  <span className="text-[11px] text-[#6b7280] w-16 shrink-0">{dim.label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-full"
                      style={{ width: `${v}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#6366f1] w-7 text-right shrink-0">{v}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Common Topics */}
        {rec.reasons.length > 0 && (
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={14} className="text-[#6366f1]" />
              <h3 className="font-bold text-[#111827] text-sm">共同话题</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {rec.reasons.map((r) => (
                <span key={r} className="bg-[#f5f3ff] text-[#6366f1] px-3 py-1.5 rounded-full text-[11px] font-bold border border-[#ede9fe]">{r}</span>
              ))}
            </div>
          </div>
        )}

        {/* AI Icebreaker */}
        {rec.icebreaker && (
          <div className="bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] rounded-[20px] border border-[#ddd6fe] p-4 relative overflow-hidden">
            <div className="absolute right-3 bottom-3 opacity-5 pointer-events-none">
              <Sparkles size={60} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-[#8b5cf6]" />
              <span className="text-[11px] font-bold text-[#8b5cf6]">AI 破冰建议</span>
            </div>
            <p className="text-[12px] text-[#4b5563] leading-relaxed">{rec.icebreaker}</p>
          </div>
        )}

        {/* What to chat about */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={14} className="text-[#6366f1]" />
            <h3 className="font-bold text-[#111827] text-sm">你们可以聊</h3>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { icon: Target, label: "共同学习目标", desc: "英语表达提升 · B2 → C1" },
              { icon: Globe, label: "跨文化话题", desc: "AI创业 · 欧洲生活经验" },
              { icon: Heart, label: "兴趣爱好", desc: rec.reasons.slice(0, 2).join(" · ") || "探索中" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#f8f9fc] rounded-xl p-2.5 border border-gray-50">
                <div className="w-8 h-8 rounded-lg bg-[#f5f3ff] flex items-center justify-center shrink-0">
                  <item.icon size={14} className="text-[#6366f1]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#111827]">{item.label}</p>
                  <p className="text-[10px] text-[#9ca3af]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-5 pt-3 pb-[env(safe-area-inset-bottom,16px)] flex flex-col gap-2 z-50">
        <button
          onClick={() => void startTrioChat()}
          disabled={chatLoading}
          className="w-full h-12 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white rounded-full font-bold text-[14px] shadow-md active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <MessageCircle size={18} />
          {chatLoading ? "创建对话中..." : "开启 AI 三人对话"}
        </button>
        <button
          onClick={() => void sendRequest()}
          disabled={requested}
          className="w-full h-12 bg-white text-[#6366f1] rounded-full font-bold text-[14px] border border-[#ede9fe] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {requested ? <Check size={18} /> : <UserPlus size={18} />}
          {requested ? "已发送打招呼" : "打招呼"}
        </button>
      </div>
    </div>
  );
}
