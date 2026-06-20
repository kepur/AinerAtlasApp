import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Radar, Users, MessageCircle, Heart, ChevronRight, Sparkles, UserPlus, Check } from "lucide-react";
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

type MatchQuota = {
  membership_level: string;
  daily_match_cards: number;
  match_batch_size: number;
  cards_used: number;
  cards_remaining: number;
  unlimited: boolean;
};

const MODE_TABS: { key: MatchMode; label: string; color: string }[] = [
  { key: "interest", label: "同趣", color: "from-[#6366f1] to-[#8b5cf6]" },
  { key: "language_partner", label: "语言伙伴", color: "from-[#3b82f6] to-[#6366f1]" },
  { key: "founder", label: "创业伙伴", color: "from-[#10b981] to-[#06b6d4]" },
  { key: "soulmate", label: "Soulmate", color: "from-[#ec4899] to-[#8b5cf6]" },
];

const SCAN_STATUSES = [
  "正在寻找与你话题高度相似的人...",
  "对比知识图谱中...",
  "正在计算价值观匹配度...",
  "分析语言风格匹配...",
];

const FLOATING_TAGS = [
  { label: "AI创业", style: { top: "-12px", right: "-40px" }, delay: "0.5s" },
  { label: "英语表达", style: { top: "50%", left: "-56px" }, delay: "1.2s" },
  { label: "人生规划", style: { bottom: "-12px", right: "8px" }, delay: "0.8s" },
  { label: "欧洲生活", style: { bottom: "50%", right: "-48px" }, delay: "1.5s" },
];

const AVATAR_COLORS = [
  "from-[#6366f1] to-[#8b5cf6]",
  "from-[#ec4899] to-[#f43f5e]",
  "from-[#10b981] to-[#06b6d4]",
  "from-[#f59e0b] to-[#ef4444]",
];

export default function MatchRadar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<MatchMode>("interest");
  const [enabled, setEnabled] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [readiness, setReadiness] = useState<{ completeness: number; soulmate_ready: boolean } | null>(null);
  const [quota, setQuota] = useState<MatchQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanIdx, setScanIdx] = useState(0);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [err, setErr] = useState("");

  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    apiRequest<{ completeness: number; soulmate_ready: boolean }>("/api/connect/readiness")
      .then(setReadiness)
      .catch(() => setReadiness({ completeness: 0, soulmate_ready: false }));
    apiRequest<MatchQuota>("/api/connect/quota")
      .then(setQuota)
      .catch(() => setQuota(null));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setScanIdx((i) => (i + 1) % SCAN_STATUSES.length), 2800);
    return () => clearInterval(id);
  }, []);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > 50 && currentScrollY > lastScrollY) {
      setShowHeader(false);
    } else {
      setShowHeader(true);
    }
    setLastScrollY(currentScrollY);
  }

  function quotaLabel(q: MatchQuota) {
    if (q.unlimited) return "匹配卡：无限 · 单次可匹配全部用户";
    const batch = q.match_batch_size < 0 ? "全部" : `${q.match_batch_size} 人`;
    return `今日剩余 ${q.cards_remaining}/${q.daily_match_cards} 次匹配卡 · 单次最多 ${batch}`;
  }

  async function refreshQuota() {
    try {
      const q = await apiRequest<MatchQuota>("/api/connect/quota");
      setQuota(q);
    } catch {
      /* ignore */
    }
  }

  async function runMatchScan() {
    setLoading(true);
    setErr("");
    try {
      await apiRequest("/api/connect/enable", {
        method: "POST",
        body: JSON.stringify({ enabled: true, match_mode: mode, visibility: "friends" }),
      });
      const recs = await apiRequest<Recommendation[]>("/api/connect/recommendations");
      setRecommendations(recs ?? []);
      setEnabled(true);
      await refreshQuota();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "匹配失败，请稍后重试";
      if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("exhausted")) {
        setErr("今日匹配卡已用完，升级会员可获得更多次数");
      } else {
        setErr(msg);
      }
      window.setTimeout(() => setErr(""), 3200);
    }
    setLoading(false);
  }

  async function enableMatching() {
    if (quota && !quota.unlimited && quota.cards_remaining <= 0) {
      setErr("今日匹配卡已用完，明天再来或升级会员");
      window.setTimeout(() => setErr(""), 3200);
      return;
    }
    await runMatchScan();
  }

  async function sendRequest(userId: string, recId: string) {
    if (userId.startsWith("u")) {
      setRequestedIds((s) => new Set([...s, recId]));
      setErr("这是示例用户，开启真实匹配后即可打招呼对话");
      window.setTimeout(() => setErr(""), 2600);
      return;
    }
    try {
      const room = await apiRequest<{ room_id: string }>("/api/connect/greet", {
        method: "POST",
        body: JSON.stringify({ to_user_id: userId, message: "想一起练习表达！👋" }),
      });
      setRequestedIds((s) => new Set([...s, recId]));
      if (room?.room_id) {
        navigate(`/trio-chat?room=${room.room_id}`);
      }
    } catch {
      setErr("打招呼失败，请稍后重试");
      window.setTimeout(() => setErr(""), 2600);
    }
  }

  async function startTrioChat(rec: Recommendation) {
    try {
      const room = await apiRequest<{ id: string }>("/api/connect/trio-room", {
        method: "POST",
        body: JSON.stringify({ partner_user_id: rec.target_user_id, icebreaker: rec.icebreaker }),
      });
      if (!room?.id) throw new Error("no room id");
      navigate(`/trio-chat?room=${room.id}`);
    } catch {
      // Don't drop the user into a roomless chat — keep them here with a hint.
      setErr("发起对话失败，请稍后重试");
      window.setTimeout(() => setErr(""), 2600);
    }
  }

  const completeness = Math.round(readiness?.completeness ?? 0);
  const initial = (user?.username || "U").charAt(0).toUpperCase();
  const currentMode = MODE_TABS.find((m) => m.key === mode)!;
  const isScrolled = lastScrollY > 0;

  return (
    <div onScroll={handleScroll} className="premium w-full h-full bg-surface text-on-surface flex flex-col overflow-y-auto pb-28 no-scrollbar">
      {err && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full bg-[#1f2937]/90 text-white text-[13px] font-bold shadow-lg whitespace-nowrap">
          {err}
        </div>
      )}
      {/* Background */}
      <div className="connect-ambient fixed top-0 left-0 w-full h-[300px] bg-gradient-to-br from-[#eef2ff] via-[#f5f3ff] to-transparent opacity-70 pointer-events-none z-0" />

      {/* Header */}
      <header className={`sticky top-0 z-50 flex justify-between items-center px-5 h-14 transition-all duration-300 ${
        showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      } ${
        isScrolled
          ? "bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}>
        <div>
          <h1 className="font-extrabold text-on-surface text-xl leading-tight">Connect</h1>
          <p className="text-[10px] text-on-surface-variant">找到与你同频的人</p>
        </div>
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-sm border border-outline-variant/30 flex items-center justify-center text-on-surface-variant">
          <Settings size={18} />
        </button>
      </header>

      <main className="px-5 pt-2 relative z-10 flex flex-col gap-5">

        {/* Mode Tabs */}
        {quota && (
          <div className="bg-surface-container-lowest/80 rounded-xl px-3 py-2 border border-outline-variant/30 text-[11px] text-on-surface-variant">
            {quotaLabel(quota)}
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setMode(tab.key); setEnabled(false); setRecommendations([]); }}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-all active:scale-95 ${
                mode === tab.key
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
                  : "bg-surface-container-lowest text-on-surface-variant border border-outline-variant/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Radar Card */}
        <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-outline-variant/30 p-6 flex flex-col items-center relative overflow-hidden min-h-[300px]">
          {/* Decorative background glow */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full bg-gradient-to-br ${currentMode.color} opacity-5 blur-3xl pointer-events-none`} />

          {/* Radar Rings */}
          <div className="relative mb-6 flex items-center justify-center" style={{ width: 160, height: 160 }}>
            {[160, 120, 80].map((size, i) => (
              <div
                key={i}
                className="absolute rounded-full border border-[#8b5cf6]/10"
                style={{
                  width: size,
                  height: size,
                  animation: `ping ${2 + i * 0.5}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                  animationDelay: `${i * 0.6}s`,
                  opacity: enabled ? 0 : undefined,
                }}
              />
            ))}
            {/* Floating tags */}
            {FLOATING_TAGS.map((tag) => (
              <div
                key={tag.label}
                className="absolute bg-surface-container-lowest text-[#6366f1] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#ede9fe] shadow-sm whitespace-nowrap"
                style={{
                  ...tag.style,
                  animation: `bounce 2s ease-in-out infinite`,
                  animationDelay: tag.delay,
                }}
              >
                {tag.label}
              </div>
            ))}
            {/* Center Avatar */}
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${currentMode.color} flex items-center justify-center text-white text-2xl font-black shadow-lg z-10`}>
              {initial}
            </div>
          </div>

          {!enabled ? (
            <>
              <p className="text-[12px] text-on-surface-variant text-center mb-4 animate-pulse">{SCAN_STATUSES[scanIdx]}</p>
              <button
                onClick={enableMatching}
                disabled={loading}
                className={`flex items-center gap-2 bg-gradient-to-r ${currentMode.color} text-white px-6 py-2.5 rounded-full font-bold text-[14px] shadow-md active:scale-95 transition-all disabled:opacity-60`}
              >
                <Radar size={18} />
                {loading ? "扫描中..." : "开启匹配雷达"}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                <p className="text-[12px] text-[#10b981] font-bold">发现 {recommendations.length} 位同频伙伴</p>
              </div>
              {quota && !quota.unlimited && quota.cards_remaining > 0 && (
                <button
                  type="button"
                  onClick={() => void runMatchScan()}
                  disabled={loading}
                  className="text-[11px] font-bold text-[#6366f1] underline-offset-2 hover:underline disabled:opacity-50"
                >
                  再次扫描（消耗 1 张匹配卡）
                </button>
              )}
            </div>
          )}
        </div>

        {/* Match Results */}
        {enabled && recommendations.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-on-surface">为你推荐</h3>
              <span className="text-[11px] text-on-surface-variant">按匹配度排序</span>
            </div>

            {/* Primary Card */}
            <div className="bg-surface-container-lowest rounded-[20px] shadow-sm border border-[#ede9fe] p-4 mb-3 relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-[#f5f3ff] text-[#8b5cf6] text-[9px] font-black px-2 py-0.5 rounded-full">
                最佳匹配
              </div>
              <div className="flex gap-3 mb-3">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[0]} flex items-center justify-center text-white text-xl font-black shadow-sm shrink-0`}>
                  {recommendations[0].target_username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-on-surface text-sm">{recommendations[0].target_username}</h4>
                    <span className="bg-[#f0fdf4] text-[#15803d] text-[9px] font-bold px-1.5 py-0.5 rounded-full">{Math.round(recommendations[0].score)}% 同频</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {recommendations[0].reasons.slice(0, 3).map((r) => (
                      <span key={r} className="bg-[#f5f3ff] text-[#6366f1] px-1.5 py-0.5 rounded text-[9px] font-medium">{r}</span>
                    ))}
                  </div>
                </div>
              </div>
              {/* AI icebreaker */}
              <div className="bg-surface-container-low rounded-xl p-3 mb-3 border border-outline-variant/30">
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles size={11} className="text-[#8b5cf6]" />
                  <span className="text-[10px] font-bold text-[#8b5cf6]">AI 解析</span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">{recommendations[0].icebreaker}</p>
              </div>
              {/* Score bars */}
              <div className="flex flex-col gap-1.5 mb-3">
                {[
                  { label: "话题重合", v: Math.round(recommendations[0].score) + 3 },
                  { label: "目标一致", v: Math.round(recommendations[0].score) - 4 },
                  { label: "语言互补", v: Math.round(recommendations[0].score) - 8 },
                ].map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className="text-[9px] text-on-surface-variant w-12 shrink-0">{d.label}</span>
                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-full" style={{ width: `${Math.min(d.v, 99)}%` }} />
                    </div>
                    <span className="text-[9px] font-bold text-[#6366f1] w-6 shrink-0">{Math.min(d.v, 99)}%</span>
                  </div>
                ))}
              </div>
              {/* Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => void startTrioChat(recommendations[0])}
                  className="col-span-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white h-10 rounded-xl text-[11px] font-bold shadow-sm active:scale-95 transition-all"
                >
                  <MessageCircle size={14} /> AI 对话
                </button>
                <button
                  onClick={() => void sendRequest(recommendations[0].target_user_id, recommendations[0].id)}
                  disabled={requestedIds.has(recommendations[0].id)}
                  className="col-span-1 flex items-center justify-center gap-1.5 bg-surface-container-lowest text-[#6366f1] h-10 rounded-xl text-[11px] font-bold border border-[#ede9fe] active:scale-95 transition-all disabled:opacity-50"
                >
                  {requestedIds.has(recommendations[0].id) ? <Check size={14} /> : <UserPlus size={14} />}
                  {requestedIds.has(recommendations[0].id) ? "已发送" : "打招呼"}
                </button>
                <button
                  onClick={() => navigate(`/match/${recommendations[0].id}`)}
                  className="col-span-1 flex items-center justify-center gap-1 bg-surface-container-lowest text-on-surface-variant h-10 rounded-xl text-[11px] font-bold border border-outline-variant/40 active:scale-95 transition-all"
                >
                  详情 <ChevronRight size={12} />
                </button>
              </div>
            </div>

            {/* Other matches */}
            <div className="flex flex-col gap-2">
              {recommendations.slice(1).map((rec, i) => (
                <div key={rec.id} className="bg-surface-container-lowest rounded-[16px] p-3 shadow-sm border border-outline-variant/30 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length]} flex items-center justify-center text-white font-black shrink-0`}>
                    {rec.target_username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-on-surface text-xs truncate">{rec.target_username}</h4>
                      <span className="text-[9px] font-bold text-[#8b5cf6] shrink-0">{Math.round(rec.score)}%</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant truncate">共同话题：{rec.reasons.slice(0, 2).join("、")}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => void startTrioChat(rec)}
                      className="w-8 h-8 rounded-lg bg-[#f5f3ff] text-[#6366f1] flex items-center justify-center active:scale-95"
                    >
                      <MessageCircle size={14} />
                    </button>
                    <button
                      onClick={() => navigate(`/match/${rec.id}`)}
                      className="w-8 h-8 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant flex items-center justify-center active:scale-95"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Soulmate Readiness */}
        <div className="bg-surface-container-lowest rounded-[20px] shadow-sm border border-outline-variant/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-[#ec4899] fill-[#ec4899]" />
              <h3 className="font-bold text-on-surface text-sm">Soulmate Readiness</h3>
            </div>
            <span className="font-black text-[#8b5cf6] text-sm">{completeness}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] rounded-full transition-all duration-700"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <p className="text-[11px] text-on-surface-variant mb-3 leading-relaxed">
            {completeness >= 80
              ? "已达到深度匹配门槛，可开启 Soulmate 模式 🎉"
              : "补充情感价值观、生活方式和沟通方式后，可开启深度匹配。"}
          </p>
          <button
            onClick={() => navigate("/soulmate-questionnaire")}
            className="w-full flex items-center justify-center gap-1.5 h-10 bg-[#fdf2f8] text-[#ec4899] text-[13px] font-bold rounded-xl border border-[#fbcfe8] active:scale-95 transition-all"
          >
            {completeness >= 80 ? "开启 Soulmate 匹配" : "继续完善"} <ChevronRight size={14} />
          </button>
        </div>

        {/* Privacy notice */}
        <div className="flex items-start gap-2 bg-surface-container-lowest/60 rounded-xl px-3 py-2.5 border border-outline-variant/30">
          <div className="w-4 h-4 rounded-full bg-[#f0fdf4] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[8px] text-[#15803d]">✓</span>
          </div>
          <p className="text-[10px] text-on-surface-variant leading-relaxed">
            你的私人思想资产默认不会展示给他人，只有你授权的标签用于匹配。
          </p>
        </div>

      </main>
    </div>
  );
}
