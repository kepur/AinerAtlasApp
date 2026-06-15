import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, type Conversation, type MasteryItem } from "../api";
import { useI18n } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";

type Topic = {
  id: string;
  title: string;
  tags: string[];
};

// Mock placeholders for sections without a backend feed yet.
// TODO(backend): GET /api/assets?type=freeze for the Thought Freeze carousel.
const MOCK_FREEZE_ASSETS = [
  { id: "fa1", title: "Nostalgia vs Sehnsucht", time: "2 hours ago", tint: "from-[#7c3aed] to-[#0058be]" },
  { id: "fa2", title: "Formal Greetings", time: "Yesterday", tint: "from-[#005b3d] to-[#0058be]" },
  { id: "fa3", title: "Abstract Metaphor", time: "Oct 24", tint: "from-[#732ee4] to-[#d2bbff]" }
];

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { createConversation } = useChatStore();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [queue, setQueue] = useState<MasteryItem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    apiRequest<Conversation[]>("/api/conversations")
      .then((data) => {
        if (data && data.length > 0) setRecentConversations(data.slice(0, 3));
        else
          setRecentConversations([
            { id: "mock-c1", title: "The Subtle nuances of 'Heimat'", mode: "socratic", messages: [1, 2, 3, 4], status: "active", created_at: "", updated_at: "" } as unknown as Conversation
          ]);
      })
      .catch(() =>
        setRecentConversations([
          { id: "mock-c1", title: "The Subtle nuances of 'Heimat'", mode: "socratic", messages: [1, 2, 3, 4], status: "active", created_at: "", updated_at: "" } as unknown as Conversation
        ])
      );

    apiRequest<MasteryItem[]>("/api/grammar/queue")
      .then((data) => {
        if (data && data.length > 0) setQueue(data);
        else
          setQueue([
            { id: "mq1", item_type: "vocabulary", title: "Serendipity", mastery_score: 85, status: "mastered", item_id: "vi1" } as unknown as MasteryItem,
            { id: "mq2", item_type: "pattern", title: "Not only... but also", mastery_score: 45, status: "learning", item_id: "pi1" } as unknown as MasteryItem
          ]);
      })
      .catch(() => setQueue([]));

    apiRequest<Topic[]>("/api/topics")
      .then((data) => {
        if (data && data.length > 0) setTopics(data.slice(0, 5));
        else
          setTopics([
            { id: "mt1", title: "Poetic Structures in Business", tags: ["Career", "Hot"] },
            { id: "mt2", title: "Sustainable Living Tips", tags: ["Lifestyle"] }
          ]);
      })
      .catch(() => setTopics([{ id: "mt1", title: "Poetic Structures in Business", tags: ["Career", "Hot"] }]));
  }, []);

  async function startThought() {
    try {
      const conv = await createConversation({ title: t("home.newThoughtTitle"), mode: "socratic" });
      navigate(`/chat/${conv.id}`);
    } catch {
      /* handled in store */
    }
  }

  const masteredCount = queue.filter((q) => q.mastery_score >= 80).length;
  const focusTopic = topics[0]?.title ?? "Nuanced Negotiation";
  const recent = recentConversations[0];
  const liveRoom = topics[0];

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
            {MOCK_FREEZE_ASSETS.map((asset) => (
              <button
                key={asset.id}
                onClick={() => navigate("/assets")}
                className="flex-shrink-0 w-40 p-4 bg-white rounded-2xl premium-shadow border border-surface-variant/20 text-left"
              >
                <div className={`w-full aspect-square rounded-xl mb-3 bg-gradient-to-br ${asset.tint}`} />
                <p className="font-label-sm text-label-sm font-bold text-on-surface truncate">{asset.title}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{asset.time}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Live Circle Rooms */}
        <section className="pb-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Live Circle Rooms</h3>
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="w-2 h-2 rounded-full bg-surface-dim" />
            </div>
          </div>
          <div className="relative rounded-[1.5rem] overflow-hidden aspect-[16/9] premium-shadow bg-gradient-to-br from-[#732ee4] via-[#630ed4] to-[#0058be]">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent flex flex-col justify-end p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
                </span>
                <p className="font-label-sm text-label-sm text-white uppercase tracking-widest">Trending Now</p>
              </div>
              <h4 className="font-headline-lg text-headline-lg text-white mb-1">{liveRoom?.title ?? "Poetic Structures in Business"}</h4>
              <p className="font-body-md text-white/80">14 architects discussing right now</p>
              <button
                onClick={() => navigate("/topics")}
                className="mt-4 px-6 h-10 bg-white text-primary rounded-full font-bold self-start hover:bg-primary-fixed active:scale-95 transition-all"
              >
                Join Circle
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
