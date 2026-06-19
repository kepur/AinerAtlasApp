import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import WechatMembershipModal from "../components/WechatMembershipModal";

const CONTACTS = {
  wechat: "wolihi",
  telegram: "ainerwise",
  email: "info@ainerwise.com",
} as const;

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  return Promise.resolve();
}

export default function Help() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);
  const [wechatOpen, setWechatOpen] = useState(false);

  async function handleCopy(key: string, value: string) {
    try {
      await copyText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-1/3 -left-20 w-48 h-48 rounded-full bg-tertiary-fixed/15 blur-2xl" />
      </div>

      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">
          arrow_back
        </button>
        <div>
          <h1 className="font-bold text-[16px] text-on-surface leading-tight">{t("help.title")}</h1>
          <p className="text-[11px] text-on-surface-variant">{t("help.subtitle")}</p>
        </div>
      </header>

      <main className="px-margin-mobile pt-6 pb-24 space-y-5">
        <section className="glass-card premium-shadow rounded-2xl p-5 border border-primary/10">
          <p className="text-[14px] text-on-surface-variant leading-relaxed">{t("help.intro")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-label-sm text-outline px-1">{t("help.contactTitle")}</h2>

          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-surface-container-high divide-y divide-surface-container-high">
            <ContactRow
              icon="chat"
              iconBg="bg-tertiary-fixed/30"
              iconColor="text-tertiary"
              label={t("help.wechat")}
              value={`@${CONTACTS.wechat}`}
              hint={t("help.wechatHint")}
              copied={copied === "wechat"}
              copyLabel={t("help.copy")}
              copiedLabel={t("help.copied")}
              onCopy={() => handleCopy("wechat", `@${CONTACTS.wechat}`)}
              actionLabel="扫码添加"
              onAction={() => setWechatOpen(true)}
            />

            <ContactRow
              icon="send"
              iconBg="bg-secondary-fixed/30"
              iconColor="text-secondary"
              label={t("help.telegram")}
              value={`@${CONTACTS.telegram}`}
              hint={t("help.telegramHint")}
              copied={copied === "telegram"}
              copyLabel={t("help.copy")}
              copiedLabel={t("help.copied")}
              onCopy={() => handleCopy("telegram", `@${CONTACTS.telegram}`)}
              actionLabel={t("help.openTelegram")}
              onAction={() => window.open(`https://t.me/${CONTACTS.telegram}`, "_blank", "noopener,noreferrer")}
            />

            <ContactRow
              icon="mail"
              iconBg="bg-primary-fixed/30"
              iconColor="text-primary"
              label={t("help.email")}
              value={CONTACTS.email}
              hint={t("help.emailHint")}
              copied={copied === "email"}
              copyLabel={t("help.copy")}
              copiedLabel={t("help.copied")}
              onCopy={() => handleCopy("email", CONTACTS.email)}
              actionLabel={t("help.sendEmail")}
              onAction={() => {
                window.location.href = `mailto:${CONTACTS.email}?subject=${encodeURIComponent("AinerWise Feedback")}`;
              }}
            />
          </div>
        </section>

        <section className="glass-card premium-shadow rounded-2xl p-5 border border-surface-container-high">
          <h3 className="font-medium text-on-surface mb-2">{t("help.feedbackTipsTitle")}</h3>
          <ul className="text-[13px] text-on-surface-variant space-y-2 list-disc pl-4">
            <li>{t("help.feedbackTip1")}</li>
            <li>{t("help.feedbackTip2")}</li>
            <li>{t("help.feedbackTip3")}</li>
          </ul>
        </section>
      </main>
      <WechatMembershipModal open={wechatOpen} onClose={() => setWechatOpen(false)} />
    </div>
  );
}

function ContactRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  hint,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
  actionLabel,
  onAction,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  hint: string;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  onCopy: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="p-4 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} flex-shrink-0`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-on-surface">{label}</p>
        <p className="text-[15px] text-primary font-semibold mt-0.5">{value}</p>
        <p className="text-[12px] text-on-surface-variant mt-1">{hint}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={onCopy}
            className="px-3 py-1.5 rounded-lg bg-surface-container text-[12px] font-medium text-on-surface hover:bg-surface-container-high transition-colors"
          >
            {copied ? copiedLabel : copyLabel}
          </button>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
