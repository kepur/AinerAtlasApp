import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "../i18n";
import { resetPasswordWithCode, sendPasswordResetCode } from "../api";
import { useAuthStore } from "../stores/authStore";

type Step = "email" | "reset";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [codeSentMsg, setCodeSentMsg] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [error, setError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userEmail = useAuthStore((s) => s.user?.email);

  useEffect(() => {
    const fromQuery = searchParams.get("email")?.trim();
    const preset = fromQuery || userEmail || "";
    if (preset) setEmail(preset);
  }, [searchParams, userEmail]);

  async function handleSendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setCodeSentMsg("");
    setDevCode(null);
    setSendingCode(true);
    try {
      const data = await sendPasswordResetCode(email);
      setDevCode(data.dev_code ?? null);
      setCodeSentMsg(data.message || t("forgotPassword.codeSent"));
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("forgotPassword.sendCodeFailed"));
    } finally {
      setSendingCode(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResetSuccess("");

    if (newPassword !== confirmPassword) {
      setError(t("resetPassword.mismatch"));
      return;
    }

    setLoading(true);
    try {
      const data = await resetPasswordWithCode(email, verificationCode, newPassword);
      setResetSuccess(data.message || t("resetPassword.success"));
      if (isLoggedIn) logout();
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resetPassword.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="premium fixed inset-0 bg-surface text-on-surface flex items-center justify-center px-5 overflow-y-auto">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="w-full max-w-sm py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
          </div>
          <h1 className="font-bold text-[24px] text-on-surface tracking-tight">{t("forgotPassword.title")}</h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            {step === "email" ? t("forgotPassword.subtitleEmail") : t("forgotPassword.subtitleReset")}
          </p>
        </div>

        {error && (
          <div
            onClick={() => setError("")}
            className="mb-4 px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error text-[13px] flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
            {error}
          </div>
        )}
        {codeSentMsg && step === "reset" && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-[13px] text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[16px] flex-shrink-0">mail</span>
            {codeSentMsg}
          </div>
        )}
        {resetSuccess && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-[13px] text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[16px] flex-shrink-0">check_circle</span>
            {resetSuccess}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-on-surface-variant">{t("forgotPassword.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("forgotPassword.emailPlaceholder")}
                required
                autoComplete="email"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={sendingCode || !email.trim()}
              className="w-full bg-primary text-white rounded-full font-bold text-[16px] shadow-[0_8px_30px_rgba(99,14,212,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ height: "52px" }}
            >
              {sendingCode ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("forgotPassword.sendingCode")}
                </>
              ) : t("forgotPassword.sendCode")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-on-surface-variant">{t("forgotPassword.email")}</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full bg-surface-container-low/60 border border-outline-variant/20 rounded-2xl px-4 py-3 text-[15px] text-on-surface-variant"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-on-surface-variant">{t("forgotPassword.code")}</label>
              <input
                type="text"
                inputMode="numeric"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("forgotPassword.codePlaceholder")}
                required
                maxLength={6}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface tracking-[0.3em] text-center font-bold outline-none focus:ring-2 focus:ring-primary/30"
              />
              {devCode && (
                <p className="text-[12px] text-primary font-medium">
                  {t("forgotPassword.devCode")}: {devCode}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-on-surface-variant">{t("resetPassword.newPassword")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("resetPassword.passwordPlaceholder")}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-on-surface-variant">{t("resetPassword.confirmPassword")}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("resetPassword.passwordPlaceholder")}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              type="button"
              disabled={sendingCode}
              onClick={() => void handleSendCode()}
              className="w-full text-[13px] text-primary font-medium py-1"
            >
              {t("forgotPassword.resendCode")}
            </button>

            <button
              type="submit"
              disabled={loading || verificationCode.length < 6}
              className="w-full bg-primary text-white rounded-full font-bold text-[16px] shadow-[0_8px_30px_rgba(99,14,212,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ height: "52px" }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("resetPassword.loading")}
                </>
              ) : t("resetPassword.submit")}
            </button>

            <button
              type="button"
              onClick={() => { setStep("email"); setCodeSentMsg(""); setDevCode(null); }}
              className="w-full text-[13px] text-on-surface-variant py-1"
            >
              {t("forgotPassword.changeEmail")}
            </button>
          </form>
        )}

        <p className="text-center text-[14px] text-on-surface-variant mt-6">
          <Link to="/login" className="text-primary font-bold">{t("forgotPassword.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
