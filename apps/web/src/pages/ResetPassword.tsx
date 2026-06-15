import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "../i18n";
import { resetPassword } from "../api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError(t("resetPassword.mismatch"));
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword(token, newPassword);
      setSuccess(data.message || t("resetPassword.success"));
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "重置失败");
    } finally {
      setLoading(false);
    }
  }

  const inner = (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>key</span>
        </div>
        <h1 className="font-bold text-[24px] text-on-surface tracking-tight">{t("resetPassword.title")}</h1>
        <p className="text-[14px] text-on-surface-variant mt-1">设置你的新密码</p>
      </div>

      {!token ? (
        <>
          <div className="px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
            {t("resetPassword.invalidToken")}
          </div>
          <p className="text-center text-[14px] text-on-surface-variant mt-6">
            <Link to="/login" className="text-primary font-bold">{t("forgotPassword.backToLogin")}</Link>
          </p>
        </>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                onClick={() => setError("")}
                className="px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error text-[13px] flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
                {error}
              </div>
            )}
            {success && (
              <div className="px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-[13px] text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px] flex-shrink-0">check_circle</span>
                {success}
              </div>
            )}

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
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
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
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
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
          </form>

          <p className="text-center text-[14px] text-on-surface-variant mt-6">
            <Link to="/login" className="text-primary font-bold">{t("forgotPassword.backToLogin")}</Link>
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className="premium fixed inset-0 bg-surface text-on-surface flex items-center justify-center px-5">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
      </div>
      {inner}
    </div>
  );
}
