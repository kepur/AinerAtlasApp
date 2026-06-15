import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import { apiRequest } from "../api";

type DemoConfig = {
  enabled: boolean;
  email?: string | null;
  password?: string | null;
  message?: string;
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoConfig, setDemoConfig] = useState<DemoConfig | null>(null);
  const { login, loading, error, clearError } = useAuthStore();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    void apiRequest<DemoConfig>("/api/auth/demo-config")
      .then((config) => {
        setDemoConfig(config);
        if (config.enabled && config.email && config.password) {
          setEmail(config.email);
          setPassword(config.password);
        }
      })
      .catch(() => setDemoConfig({ enabled: false }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/home", { replace: true });
    } catch {
      // error is set in store
    }
  }

  return (
    <div className="premium fixed inset-0 bg-surface text-on-surface flex items-center justify-center px-5">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-60 h-60 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>cognition</span>
          </div>
          <h1 className="font-bold text-[28px] text-on-surface tracking-tight">AinerSpeak</h1>
          <p className="text-[14px] text-on-surface-variant mt-1">{t("login.tagline")}</p>
        </div>

        {demoConfig?.enabled && (
          <div className="mb-5 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-[13px] text-on-surface-variant flex items-start gap-2">
            <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 flex-shrink-0">info</span>
            <div>
              <span>{demoConfig.message || t("login.demoHint")}</span>
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary text-[11px] font-bold">{t("login.demoBadge")}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              onClick={clearError}
              className="px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error text-[13px] flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-on-surface-variant">{t("login.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-on-surface-variant">{t("login.password")}</label>
              {!demoConfig?.enabled && (
                <Link to="/forgot-password" className="text-[12px] text-primary font-medium">
                  {t("login.forgotPassword") || "忘记密码?"}
                </Link>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.passwordPlaceholder")}
              required
              autoComplete="current-password"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 bg-primary text-white rounded-full font-bold text-[16px] shadow-[0_8px_30px_rgba(99,14,212,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            style={{ height: "52px" }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("login.loading")}
              </>
            ) : demoConfig?.enabled ? t("login.demoSubmit") : t("login.submit")}
          </button>
        </form>

        {!demoConfig?.enabled && (
          <p className="text-center text-[14px] text-on-surface-variant mt-6">
            {t("login.noAccount")}
            <Link to="/register" className="text-primary font-bold ml-1">{t("login.register")}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
