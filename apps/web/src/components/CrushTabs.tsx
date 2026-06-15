import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";

const tabs = [
  { path: "/patterns", labelKey: "crush.grammarTab" },
  { path: "/vocabulary", labelKey: "crush.vocabTab" }
] as const;

export default function CrushTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="crush-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          className={`crush-tab ${location.pathname.startsWith(tab.path) ? "active" : ""}`}
          onClick={() => navigate(tab.path)}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </div>
  );
}
