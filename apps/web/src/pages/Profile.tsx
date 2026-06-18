import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUserStats, resolveMediaUrl, type UserStats } from "../api";
import { useAuthStore } from "../stores/authStore";

type MenuRow = {
  icon: string;
  label: string;
  sublabel?: string;
  sublabelTone?: string;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
};

export default function Profile() {
  const { user, profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    fetchUserStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const username = user?.username || "Language Architect";
  const avatarUrl = resolveMediaUrl(profile?.avatar_url);
  const membership = (user?.membership_level ?? "free").toUpperCase();
  const level = profile?.current_level ?? "A1";
  const grammar = Math.round(profile?.grammar_level_score ?? 0);
  const vocab = Math.round(profile?.vocabulary_level_score ?? 0);
  const fluency = Math.round(profile?.fluency_score ?? 0);
  const confidence = Math.round(profile?.speaking_confidence_score ?? 0);
  const masteryAvg = Math.round((grammar + vocab + fluency + confidence) / 4);
  const masteryLabel =
    masteryAvg >= 80 ? "Advanced Fluent" : masteryAvg >= 55 ? "Upper Intermediate" : masteryAvg >= 30 ? "Intermediate" : "Foundational";

  const intelligence: MenuRow[] = [
    {
      icon: "tune",
      label: "Intelligence Settings",
      iconBg: "bg-primary-fixed/30",
      iconColor: "text-primary",
      onClick: () => navigate("/settings")
    },
    {
      icon: "analytics",
      label: "My Growth Reports",
      iconBg: "bg-tertiary-fixed/30",
      iconColor: "text-tertiary",
      onClick: () => navigate("/report")
    }
  ];

  const account: MenuRow[] = [
    {
      icon: "workspace_premium",
      label: "Membership",
      sublabel: `${membership} plan`,
      sublabelTone: "text-primary",
      iconBg: "bg-primary-fixed/30",
      iconColor: "text-primary",
      onClick: () => navigate("/membership")
    },
    {
      icon: "shield",
      label: "Privacy & Security",
      sublabel: "Thought Shield: Active",
      sublabelTone: "text-tertiary-container",
      iconBg: "bg-secondary-fixed/30",
      iconColor: "text-secondary",
      onClick: () => navigate("/privacy")
    },
    {
      icon: "help",
      label: "Help & Feedback",
      iconBg: "bg-surface-container",
      iconColor: "text-on-surface-variant",
      onClick: () => navigate("/settings")
    }
  ];

  const adminMenu: MenuRow[] = [
    {
      icon: "admin_panel_settings",
      label: "Admin Panel",
      iconBg: "bg-error-container",
      iconColor: "text-error",
      onClick: () => navigate("/admin/story-publisher")
    }
  ];

  return (
    <div className="premium min-h-full bg-surface text-on-surface pb-32">
      {/* Top AppBar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-margin-mobile h-touch-target-min bg-surface/80 backdrop-blur-xl">
        <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">AinerWise</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/voice")} className="p-2 hover:opacity-80 transition-opacity active:scale-95">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary-fixed bg-primary-fixed flex items-center justify-center font-bold text-primary text-sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              username.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </nav>

      <main className="pt-2 pb-8 px-margin-mobile">
        {/* Profile Header */}
        <section className="mt-6 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-tertiary-fixed-dim">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-surface bg-primary-fixed flex items-center justify-center text-primary text-5xl font-bold">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  username.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            {profile?.lgbtq_visible && (
              <span
                className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-[#e40303] via-[#ff8c00] to-[#732982] text-white text-xs flex items-center justify-center shadow-md"
                title="LGBTQ+"
              >
                🏳️‍🌈
              </span>
            )}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 rounded-full shadow-lg border border-surface whitespace-nowrap">
              <span className="text-white font-label-sm text-[10px] uppercase tracking-wider font-bold">{level} Expressionist</span>
            </div>
          </div>
          <h2 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface">{username}</h2>
          <p className="font-body-md text-on-surface-variant font-medium">{user?.email || "Language Architect"}</p>
        </section>

        {/* Resonance Stats (Bento) */}
        <section className="mt-10">
          <h3 className="font-headline-md text-headline-md mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined fill text-primary">insights</span>
            Resonance Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate("/patterns")} className="glass-card premium-shadow p-4 rounded-2xl flex flex-col justify-between h-32 text-left">
              <div className="flex justify-between items-start">
                <span className="font-label-sm text-on-surface-variant">Grammar</span>
                <span className="text-tertiary-container font-bold">{grammar}%</span>
              </div>
              <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full" style={{ width: `${grammar}%` }} />
              </div>
            </button>
            <button onClick={() => navigate("/vocabulary")} className="glass-card premium-shadow p-4 rounded-2xl flex flex-col justify-between h-32 text-left">
              <div className="flex justify-between items-start">
                <span className="font-label-sm text-on-surface-variant">Vocabulary</span>
                <span className="text-tertiary-container font-bold">{vocab}%</span>
              </div>
              <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full" style={{ width: `${vocab}%` }} />
              </div>
            </button>
            <div className="glass-card premium-shadow p-4 rounded-2xl col-span-2 relative overflow-hidden h-40">
              <div className="relative z-10">
                <span className="font-label-sm text-on-surface-variant">Global Mastery</span>
                <p className="font-headline-lg text-headline-lg text-primary">{masteryLabel}</p>
                <p className="text-[12px] text-on-surface-variant mt-1">
                  {stats ? `${stats.mastered_count} assets mastered · ${stats.conversation_count} sessions` : "Keep expressing to grow"}
                </p>
              </div>
              <div className="absolute bottom-0 right-0 left-0 h-16 opacity-30">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                  <path d="M0 20 Q 25 5 50 15 T 100 5 L 100 20 L 0 20 Z" fill="#7C3AED" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Menu Sections */}
        <section className="mt-10 space-y-4">
          <div className="space-y-2">
            <h4 className="font-label-sm text-outline px-2">INTELLIGENCE</h4>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-surface-container-high">
              {intelligence.map((row, i) => (
                <div key={row.label}>
                  <MenuButton row={row} />
                  {i < intelligence.length - 1 && <div className="h-px bg-surface-container-high mx-4" />}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-label-sm text-outline px-2">ACCOUNT</h4>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-surface-container-high">
              {account.map((row, i) => (
                <div key={row.label}>
                  <MenuButton row={row} />
                  {i < account.length - 1 && <div className="h-px bg-surface-container-high mx-4" />}
                </div>
              ))}
            </div>
          </div>

          {user?.role === "super_admin" && (
            <div className="space-y-2">
              <h4 className="font-label-sm text-outline px-2">ADMINISTRATION</h4>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-surface-container-high">
                {adminMenu.map((row, i) => (
                  <div key={row.label}>
                    <MenuButton row={row} />
                    {i < adminMenu.length - 1 && <div className="h-px bg-surface-container-high mx-4" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full p-4 rounded-2xl border border-error-container text-error font-medium hover:bg-error-container/20 transition-colors mt-4"
          >
            Logout of Session
          </button>
        </section>

        {/* Footer Meta */}
        <footer className="mt-12 mb-4 text-center space-y-2 opacity-60">
          <p className="font-label-sm text-on-surface-variant">AinerWise v2.4.0-pro</p>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
            <p className="font-label-sm text-tertiary">Semantic Engine: Optimal</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function MenuButton({ row }: { row: MenuRow }) {
  return (
    <button onClick={row.onClick} className="w-full flex items-center justify-between p-4 hover:bg-surface-variant/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl ${row.iconBg} flex items-center justify-center ${row.iconColor}`}>
          <span className="material-symbols-outlined">{row.icon}</span>
        </div>
        <div className="text-left">
          <span className="font-body-md font-medium text-on-surface block">{row.label}</span>
          {row.sublabel && <span className={`text-[12px] font-medium ${row.sublabelTone ?? "text-on-surface-variant"}`}>{row.sublabel}</span>}
        </div>
      </div>
      <span className="material-symbols-outlined text-outline">chevron_right</span>
    </button>
  );
}
