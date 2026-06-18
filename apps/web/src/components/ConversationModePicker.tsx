import { useI18n } from "../i18n";

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
};

export default function ConversationModePicker({ open, onClose, onSelect }: Props) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div
      className="premium fixed inset-0 z-[200] flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[min(100%,430px)] bg-surface rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto"
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
