import { useI18n } from "../i18n";
import type { DailyResonanceContent } from "../lib/dailyResonance";

export const CONVERSATION_MODES = [
  { key: "socratic", icon: "🧠" },
  { key: "devils_advocate", icon: "😈" },
  { key: "information_collector", icon: "📋" },
  { key: "debate_training", icon: "⚔️" },
  { key: "role_simulation", icon: "🎭" },
  { key: "coach", icon: "💪" },
  { key: "free-talk", icon: "💬" },
] as const;

export function modeLabel(t: (k: string) => string, key: string) {
  const map: Record<string, string> = {
    socratic: t("chat.modeSocratic"),
    devils_advocate: t("chat.modeDevilsAdvocate"),
    information_collector: t("chat.modeInfoCollector"),
    debate_training: t("chat.modeDebateTraining"),
    role_simulation: t("chat.modeRoleSimulation"),
    coach: t("chat.modeCoach"),
    "free-talk": t("chat.modeFreeTalk"),
  };
  return map[key] || key;
}

export function modeDesc(t: (k: string) => string, key: string) {
  const map: Record<string, string> = {
    socratic: t("chat.modeSocraticDesc"),
    devils_advocate: t("chat.modeDevilsAdvocateDesc"),
    information_collector: t("chat.modeInfoCollectorDesc"),
    debate_training: t("chat.modeDebateTrainingDesc"),
    role_simulation: t("chat.modeRoleSimulationDesc"),
    coach: t("chat.modeCoachDesc"),
    "free-talk": t("chat.modeFreeTalkDesc"),
  };
  return map[key] || "";
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (mode: string) => void;
  /** When set, shows Daily Resonance prompt + bilingual quote above mode list. */
  dailyResonance?: DailyResonanceContent | null;
};

export default function ConversationModePicker({ open, onClose, onSelect, dailyResonance }: Props) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div
      className="premium fixed inset-0 z-[200] flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[min(100%,430px)] bg-surface rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">{t("chat.selectMode")}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {dailyResonance && (
          <div className="mb-4 rounded-2xl bg-primary/5 border border-primary/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wide">Daily Resonance</span>
              <span className="material-symbols-outlined text-primary/50 text-[18px]">lightbulb</span>
            </div>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">{dailyResonance.promptTarget}</p>
            {dailyResonance.promptNative !== dailyResonance.promptTarget && (
              <p className="text-[12px] text-on-surface-variant/80 leading-relaxed">{dailyResonance.promptNative}</p>
            )}
            <div className="pt-2 border-t border-primary/10 space-y-2">
              <p className="text-[11px] font-bold text-outline">{dailyResonance.targetLabel}</p>
              <p className="text-[15px] text-on-surface italic leading-snug">"{dailyResonance.quoteTarget}"</p>
              {dailyResonance.quoteNative !== dailyResonance.quoteTarget && (
                <>
                  <p className="text-[11px] font-bold text-outline pt-1">{dailyResonance.nativeLabel}</p>
                  <p className="text-[14px] text-on-surface-variant leading-snug">"{dailyResonance.quoteNative}"</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          {CONVERSATION_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low hover:bg-primary/10 transition-colors text-left active:scale-[0.98]"
            >
              <span className="text-2xl">{m.icon}</span>
              <div className="min-w-0">
                <strong className="block font-body-md font-semibold text-on-surface">{modeLabel(t, m.key)}</strong>
                <span className="text-[12px] text-on-surface-variant line-clamp-1">{modeDesc(t, m.key)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
