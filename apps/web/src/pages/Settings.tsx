import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, type Profile } from "../api";
import { useI18n } from "../i18n";
import { applyTheme, type ThemeMode } from "../lib/theme";
import { useAppConfigStore } from "../stores/appConfigStore";
import { useAuthStore } from "../stores/authStore";
import { useChatPrefsStore, type VoiceStyle, type AIPersona } from "../stores/chatPrefsStore";

const AI_PERSONAS: { key: AIPersona; icon: string; label: string; desc: string }[] = [
  { key: "encouraging", icon: "favorite", label: "Gentle", desc: "Warm & supportive" },
  { key: "lively_friend", icon: "mood", label: "Lively", desc: "Fun & casual" },
  { key: "strict_teacher", icon: "school", label: "Strict", desc: "Direct correction" },
  { key: "socratic", icon: "psychology", label: "Socratic", desc: "Guiding questions" },
  { key: "business_coach", icon: "work", label: "Business", desc: "Professional tone" },
  { key: "dating_coach", icon: "volunteer_activism", label: "Dating", desc: "Respectful advice" },
  { key: "debate_opponent", icon: "gavel", label: "Debate", desc: "Challenges you" },
];

const VOICES: { key: VoiceStyle; label: string }[] = [
  { key: "auto", label: "Auto Recommend" },
  { key: "sweet_female", label: "Sweet Female" },
  { key: "gentle_male", label: "Gentle Male" },
  { key: "pro_female", label: "Pro Female" },
  { key: "pro_male", label: "Pro Male" },
  { key: "lively_female", label: "Lively Female" },
  { key: "calm_male", label: "Calm Male" },
];

const TONES = [
  { key: "academic", icon: "school", label: "Academic", desc: "Precise & structured" },
  { key: "natural", icon: "forum", label: "Natural/Street", desc: "Slang & daily flow" },
  { key: "business", icon: "work", label: "Business", desc: "Polite & executive" },
  { key: "poetic", icon: "ink_pen", label: "Poetic", desc: "Metaphorical & deep" }
];

const MASTERY = ["Novice", "Beginner (B1)", "Intermediate (B2)", "Advanced (C1)", "Expert (C2)"];

function levelToSlider(level?: string): number {
  const map: Record<string, number> = { A1: 1, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };
  return map[(level ?? "").toUpperCase()] ?? 2;
}

export default function Settings() {
  const { profile } = useAuthStore();
  const config = useAppConfigStore((s) => s.config);
  const loadConfig = useAppConfigStore((s) => s.loadConfig);
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const prefs = useChatPrefsStore();
  const updatePrefs = useChatPrefsStore(s => s.updatePrefs);

  const [uiLanguage, setUiLanguage] = useState(profile?.ui_language ?? "zh");
  const [explanationLanguage, setExplanationLanguage] = useState(profile?.explanation_language ?? profile?.ui_language ?? "zh");
  const [uiTheme, setUiTheme] = useState<ThemeMode>((profile?.ui_theme as ThemeMode) || "light");
  const [tone, setTone] = useState("academic"); // TODO(backend): no profile field yet
  const [currentMastery, setCurrentMastery] = useState(levelToSlider(profile?.current_level));
  const [targetMastery, setTargetMastery] = useState(4); // TODO(backend): no target field yet
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!config) loadConfig();
  }, [config, loadConfig]);

  useEffect(() => {
    if (!profile) return;
    setUiLanguage(profile.ui_language);
    setExplanationLanguage(profile.explanation_language || profile.ui_language);
    setUiTheme((profile.ui_theme as ThemeMode) || "light");
    setCurrentMastery(levelToSlider(profile.current_level));
  }, [profile]);

  const localeOptions = config?.locales ?? [{ code: "zh", name: "Chinese", native_name: "简体中文" }];

  async function handleUpdate() {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await apiRequest<Profile>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ ...profile, ui_language: uiLanguage, explanation_language: explanationLanguage, ui_theme: uiTheme })
      });
      useAuthStore.setState({ profile: updated });
      setLocale(uiLanguage as typeof locale);
      applyTheme(uiTheme);
      setSaved(true);
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 flex items-center justify-between px-margin-mobile h-16">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-on-surface-variant active:scale-95 transition-transform">
          close
        </button>
        <h1 className="font-headline-md text-[20px] font-bold text-primary tracking-tight">Intelligence Profile</h1>
        <button onClick={() => navigate("/voice")} className="material-symbols-outlined text-primary active:scale-95 transition-transform">
          auto_awesome
        </button>
      </header>

      <main className="pt-6 pb-32 px-margin-mobile space-y-8">
        {/* AI Insight Banner */}
        <section className="glass-card premium-shadow p-6 rounded-2xl relative overflow-hidden">
          <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-1">AI Recommendation</p>
          <h2 className="font-headline-md text-[20px] mb-2">Refine your resonance</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            AinerWise adapts its linguistic logic based on your tone. Selecting "Natural" prioritizes colloquial flow over rigid grammar.
          </p>
        </section>

        {/* Display (functional prefs) */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-[20px]">Display</h3>
          <div className="glass-card premium-shadow p-4 rounded-2xl space-y-4">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Interface Language</label>
              <select
                value={uiLanguage}
                disabled={config?.allow_user_locale_override === false}
                onChange={(e) => setUiLanguage(e.target.value)}
                className="form-select w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:ring-2 focus:ring-primary/20"
              >
                {localeOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.native_name} ({item.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Explanation Language</label>
              <select
                value={explanationLanguage}
                disabled={config?.allow_user_locale_override === false}
                onChange={(e) => setExplanationLanguage(e.target.value)}
                className="form-select w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:ring-2 focus:ring-primary/20"
              >
                {localeOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.native_name} ({item.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-2">Theme</label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setUiTheme("light"); applyTheme("light"); }}
                  className={
                    uiTheme === "light"
                      ? "flex-1 h-11 rounded-xl border-2 border-primary bg-[#fefcff] flex items-center justify-center gap-2 font-medium text-on-surface"
                      : "flex-1 h-11 rounded-xl border border-outline-variant/30 bg-surface-container-low flex items-center justify-center gap-2 font-medium text-on-surface-variant"
                  }
                >
                  <span className="material-symbols-outlined text-[18px]">light_mode</span> Light
                </button>
                <button
                  onClick={() => { setUiTheme("dark"); applyTheme("dark"); }}
                  className={
                    uiTheme === "dark"
                      ? "flex-1 h-11 rounded-xl border-2 border-primary bg-[#fefcff] flex items-center justify-center gap-2 font-medium text-on-surface"
                      : "flex-1 h-11 rounded-xl border border-outline-variant/30 bg-surface-container-low flex items-center justify-center gap-2 font-medium text-on-surface-variant"
                  }
                >
                  <span className="material-symbols-outlined text-[18px]">dark_mode</span> Dark
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Language Pairs (real profile) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-[20px]">Language Pairs</h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant">2 Selected</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="glass-card premium-shadow p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">language</span>
                </div>
                <div>
                  <p className="font-label-sm text-on-surface-variant">Primary (Native)</p>
                  <p className="font-headline-md text-[18px]">{(profile?.native_language ?? "ZH").toUpperCase()}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline">expand_more</span>
            </div>
            <div className="glass-card premium-shadow p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">translate</span>
                </div>
                <div>
                  <p className="font-label-sm text-on-surface-variant">Target (Learning)</p>
                  <p className="font-headline-md text-[18px]">{(profile?.primary_target_language ?? "EN").toUpperCase()}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline">expand_more</span>
            </div>
          </div>
        </section>

        {/* AI Persona */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-[20px]">AI Persona</h3>
          <div className="grid grid-cols-2 gap-3">
            {AI_PERSONAS.map((p) => {
              const active = prefs.aiPersona === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => updatePrefs({ aiPersona: p.key })}
                  className={
                    active
                      ? "glass-card premium-shadow p-4 rounded-2xl text-left border-2 border-primary bg-[#fefcff] transition-all"
                      : "glass-card premium-shadow p-4 rounded-2xl text-left border border-transparent transition-all"
                  }
                >
                  <span className={`material-symbols-outlined mb-2 block ${active ? "text-primary" : "text-on-surface-variant"}`}>{p.icon}</span>
                  <p className="font-bold text-sm">{p.label}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Voice & Audio */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-[20px]">Voice & Audio</h3>
          <div className="glass-card premium-shadow p-4 rounded-2xl space-y-5">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-2">Auto Read Mode</label>
              <select
                value={prefs.autoReadMode}
                onChange={(e) => updatePrefs({ autoReadMode: e.target.value as any })}
                className="form-select w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:ring-2 focus:ring-primary/20"
              >
                <option value="off">Off (Manual tap to play)</option>
                <option value="target_only">Target Language Only</option>
                <option value="always">Always Auto-read AI Replies</option>
                <option value="voice_only">Voice Mode Only</option>
                <option value="wifi_only">Wi-Fi Only</option>
              </select>
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-2">Voice Style</label>
              <div className="flex flex-wrap gap-2">
                {VOICES.map(v => (
                  <button
                    key={v.key}
                    onClick={() => updatePrefs({ voiceStyle: v.key })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      prefs.voiceStyle === v.key
                        ? "bg-primary text-white"
                        : "bg-surface-container border border-outline-variant/30 text-on-surface-variant"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Chat Display Preferences */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-[20px]">Chat Display</h3>
          <div className="glass-card premium-shadow p-4 rounded-2xl space-y-5">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-2">Font Size</label>
              <div className="flex bg-surface-container-low rounded-xl p-1 border border-outline-variant/30">
                {["small", "standard", "large", "xlarge"].map(size => (
                  <button
                    key={size}
                    onClick={() => updatePrefs({ fontSize: size as any })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize ${
                      prefs.fontSize === size ? "bg-white text-primary shadow-sm" : "text-on-surface-variant"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { key: "showChineseExplanation", label: "Show Native Explanations" },
                { key: "showGrammarHUD", label: "Show Learning HUD" },
                { key: "showAgentTips", label: "Show Agent Tips" },
                { key: "showSpeakerIcon", label: "Show Speaker Icon" },
                { key: "showEmoji", label: "Show Emojis" },
              ].map(toggle => (
                <div key={toggle.key} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{toggle.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={prefs[toggle.key as keyof typeof prefs] as boolean}
                      onChange={(e) => updatePrefs({ [toggle.key]: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-outline-variant/20">
              <label className="font-label-sm text-on-surface-variant block mb-2">Bubble Density</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updatePrefs({ bubbleDensity: "compact" })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border ${
                    prefs.bubbleDensity === "compact"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-outline-variant/30 text-on-surface-variant"
                  }`}
                >
                  Compact
                </button>
                <button
                  onClick={() => updatePrefs({ bubbleDensity: "comfortable" })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border ${
                    prefs.bubbleDensity === "comfortable"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-outline-variant/30 text-on-surface-variant"
                  }`}
                >
                  Comfortable
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Proficiency Targets */}
        <section className="space-y-6">
          <h3 className="font-headline-md text-[20px]">Proficiency Targets</h3>
          <div className="space-y-8 glass-card premium-shadow p-6 rounded-2xl">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="font-label-sm text-on-surface-variant">Current Mastery</label>
                <span className="text-primary font-bold">{MASTERY[currentMastery - 1]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={currentMastery}
                onChange={(e) => setCurrentMastery(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-surface-container accent-[#630ed4]"
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="font-label-sm text-on-surface-variant">Target Mastery</label>
                <span className="text-secondary font-bold">{MASTERY[targetMastery - 1]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={targetMastery}
                onChange={(e) => setTargetMastery(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-surface-container accent-[#0058be]"
              />
            </div>
          </div>
        </section>

        <div className="py-4 flex flex-col items-center justify-center opacity-40">
          <p className="text-xs tracking-widest uppercase font-label-sm">AinerWise Semantic Engine v4.2</p>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="premium fixed bottom-0 left-1/2 -translate-x-1/2 w-[min(100%,430px)] p-margin-mobile bg-surface/80 backdrop-blur-xl border-t border-outline-variant/20 z-50">
        <button
          onClick={handleUpdate}
          disabled={saving}
          className="w-full h-14 bg-primary text-on-primary rounded-xl font-headline-md text-[16px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-60"
        >
          <span className="material-symbols-outlined">{saved ? "check" : "sync"}</span>
          {saving ? "Updating…" : saved ? "Updated" : "Update Intelligence"}
        </button>
      </div>
    </div>
  );
}
