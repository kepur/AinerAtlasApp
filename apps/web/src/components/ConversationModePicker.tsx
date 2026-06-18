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
  dailyResonance?: DailyResonanceContent | null;
};

function DailyResonanceBlock({ content }: { content: DailyResonanceContent }) {
  return (
    <div className="mb-2.5 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-primary/70 text-[16px]">lightbulb</span>
        <span className="text-[11px] font-bold text-primary uppercase tracking-wide">Daily Resonance</span>
      </div>
      <p className="text-[12px] text-on-surface-variant leading-snug break-words">{content.promptTarget}</p>
      {content.promptNative !== content.promptTarget && (
        <p className="text-[11px] text-on-surface-variant/85 leading-snug break-words">{content.promptNative}</p>
      )}
      <div className="pt-1.5 border-t border-primary/10 space-y-1.5">
        <p className="text-[10px] font-bold text-outline">{content.targetLabel}</p>
        <p className="text-[13px] text-on-surface italic leading-snug break-words">"{content.quoteTarget}"</p>
        {content.quoteNative !== content.quoteTarget && (
          <>
            <p className="text-[10px] font-bold text-outline pt-0.5">{content.nativeLabel}</p>
            <p className="text-[12px] text-on-surface-variant leading-snug break-words">"{content.quoteNative}"</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConversationModePicker({ open, onClose, onSelect, dailyResonance }: Props) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="premium fixed inset-0 z-[200] flex flex-col justify-end">
      {/* 点击遮罩关闭；高度随内容收缩，不再占满上半屏 */}
      <button
        type="button"
        aria-label="Close"
        className="flex-1 min-h-[8vh] w-full bg-black/30 backdrop-blur-sm border-0 p-0 cursor-default"
        onClick={onClose}
      />

      <div
        className="w-full max-w-[430px] mx-auto bg-surface rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.12)] max-h-[min(90vh,820px)] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm px-4 pt-2 pb-2 border-b border-outline-variant/15">
          <div className="w-8 h-1 rounded-full bg-outline-variant/40 mx-auto mb-2" />
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-bold text-on-surface">{t("chat.selectMode")}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="px-4 pt-2 pb-[max(env(safe-area-inset-bottom,12px),12px)]">
          {dailyResonance && <DailyResonanceBlock content={dailyResonance} />}

          <div className="grid grid-cols-1 gap-1.5">
            {CONVERSATION_MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => onSelect(m.key)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-low hover:bg-primary/10 transition-colors text-left active:scale-[0.98]"
              >
                <span className="text-xl">{m.icon}</span>
                <div className="min-w-0">
                  <strong className="block text-[14px] font-semibold text-on-surface">{modeLabel(t, m.key)}</strong>
                  <span className="text-[11px] text-on-surface-variant line-clamp-1">{modeDesc(t, m.key)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
