import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuthStore } from "../stores/authStore";

type XP = {
  total_xp: number;
  current_level: number;
  current_streak_days: number;
  longest_streak_days: number;
  next_level_xp: number;
  xp_to_next_level: number;
};

type Growth = {
  record_date: string;
  conversations_count: number;
  assets_count: number;
  patterns_mastered: number;
  vocabulary_mastered: number;
};

type MasteryItem = { status: string; item_type: string; mastery_score: number };

export default function Report() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);

  const [xp, setXp] = useState<XP | null>(null);
  const [growth, setGrowth] = useState<Growth[]>([]);
  const [mastery, setMastery] = useState<MasteryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<XP>("/api/gamification/me").catch(() => null),
      apiRequest<Growth[]>("/api/gamification/growth?days=7").catch(() => []),
      apiRequest<MasteryItem[]>("/api/grammar/mastery").catch(() => []),
    ]).then(([xpData, growthData, masteryData]) => {
      setXp(xpData);
      setGrowth(growthData);
      setMastery(masteryData);
      setLoading(false);
    });
  }, []);

  const grammar = Math.round(profile?.grammar_level_score ?? 0);
  const vocab = Math.round(profile?.vocabulary_level_score ?? 0);
  const fluency = Math.round(profile?.fluency_score ?? 0);

  const totalConversations = growth.reduce((s, g) => s + g.conversations_count, 0);
  const totalVocab = growth.reduce((s, g) => s + g.vocabulary_mastered, 0);
  const totalPatterns = growth.reduce((s, g) => s + g.patterns_mastered, 0);

  const masteredCount = mastery.filter((m) => m.status === "mastered").length;
  const xpPercent = xp ? Math.round(((xp.next_level_xp - xp.xp_to_next_level) / xp.next_level_xp) * 100) : 0;

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-1/3 -left-20 w-48 h-48 rounded-full bg-tertiary-fixed/15 blur-2xl" />
      </div>

      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <div>
          <h1 className="font-bold text-[16px] text-on-surface leading-tight">成长报告</h1>
          <p className="text-[11px] text-on-surface-variant">近 7 天语言能力进阶</p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <main className="px-margin-mobile pt-5 pb-24 space-y-5">
          {/* XP Level Card */}
          {xp && (
            <section className="glass-card premium-shadow rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[12px] text-primary font-bold uppercase tracking-wider">等级</p>
                    <p className="font-bold text-[32px] text-on-surface leading-none">Lv. {xp.current_level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-on-surface-variant">总经验</p>
                    <p className="font-bold text-[20px] text-primary">{xp.total_xp.toLocaleString()} XP</p>
                  </div>
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant text-right">距下一级还需 {xp.xp_to_next_level} XP</p>
              </div>
            </section>
          )}

          {/* 本周统计 */}
          <section className="glass-card premium-shadow rounded-2xl p-5">
            <p className="text-[12px] text-primary font-bold uppercase tracking-wider mb-3">本周概览</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "新词汇", val: totalVocab || 0, icon: "spellcheck", color: "text-primary" },
                { label: "掌握句型", val: totalPatterns || 0, icon: "auto_fix_high", color: "text-tertiary-container" },
                { label: "对话轮次", val: totalConversations || 0, icon: "chat", color: "text-secondary-container" },
              ].map((s) => (
                <div key={s.label} className="bg-surface-container-lowest/60 rounded-xl p-3">
                  <span className={`material-symbols-outlined text-[24px] ${s.color}`}>{s.icon}</span>
                  <p className={`font-bold text-[24px] ${s.color}`}>{s.val}</p>
                  <p className="text-[12px] text-on-surface-variant">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Streak */}
          {xp && (
            <section className="grid grid-cols-2 gap-3">
              <div className="glass-card premium-shadow rounded-2xl p-4 text-center">
                <span className="material-symbols-outlined text-[28px] text-orange-500 fill" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                <p className="font-bold text-[24px] text-on-surface">{xp.current_streak_days}</p>
                <p className="text-[12px] text-on-surface-variant">连续打卡天数</p>
              </div>
              <div className="glass-card premium-shadow rounded-2xl p-4 text-center">
                <span className="material-symbols-outlined text-[28px] text-primary fill" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                <p className="font-bold text-[24px] text-on-surface">{masteredCount}</p>
                <p className="text-[12px] text-on-surface-variant">已掌握项目</p>
              </div>
            </section>
          )}

          {/* 能力雷达 */}
          {(grammar > 0 || vocab > 0 || fluency > 0) && (
            <section className="space-y-3">
              <h3 className="font-bold text-[16px] text-on-surface">能力雷达</h3>
              {[
                { label: "语法 Grammar", val: grammar, color: "#630ed4" },
                { label: "词汇 Vocabulary", val: vocab, color: "#00885d" },
                { label: "流利度 Fluency", val: fluency, color: "#2170e4" },
              ].map((skill) => (
                <div key={skill.label} className="glass-card premium-shadow rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] font-bold text-on-surface">{skill.label}</span>
                    <span className="text-[13px] text-on-surface-variant">{skill.val}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${skill.val}%`, backgroundColor: skill.color }}
                    />
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 每日活跃记录 */}
          {growth.length > 0 && (
            <section className="glass-card premium-shadow rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-[16px] text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                近期活跃
              </h3>
              <div className="space-y-2">
                {growth.slice(0, 5).map((g) => (
                  <div key={g.record_date} className="flex items-center justify-between py-2 border-b border-outline-variant/20 last:border-0">
                    <span className="text-[13px] text-on-surface-variant">{g.record_date}</span>
                    <div className="flex gap-3 text-[12px]">
                      <span className="text-primary">{g.conversations_count} 对话</span>
                      <span className="text-tertiary-container">{g.patterns_mastered} 句型</span>
                      <span className="text-secondary-container">{g.vocabulary_mastered} 词汇</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 鼓励 */}
          <section className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 rounded-2xl p-5 text-center">
            <span className="material-symbols-outlined text-[40px] text-primary fill" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
            <p className="font-bold text-[16px] text-on-surface mt-2">继续保持！</p>
            <p className="text-[13px] text-on-surface-variant mt-1">
              {xp && xp.current_streak_days > 0
                ? `你已连续 ${xp.current_streak_days} 天坚持学习，非常棒！`
                : "开始第一次对话，积累你的语言资产吧！"}
            </p>
            <button
              onClick={() => navigate("/chat")}
              className="mt-4 bg-primary text-white px-6 py-2.5 rounded-full font-bold text-[14px] shadow-[0_8px_20px_rgba(99,14,212,0.25)] active:scale-95 transition-all"
            >
              去学习
            </button>
          </section>
        </main>
      )}
    </div>
  );
}
