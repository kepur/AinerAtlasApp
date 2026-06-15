import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { forgotPassword } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await forgotPassword(email);
      setSuccess(data.message || t("forgotPassword.success"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="premium fixed inset-0 bg-surface text-on-surface flex items-center justify-center px-5">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
          </div>
          <h1 className="font-bold text-[24px] text-on-surface tracking-tight">{t("forgotPassword.title")}</h1>
          <p className="text-[14px] text-on-surface-variant mt-1">输入邮箱，我们将发送重置链接</p>
        </div>

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
            disabled={loading || !!success}
            className="w-full bg-primary text-white rounded-full font-bold text-[16px] shadow-[0_8px_30px_rgba(99,14,212,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ height: "52px" }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("forgotPassword.loading")}
              </>
            ) : t("forgotPassword.submit")}
          </button>
        </form>

        <p className="text-center text-[14px] text-on-surface-variant mt-6">
          <Link to="/login" className="text-primary font-bold">{t("forgotPassword.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
