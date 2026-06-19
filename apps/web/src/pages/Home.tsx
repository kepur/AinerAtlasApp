import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import ConversationModePicker from "../components/ConversationModePicker";
import TodayTopicsSection, { type TodayTopic } from "../components/TodayTopicsSection";
import VipVoicePrompt from "../components/VipVoicePrompt";
import { buildDailyResonance } from "../lib/dailyResonance";
import { hasVoiceCoachAccess } from "../lib/membership";
import { useI18n } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { createConversation } = useChatStore();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [topics, setTopics] = useState<TodayTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [showModePicker, setShowModePicker] = useState(false);
  const [showVipVoicePrompt, setShowVipVoicePrompt] = useState(false);

  const voiceAccess = hasVoiceCoachAccess(user);

  useEffect(() => {
    if (window.location.hash !== "#today-topics") return;
    const el = document.getElementById("today-topics");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [topicsLoading]);

  useEffect(() => {
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

  function openVoiceCoach() {
    if (!voiceAccess) {
      setShowVipVoicePrompt(true);
      return;
    }
    navigate("/voice");
  }

  const greetingName = user?.username || "Language Architect";
  const dailyResonance = buildDailyResonance(profile);

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
        <button
          onClick={openVoiceCoach}
          className="material-symbols-outlined text-primary hover:opacity-80 transition-opacity"
          aria-label="Voice Coach"
        >
          settings_voice
        </button>
      </nav>

      <main className="pt-2 pb-8 px-margin-mobile space-y-5">
        {/* 1. Express Your Thought — 主卡片 */}
        <section>
          <div className="relative overflow-hidden rounded-[20px] p-5 ai-glow glass-card border border-primary/10">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl resonance-indicator flex items-center justify-center text-white shadow-lg flex-shrink-0">
                  <span className="material-symbols-outlined fill text-[20px]">edit_note</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <span className="inline-block w-fit max-w-full px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-bold leading-normal">
                    {t("home.dailyResonance")}
                  </span>
                  <h2 className="text-[14px] font-semibold text-on-surface leading-snug">{t("home.expressYourThought")}</h2>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">
                    {t("home.expressYourThoughtDesc")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModePicker(true)}
                className="w-full h-10 mt-4 bg-primary text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[20px]">forum</span>
                {t("home.selectModeAndStart")}
              </button>
            </div>
          </div>
        </section>

        {/* 2. AinerWise Coach — 直达语音对话 */}
        <section>
          <button
            type="button"
            onClick={openVoiceCoach}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl premium-shadow bg-surface-container-lowest border border-primary/5 text-left active:scale-[0.99] transition-transform"
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined fill text-[20px]">settings_voice</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-tertiary-fixed-dim border-2 border-surface rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[14px] text-on-surface truncate">AinerWise Coach</h3>
                <span className="text-[9px] text-primary font-bold uppercase tracking-wide">Live</span>
                {!voiceAccess && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-tertiary-fixed/25 text-tertiary-container font-bold">VIP</span>
                )}
              </div>
              <p className="text-[12px] text-on-surface-variant truncate">{t("home.coachDesc")}</p>
            </div>
            <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white">
              <span className="material-symbols-outlined text-[20px]">call</span>
            </div>
          </button>
        </section>

        {/* 3. 今日话题 */}
        <TodayTopicsSection topics={topics} loading={topicsLoading} />
      </main>

      <ConversationModePicker
        open={showModePicker}
        onClose={() => setShowModePicker(false)}
        onSelect={(mode) => void handleNewConversation(mode)}
        dailyResonance={dailyResonance}
      />

      <VipVoicePrompt open={showVipVoicePrompt} onClose={() => setShowVipVoicePrompt(false)} />
    </div>
  );
}
