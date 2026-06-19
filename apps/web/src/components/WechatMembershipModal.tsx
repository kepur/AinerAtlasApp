import { useI18n } from "../i18n";

const WECHAT_ID = "wolihi";
const QR_SRC = "/wechat-membership-qr.png";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function WechatMembershipModal({ open, onClose }: Props) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="premium fixed inset-0 z-[220] flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm border-0 p-0"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-[380px] mx-auto bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl px-5 pt-3 pb-[max(env(safe-area-inset-bottom,20px),20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-8 h-1 rounded-full bg-outline-variant/40 mx-auto mb-4 sm:hidden" />
        <div className="text-center mb-4">
          <h3 className="text-[18px] font-bold text-on-surface">{t("membership.wechatModalTitle")}</h3>
          <p className="text-[13px] text-on-surface-variant mt-1 leading-relaxed">{t("membership.wechatModalHint")}</p>
        </div>
        <div className="rounded-2xl overflow-hidden border border-outline-variant/25 bg-white p-3 mb-4">
          <img
            src={QR_SRC}
            alt={t("membership.wechatQrAlt")}
            className="w-full max-w-[280px] mx-auto block rounded-lg"
          />
        </div>
        <p className="text-center text-[13px] text-on-surface-variant mb-4">
          {t("membership.wechatIdLabel")}: <span className="font-semibold text-on-surface">@{WECHAT_ID}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-primary text-white text-[14px] font-bold active:scale-[0.98] transition-transform"
        >
          {t("membership.wechatModalDone")}
        </button>
      </div>
    </div>
  );
}
