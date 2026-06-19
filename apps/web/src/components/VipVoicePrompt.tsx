import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function VipVoicePrompt({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="premium fixed inset-0 z-[200] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        className="flex-1 min-h-[8vh] w-full bg-black/30 backdrop-blur-sm border-0 p-0"
        onClick={onClose}
      />
      <div
        className="w-full max-w-[430px] mx-auto bg-surface rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.12)] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,16px),16px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-8 h-1 rounded-full bg-outline-variant/40 mx-auto mb-4" />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed/30 flex items-center justify-center text-tertiary-container">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              military_tech
            </span>
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-on-surface">{t("home.vipVoiceTitle")}</h3>
            <p className="text-[12px] text-on-surface-variant mt-0.5">{t("home.vipVoiceSubtitle")}</p>
          </div>
        </div>
        <p className="text-[14px] text-on-surface-variant leading-relaxed mb-5">{t("home.vipVoiceBody")}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/membership");
            }}
            className="w-full h-11 rounded-xl bg-primary text-white text-[14px] font-bold active:scale-[0.98] transition-transform"
          >
            {t("home.vipVoiceCta")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 rounded-xl text-[13px] font-semibold text-on-surface-variant"
          >
            {t("home.vipVoiceLater")}
          </button>
        </div>
      </div>
    </div>
  );
}
