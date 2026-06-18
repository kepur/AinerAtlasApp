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
        {/* 1. Express Your Thought — 主卡片 */}
        <section>
          <div className="relative overflow-hidden rounded-[20px] p-5 ai-glow glass-card border border-primary/10">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl resonance-indicator flex items-center justify-center text-white shadow-lg flex-shrink-0">
                  <span className="material-symbols-outlined fill text-[24px]">edit_note</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Express Your Thought</h2>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-bold flex-shrink-0">
                      Daily Resonance
                    </span>
                  </div>
                  <p className="text-[13px] text-on-surface-variant leading-relaxed">
                    How would you translate today's sentiment into your target language's formal register?
                  </p>
                </div>
              </div>
              <blockquote className="font-headline-lg text-headline-lg text-on-surface mb-5 italic px-1 leading-snug">
                "The art of silence is as expressive as the choice of words."
              </blockquote>
              <button
                onClick={() => setShowModePicker(true)}
                className="w-full h-11 bg-primary text-white rounded-xl font-label-sm text-[14px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[20px]">forum</span>
                选择模式并开始表达
              </button>
            </div>
          </div>
        </section>

        {/* 2. AinerWise Coach — 紧凑小卡片 */}
        <section>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl premium-shadow bg-surface-container-lowest border border-primary/5">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined fill text-[20px]">psychology</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-tertiary-fixed-dim border-2 border-surface rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[14px] text-on-surface truncate">AinerWise Coach</h3>
                <span className="text-[9px] text-primary font-bold uppercase tracking-wide">Live</span>
              </div>
              <p className="text-[12px] text-on-surface-variant truncate">继续上次对话或进入语音教练</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={continueSession}
                className="h-8 px-3 bg-primary text-white rounded-lg text-[12px] font-bold active:scale-95 transition-transform"
              >
                继续
              </button>
              <button
                onClick={() => navigate("/voice")}
                className="w-8 h-8 flex items-center justify-center text-primary bg-primary-fixed/40 rounded-lg active:scale-95 transition-transform"
                aria-label="Voice Coach"
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
