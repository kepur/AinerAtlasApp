import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, type Asset, type Conversation, type MasteryItem } from "../api";
import TodayTopicsSection, { type TodayTopic } from "../components/TodayTopicsSection";
import { useI18n } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";

// Mock placeholders for sections without a backend feed yet.
// TODO(backend): GET /api/assets?type=freeze for the Thought Freeze carousel.
const FREEZE_TINTS = [
  "from-[#7c3aed] to-[#0058be]",
  "from-[#005b3d] to-[#0058be]",
  "from-[#732ee4] to-[#d2bbff]",
];

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { createConversation } = useChatStore();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [queue, setQueue] = useState<MasteryItem[]>([]);
  const [topics, setTopics] = useState<TodayTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    if (window.location.hash !== "#today-topics") return;
    const el = document.getElementById("today-topics");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [topicsLoading]);

  useEffect(() => {
    // Use real data only — no mock fallbacks (a mock conversation id would make
    // "继续会话" navigate to an invalid /chat/:id). Empty states render cleanly.
    apiRequest<Conversation[]>("/api/conversations")
      .then((data) => setRecentConversations(data && data.length > 0 ? data.slice(0, 3) : []))
      .catch(() => setRecentConversations([]));

    apiRequest<MasteryItem[]>("/api/grammar/queue")
      .then((data) => setQueue(data && data.length > 0 ? data : []))
      .catch(() => setQueue([]));

    apiRequest<TodayTopic[]>("/api/topics")
      .then((data) => setTopics(data?.length ? data : []))
      .catch(() => setTopics([]))
      .finally(() => setTopicsLoading(false));

    apiRequest<Asset[]>("/api/assets")
      .then((data) => setAssets(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => setAssets([]));
  }, []);

  async function startThought() {
    try {
      const conv = await createConversation({ title: t("home.newThoughtTitle"), mode: "socratic" });
      navigate(`/chat/${conv.id}`);
    } catch {
      /* handled in store */
    }
  }

  function continueSession() {
    if (recentConversations[0]) navigate(`/chat/${recentConversations[0].id}`);
    else void startThought();
  }

  const masteredCount = queue.filter((q) => q.mastery_score >= 80).length;
  const focusTopic = topics[0]?.title ?? "Nuanced Negotiation";
  const recent = recentConversations[0];

  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const greetingName = user?.username || "Language Architect";

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Top AppBar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-margin-mobile h-touch-target-min bg-surface/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="w-8 h-8 rounded-full overflow-hidden bg-primary-fixed border border-primary/10 flex items-center justify-center font-bold text-primary text-sm"
          >
            {greetingName.charAt(0).toUpperCase()}
          </button>
          <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">AinerWise</span>
        </div>
        <button onClick={() => navigate("/voice")} className="material-symbols-outlined text-primary hover:opacity-80 transition-opacity">
          auto_awesome
        </button>
      </nav>

      <main className="pt-2 pb-8 px-margin-mobile space-y-8">
        {/* Welcome Header */}
        <header className="pt-2">
          <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface tracking-tight">
            {partOfDay}, {greetingName}
          </h1>
          <p className="font-body-md text-on-surface-variant mt-2">
            Today we focus on <span className="text-primary font-semibold">{focusTopic}</span>. You've mastered{" "}
            {masteredCount} new thought-assets this week.
          </p>
        </header>

        {/* Daily Resonance Hero Card */}
        <section className="relative overflow-hidden rounded-[1.5rem] premium-shadow bg-surface-container-lowest p-6 border border-primary/5">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-primary/10 text-primary font-label-sm text-label-sm rounded-full">Daily Resonance</span>
              <span className="material-symbols-outlined text-primary/40">lightbulb</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2 italic">
              "The art of silence is as expressive as the choice of words."
            </h2>
            <p className="font-body-md text-on-surface-variant mb-6">
              How would you translate this sentiment into your target language's formal register?
            </p>
            <button
              onClick={startThought}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">edit_note</span>
              Express Your Thought
            </button>
          </div>
        </section>

        {/* Digital Mentor (moved from Chat page) */}
        <section>
          <h2 className="font-label-sm text-label-sm text-outline mb-3 uppercase tracking-widest">Digital Mentor</h2>
          <div className="relative overflow-hidden rounded-[20px] p-4 ai-glow glass-card border border-primary/10">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl" />
            <div className="flex items-start gap-3 relative z-10">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl resonance-indicator flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined fill text-[24px]">psychology</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-tertiary-fixed-dim border-2 border-surface rounded-full" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">AinerWise Coach</h3>
                  <span className="font-label-sm text-[10px] text-primary font-bold">LIVE</span>
                </div>
                <p className="text-[13px] text-on-surface-variant line-clamp-2 leading-relaxed">
                  "You've expressed new nuances today. Ready to refine your philosophical vocabulary?"
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant/30 flex gap-2">
              <button
                onClick={continueSession}
                className="flex-1 h-9 bg-primary text-white rounded-xl font-label-sm text-[13px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                Continue Session
              </button>
              <button onClick={() => navigate("/voice")} className="w-9 h-9 flex items-center justify-center text-primary bg-primary-fixed/30 rounded-xl active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[18px]">settings_voice</span>
              </button>
            </div>
          </div>
        </section>

        {/* Active Learning Grid */}
        <section className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/voice")}
            className="col-span-2 flex items-center justify-between p-5 bg-primary-container text-on-primary-container rounded-[1.5rem] premium-shadow active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-on-primary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined fill text-3xl">mic</span>
              </div>
              <div className="text-left">
                <p className="font-headline-md text-headline-md leading-tight">Quick Start</p>
                <p className="font-label-sm text-label-sm opacity-80 uppercase tracking-wider">Voice Coach</p>
              </div>
            </div>
            <span className="material-symbols-outlined">arrow_forward_ios</span>
          </button>

          {recent && (
            <button
              onClick={() => navigate(`/chat/${recent.id}`)}
              className="col-span-2 text-left p-5 bg-white rounded-[1.5rem] premium-shadow border border-surface-variant/30 flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Recent Discussion</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">{recent.title}</h3>
                <p className="font-body-md text-on-surface-variant line-clamp-1">
                  AI: "While often translated as home, it carries..."
                </p>
              </div>
              <div className="flex -space-x-2 mt-4">
                <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-dim flex items-center justify-center text-[10px] font-bold">AI</div>
                <div className="w-8 h-8 rounded-full border-2 border-white bg-primary-fixed flex items-center justify-center text-[10px] font-bold">ME</div>
              </div>
            </button>
          )}
        </section>

        {/* Thought Freeze Assets */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Thought Freeze Assets</h3>
            <button onClick={() => navigate("/assets")} className="text-primary font-label-sm text-label-sm font-semibold">
              View All
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-margin-mobile px-margin-mobile">
            {assets.length === 0 && (
              <p className="text-on-surface-variant font-body-md py-4">还没有冻结的表达资产，去对话里沉淀第一条吧。</p>
            )}
            {assets.map((asset, i) => (
              <button
                key={asset.id}
                onClick={() => navigate(`/assets/${asset.id}`)}
                className="flex-shrink-0 w-40 p-4 bg-white rounded-2xl premium-shadow border border-surface-variant/20 text-left"
              >
                <div className={`w-full aspect-square rounded-xl mb-3 bg-gradient-to-br ${FREEZE_TINTS[i % FREEZE_TINTS.length]}`} />
                <p className="font-label-sm text-label-sm font-bold text-on-surface truncate">{asset.title}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{asset.target_language?.toUpperCase() || "EN"}</p>
              </button>
            ))}
          </div>
        </section>

        {/* 今日话题 — 原独立 /topics 页，收敛到主页 */}
        <TodayTopicsSection topics={topics} loading={topicsLoading} />
      </main>
    </div>
  );
}
