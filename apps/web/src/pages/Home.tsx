import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, type Conversation } from "../api";
import ConversationModePicker from "../components/ConversationModePicker";
import TodayTopicsSection, { type TodayTopic } from "../components/TodayTopicsSection";
import { useI18n } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const { createConversation } = useChatStore();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [topics, setTopics] = useState<TodayTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [showModePicker, setShowModePicker] = useState(false);

  useEffect(() => {
    if (window.location.hash !== "#today-topics") return;
    const el = document.getElementById("today-topics");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [topicsLoading]);

  useEffect(() => {
    apiRequest<Conversation[]>("/api/conversations")
      .then((data) => setRecentConversations(data && data.length > 0 ? data.slice(0, 3) : []))
      .catch(() => setRecentConversations([]));

    apiRequest<TodayTopic[]>("/api/topics")
      .then((data) => setTopics(data?.length ? data : []))
      .catch(() => setTopics([]))
      .finally(() => setTopicsLoading(false));
  }, []);

  async function handleNewConversation(mode?: string) {
    try {
      const conv = await createConversation({
        title: t("home.newThoughtTitle"),
        mode: mode || "socratic",
      });
      setShowModePicker(false);
      navigate(`/chat/${conv.id}`);
    } catch {
      /* handled in store */
    }
  }

  function continueSession() {
    if (recentConversations[0]) navigate(`/chat/${recentConversations[0].id}`);
    else setShowModePicker(true);
  }

  const greetingName = user?.username || "Language Architect";

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
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
        {/* 1. Express Your Thought — 主页首位 */}
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
              onClick={() => setShowModePicker(true)}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">edit_note</span>
              Express Your Thought
            </button>
          </div>
        </section>

        {/* 2. AinerWise Coach */}
        <section>
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
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">AinerWise Coach</h2>
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
              <button
                onClick={() => navigate("/voice")}
                className="w-9 h-9 flex items-center justify-center text-primary bg-primary-fixed/30 rounded-xl active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[18px]">settings_voice</span>
              </button>
            </div>
          </div>
        </section>

        {/* 3. 今日话题 */}
        <TodayTopicsSection topics={topics} loading={topicsLoading} />
      </main>

      <ConversationModePicker
        open={showModePicker}
        onClose={() => setShowModePicker(false)}
        onSelect={(mode) => void handleNewConversation(mode)}
      />
    </div>
  );
}
