import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";

type TabItem = {
  key: string;
  path: string;
  labelKey: string;
  icon: string;
};

const tabs: TabItem[] = [
  { key: "home", path: "/home", labelKey: "nav.home", icon: "home" },
  { key: "chat", path: "/chat", labelKey: "nav.chat", icon: "forum" },
  { key: "assets", path: "/assets", labelKey: "nav.assets", icon: "psychology" },
  { key: "connect", path: "/match", labelKey: "nav.connect", icon: "hub" },
  { key: "profile", path: "/profile", labelKey: "nav.profile", icon: "person" }
];

function isTabActive(tab: TabItem, pathname: string): boolean {
  if (tab.key === "connect") {
    return pathname.startsWith("/match") || pathname.startsWith("/circles") || pathname.startsWith("/topics");
  }
  if (tab.key === "chat") {
    return pathname === "/chat" || pathname.startsWith("/chat/") || pathname.startsWith("/trio-chat");
  }
  if (tab.key === "assets") {
    return pathname.startsWith("/assets") || pathname.startsWith("/thoughts");
  }
  if (tab.key === "home") {
    return pathname === "/home" || pathname === "/";
  }
  return pathname === tab.path || pathname.startsWith(`${tab.path}/`);
}

export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <nav className="premium absolute bottom-0 left-0 w-full z-[100] flex justify-around items-center px-4 h-16 bg-surface/90 backdrop-blur-xl rounded-t-xl shadow-[0_-8px_20px_rgba(124,58,237,0.12)] border-t border-surface-variant/40 [padding-bottom:env(safe-area-inset-bottom)]">
      {tabs.map((item) => {
        const active = isTabActive(item, pathname);
        return (
          <button
            type="button"
            key={item.key}
            aria-current={active ? "page" : undefined}
            onClick={() => navigate(item.path)}
            className={
              active
                ? "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-primary bg-primary-fixed/40 transition-all"
                : "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-on-surface-variant hover:bg-surface-variant/50 transition-all"
            }
          >
            <span className={active ? "material-symbols-outlined fill text-[24px]" : "material-symbols-outlined text-[24px]"}>
              {item.icon}
            </span>
            <span className="font-label-sm text-label-sm">{t(item.labelKey)}</span>
            {active && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />}
          </button>
        );
      })}
    </nav>
  );
}
