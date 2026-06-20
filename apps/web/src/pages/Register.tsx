import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useI18n } from "../i18n";
import { useAuthStore } from "../stores/authStore";

type RegistrationPreview = {
  email: string;
  is_google_email: boolean;
  registration_trial_enabled: boolean;
  registration_trial_days: number;
  registration_trial_membership_level: string | null;
  google_trial_enabled: boolean;
  google_trial_days: number;
  google_trial_membership_level: string | null;
  email_verification_enabled: boolean;
  message: string;
};

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<RegistrationPreview | null>(null);
  const [localError, setLocalError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const { register, loading, error, clearError } = useAuthStore();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!email.includes("@")) {
      setPreview(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void apiRequest<RegistrationPreview>(
        `/api/auth/registration-preview?email=${encodeURIComponent(email)}`
      )
        .then(setPreview)
        .catch(() => setPreview(null));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [email]);

  async function handleSendCode() {
    setLocalError("");
    clearError();
    setSendingCode(true);
    try {
      const data = await apiRequest<{ message: string; dev_code?: string | null }>(
        "/api/auth/send-verification-code",
        { method: "POST", body: JSON.stringify({ email }) }
      );
      setCodeSent(true);
      setDevCode(data.dev_code ?? null);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : t("register.sendCodeFailed"));
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");
    try {
      await register(email, username, password, verificationCode);
      navigate("/onboarding", { replace: true });
    } catch {
      // error is set in store
    }
  }

  const displayError = localError || error;

  return (
    <div className="premium fixed inset-0 bg-surface text-on-surface flex items-center justify-center px-5 overflow-y-auto">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-60 h-60 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="w-full max-w-sm py-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>cognition</span>
          </div>
          <h1 className="font-bold text-[28px] text-on-surface tracking-tight">AinerSpeak</h1>
          <p className="text-[14px] text-on-surface-variant mt-1">{t("register.title")}</p>
        </div>

        {preview && (
          <div className="mb-5 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-[13px] text-on-surface-variant flex items-start gap-2">
            <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 flex-shrink-0">info</span>
            <div>
              <span>{preview.message}</span>
              {preview.registration_trial_enabled && (
                <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary text-[11px] font-bold">
                  {t("register.trialBadge", {
                    days: preview.registration_trial_days,
                    level: preview.registration_trial_membership_level?.toUpperCase() ?? "VIP",
                  })}
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {displayError && (
            <div
              onClick={() => { setLocalError(""); clearError(); }}
              className="px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error text-[13px] flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
              {displayError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-on-surface-variant">{t("register.email")}</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("register.emailPlaceholder")}
                required
                autoComplete="email"
                className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              />
              <button
                type="button"
                disabled={sendingCode || !email || preview?.email_verification_enabled === false}
                onClick={() => void handleSendCode()}
                className="flex-shrink-0 px-4 py-3 rounded-2xl bg-primary/10 text-primary text-[13px] font-bold border border-primary/20 active:scale-95 transition-all disabled:opacity-40"
              >
                {sendingCode ? "发送中" : codeSent ? "重发" : "发验证码"}
              </button>
            </div>
            {preview?.email_verification_enabled === false && (
              <p className="text-[12px] text-on-surface-variant">{t("register.verificationDisabled")}</p>
            )}
          </div>

          {devCode && (
            <div className="px-4 py-3 rounded-2xl bg-tertiary-container/10 border border-tertiary-container/20 text-[13px] text-on-surface-variant">
              {t("register.devCode")}：<strong className="text-on-surface">{devCode}</strong>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-on-surface-variant">{t("register.code")}</label>
            <input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder={t("register.codePlaceholder")}
              required={preview?.email_verification_enabled !== false}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-on-surface-variant">{t("register.username")}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("register.usernamePlaceholder")}
              autoComplete="username"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-on-surface-variant">{t("register.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("register.passwordPlaceholder")}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || (preview?.email_verification_enabled !== false && !codeSent)}
            className="w-full bg-primary text-white rounded-full font-bold text-[16px] shadow-[0_8px_30px_rgba(99,14,212,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            style={{ height: "52px" }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("register.loading")}
              </>
            ) : t("register.submit")}
          </button>
        </form>

        <p className="text-center text-[14px] text-on-surface-variant mt-6">
          {t("register.hasAccount")}
          <Link to="/login" className="text-primary font-bold ml-1">{t("register.goLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
