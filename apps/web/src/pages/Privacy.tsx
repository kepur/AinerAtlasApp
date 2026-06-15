import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

type PrivacySettings = {
  match_profile_visible: boolean;
  data_retention_days: number;
  allow_analytics: boolean;
  public_scope: string;
  match_enabled: boolean;
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex w-12 h-7 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-50 " +
        (checked ? "bg-primary" : "bg-surface-container-high")
      }
    >
      <span className={
        "inline-block w-5 h-5 rounded-full bg-white shadow-sm transition-transform " +
        (checked ? "translate-x-6" : "translate-x-1")
      } />
    </button>
  );
}

export default function Privacy() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<PrivacySettings>("/api/privacy/settings")
      .then(setSettings)
      .catch(() => {});
  }, []);

  async function update(field: keyof PrivacySettings, value: boolean | number | string) {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await apiRequest<PrivacySettings>("/api/privacy/settings", {
        method: "PUT",
        body: JSON.stringify({ [field]: value })
      });
      setSettings(updated);
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function deleteData() {
    if (!confirm("确定要删除所有个人数据吗？此操作不可撤销。")) return;
    await apiRequest("/api/privacy/delete-data", { method: "POST" });
    alert("个人数据已清除");
  }

  async function disableMatching() {
    await apiRequest("/api/privacy/disable-matching", { method: "POST" });
    setSettings((s) => s ? { ...s, match_enabled: false, match_profile_visible: false } : s);
  }

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 right-0 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/20 px-margin-mobile h-touch-target-min flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <div>
          <h1 className="font-bold text-[16px] text-on-surface leading-tight">数据与隐私</h1>
          <p className="text-[11px] text-on-surface-variant">控制你的数据、匹配画像和公开范围</p>
        </div>
      </header>

      <main className="px-margin-mobile pt-5 pb-24 space-y-5">
        {!settings ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Settings card */}
            <section className="glass-card premium-shadow rounded-2xl overflow-hidden divide-y divide-white/30">
              {/* Match profile visible */}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-bold text-[14px] text-on-surface">匹配画像可见</p>
                  <p className="text-[12px] text-on-surface-variant mt-0.5">允许他人在 Connect 功能中看到你</p>
                </div>
                <Toggle checked={settings.match_profile_visible} onChange={(v) => update("match_profile_visible", v)} disabled={saving} />
              </div>

              {/* Allow analytics */}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-bold text-[14px] text-on-surface">允许数据分析</p>
                  <p className="text-[12px] text-on-surface-variant mt-0.5">帮助改善 AI 学习效果</p>
                </div>
                <Toggle checked={settings.allow_analytics} onChange={(v) => update("allow_analytics", v)} disabled={saving} />
              </div>

              {/* Public scope */}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-bold text-[14px] text-on-surface">公开范围</p>
                  <p className="text-[12px] text-on-surface-variant mt-0.5">谁能看到你的公开内容</p>
                </div>
                <select
                  value={settings.public_scope}
                  onChange={(e) => update("public_scope", e.target.value)}
                  disabled={saving}
                  className="bg-surface-container-low border border-outline-variant/30 text-[13px] text-on-surface rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="private">仅自己</option>
                  <option value="friends">好友</option>
                  <option value="public">公开</option>
                </select>
              </div>

              {/* Data retention */}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-bold text-[14px] text-on-surface">数据保留天数</p>
                  <p className="text-[12px] text-on-surface-variant mt-0.5">超期数据将自动清除</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.data_retention_days}
                    onChange={(e) => update("data_retention_days", Number(e.target.value))}
                    disabled={saving}
                    min={30}
                    max={3650}
                    className="w-20 bg-surface-container-low border border-outline-variant/30 text-[13px] text-on-surface text-center rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="text-[12px] text-on-surface-variant">天</span>
                </div>
              </div>
            </section>

            {/* Privacy info */}
            <section className="glass-card premium-shadow rounded-2xl p-4 flex gap-3">
              <span className="material-symbols-outlined text-primary flex-shrink-0 fill" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                你的私人思想资产默认不会公开。匹配和公开功能需要你主动开启。我们不会将你的数据出售给第三方。
              </p>
            </section>

            {/* Danger zone */}
            <section className="space-y-3">
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider px-1">危险操作</p>
              <div className="glass-card premium-shadow rounded-2xl overflow-hidden divide-y divide-white/30">
                <button
                  onClick={disableMatching}
                  className="w-full flex items-center justify-between px-4 py-4 text-left active:bg-surface-container/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline">person_off</span>
                    <span className="font-bold text-[14px] text-on-surface">关闭匹配画像</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </button>
                <button
                  onClick={deleteData}
                  className="w-full flex items-center justify-between px-4 py-4 text-left active:bg-error/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-error">delete_forever</span>
                    <div>
                      <p className="font-bold text-[14px] text-error">删除所有个人数据</p>
                      <p className="text-[12px] text-on-surface-variant">此操作不可撤销</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-error">chevron_right</span>
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
