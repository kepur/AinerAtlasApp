import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PersonalProfileSection from "../components/PersonalProfileSection";
import { apiRequest, type Profile } from "../api";
import { isLocaleCode, useI18n } from "../i18n";
import {
  buildLanguageOptions,
  CEFR_LEVELS,
  DEFAULT_LANGUAGE_CODES,
  levelFromMasteryIndex,
  masteryIndexFromLevel,
} from "../lib/languages";
import { applyTheme, type ThemeMode } from "../lib/theme";
import { enabledLocaleCodes, useAppConfigStore } from "../stores/appConfigStore";
import { useAuthStore } from "../stores/authStore";
import {
  useChatPrefsStore,
  type AIPersona,
  type FontSize,
} from "../stores/chatPrefsStore";

const AI_PERSONAS: { key: AIPersona; icon: string; label: string; desc: string }[] = [
  { key: "encouraging", icon: "favorite", label: "Gentle", desc: "Warm & supportive" },
  { key: "lively_friend", icon: "mood", label: "Lively", desc: "Fun & casual" },
  { key: "strict_teacher", icon: "school", label: "Strict", desc: "Direct correction" },
  { key: "socratic", icon: "psychology", label: "Socratic", desc: "Guiding questions" },
  { key: "business_coach", icon: "work", label: "Business", desc: "Professional tone" },
  { key: "dating_coach", icon: "volunteer_activism", label: "Dating", desc: "Respectful advice" },
  { key: "debate_opponent", icon: "gavel", label: "Debate", desc: "Challenges you" },
];

function coachToPersona(coach?: string): AIPersona {
  const map: Record<string, AIPersona> = {
    socratic: "socratic",
    structured: "strict_teacher",
    immersive: "lively_friend",
    encouraging: "encouraging",
    strict: "strict_teacher",
    lively: "lively_friend",
    business: "business_coach",
    debate: "debate_opponent",
  };
  return map[coach ?? ""] ?? "lively_friend";
}

export default function Settings() {
  const { user, profile, logout, loadUser } = useAuthStore();
  const config = useAppConfigStore((s) => s.config);
  const loadConfig = useAppConfigStore((s) => s.loadConfig);
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const prefs = useChatPrefsStore();
  const updatePrefs = useChatPrefsStore((s) => s.updatePrefs);

  const [uiLanguage, setUiLanguage] = useState(profile?.ui_language ?? "zh");
  const [explanationLanguage, setExplanationLanguage] = useState(
    profile?.explanation_language ?? profile?.ui_language ?? "zh"
  );
  const [nativeLanguage, setNativeLanguage] = useState(profile?.native_language ?? "zh");
  const [targetLanguage, setTargetLanguage] = useState(profile?.primary_target_language ?? "en");
  const [uiTheme, setUiTheme] = useState<ThemeMode>((profile?.ui_theme as ThemeMode) || "light");
  const [currentLevelIdx, setCurrentLevelIdx] = useState(masteryIndexFromLevel(profile?.current_level));
  const [username, setUsername] = useState(user?.username ?? "");
  const [birthday, setBirthday] = useState(profile?.birthday?.slice(0, 10) ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [genderIdentity, setGenderIdentity] = useState(profile?.gender_identity ?? "prefer_not_to_say");
  const [genderCustom, setGenderCustom] = useState(profile?.gender_custom ?? "");
  const [sexualOrientation, setSexualOrientation] = useState(profile?.sexual_orientation ?? "prefer_not_to_say");
  const [orientationCustom, setOrientationCustom] = useState(profile?.orientation_custom ?? "");
  const [lgbtqVisible, setLgbtqVisible] = useState(profile?.lgbtq_visible ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) void loadConfig();
  }, [config, loadConfig]);

  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user?.username]);

  useEffect(() => {
    if (!profile) return;
    setUiLanguage(profile.ui_language);
    setExplanationLanguage(profile.explanation_language || profile.ui_language);
    setNativeLanguage(profile.native_language);
    setTargetLanguage(profile.primary_target_language);
    setUiTheme((profile.ui_theme as ThemeMode) || "light");
    setCurrentLevelIdx(masteryIndexFromLevel(profile.current_level));
    setBirthday(profile.birthday?.slice(0, 10) ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setGenderIdentity(profile.gender_identity || "prefer_not_to_say");
    setGenderCustom(profile.gender_custom ?? "");
    setSexualOrientation(profile.sexual_orientation || "prefer_not_to_say");
    setOrientationCustom(profile.orientation_custom ?? "");
    setLgbtqVisible(!!profile.lgbtq_visible);
    updatePrefs({ aiPersona: coachToPersona(profile.coach_style) });
  }, [profile, updatePrefs]);

  const languageCodes = useMemo(() => {
    if (config?.enabled_locales?.length) return config.enabled_locales;
    return [...DEFAULT_LANGUAGE_CODES];
  }, [config]);

  const languageOptions = useMemo(
    () => buildLanguageOptions(languageCodes),
    [languageCodes]
  );

  function applyGlobalLocale(code: string) {
    if (!isLocaleCode(code) || !languageCodes.includes(code)) return;
    setLocale(code);
  }

  function handleNativeLanguageChange(code: string) {
    setNativeLanguage(code);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    const currentLevel = levelFromMasteryIndex(currentLevelIdx);
    try {
      const updated = await apiRequest<Profile>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...profile,
          username: username.trim() || undefined,
          ui_language: uiLanguage,
          explanation_language: explanationLanguage,
          native_language: nativeLanguage,
          primary_target_language: targetLanguage,
          target_languages: [targetLanguage],
          current_level: currentLevel,
          ui_theme: uiTheme,
          coach_style: prefs.aiPersona,
          birthday: birthday || null,
          avatar_url: avatarUrl,
          gender_identity: genderIdentity,
          gender_custom: genderIdentity === "self_describe" ? genderCustom : "",
          sexual_orientation: sexualOrientation,
          orientation_custom: sexualOrientation === "self_describe" ? orientationCustom : "",
          lgbtq_visible: lgbtqVisible,
        }),
      });
      useAuthStore.setState({ profile: updated });
      if (username.trim()) await loadUser();
      if (isLocaleCode(uiLanguage) && languageCodes.includes(uiLanguage)) {
        setLocale(uiLanguage);
      }
      applyTheme(uiTheme);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.saveFailed"));
    }
    setSaving(false);
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const selectClass =
    "form-select w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:ring-2 focus:ring-primary/20";

  return (
    <div className="premium min-h-full bg-surface text-on-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 flex items-center justify-between px-margin-mobile h-16">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="material-symbols-outlined text-on-surface-variant active:scale-95 transition-transform"
        >
          close
        </button>
        <h1 className="font-headline-md text-[20px] font-bold text-primary tracking-tight">
          {t("settings.title")}
        </h1>
        <div className="w-6" />
      </header>

      <main className="pt-6 pb-32 px-margin-mobile space-y-8">
        {error && (
          <p className="text-sm text-error bg-error-container/20 border border-error-container/40 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* Account */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-[18px]">{t("settings.accountSection")}</h3>
          <div className="glass-card premium-shadow p-4 rounded-2xl space-y-3">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">{t("settings.email")}</label>
              <p className="text-sm font-medium">{user?.email ?? "—"}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/forgot-password?email=${encodeURIComponent(user?.email ?? "")}`)}
              className="text-sm text-primary font-medium"
            >
              {t("settings.changePassword")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/privacy")}
              className="w-full flex items-center justify-between py-2 text-sm font-medium"
            >
              {t("settings.privacy")}
              <span className="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2 text-sm font-medium text-error text-left"
            >
              {t("settings.logout")}
            </button>
          </div>
        </section>

        <PersonalProfileSection
          username={username}
          onUsernameChange={setUsername}
          birthday={birthday}
          onBirthdayChange={setBirthday}
          avatarUrl={avatarUrl}
          onAvatarUrlChange={setAvatarUrl}
          genderIdentity={genderIdentity}
          onGenderIdentityChange={setGenderIdentity}
          genderCustom={genderCustom}
          onGenderCustomChange={setGenderCustom}
          sexualOrientation={sexualOrientation}
          onSexualOrientationChange={setSexualOrientation}
          orientationCustom={orientationCustom}
          onOrientationCustomChange={setOrientationCustom}
          lgbtqVisible={lgbtqVisible}
          onLgbtqVisibleChange={setLgbtqVisible}
          onProfilePatched={(url) => {
            setAvatarUrl(url);
            if (profile) useAuthStore.setState({ profile: { ...profile, avatar_url: url } });
          }}
        />

        {/* Display & language */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-[18px]">{t("settings.displaySection")}</h3>
          <div className="glass-card premium-shadow p-4 rounded-2xl space-y-4">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">{t("settings.uiLanguage")}</label>
              <select
                value={uiLanguage}
                disabled={config?.allow_user_locale_override === false}
                onChange={(e) => {
                  const code = e.target.value;
                  setUiLanguage(code);
                  applyGlobalLocale(code);
                }}
                className={selectClass}
              >
                {languageOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">
                {t("settings.explanationLanguage")}
              </label>
              <select
                value={explanationLanguage}
                disabled={config?.allow_user_locale_override === false}
                onChange={(e) => setExplanationLanguage(e.target.value)}
                className={selectClass}
              >
                {languageOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-2">{t("settings.theme")}</label>
              <p className="text-xs text-on-surface-variant mb-2 opacity-80">{t("settings.themeHint")}</p>
              <div className="flex gap-2">
                {(["light", "dark"] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setUiTheme(mode);
                      applyTheme(mode);
                    }}
                    className={
                      uiTheme === mode
                        ? "flex-1 h-11 rounded-xl border-2 border-primary bg-[#fefcff] flex items-center justify-center gap-2 font-medium text-on-surface"
                        : "flex-1 h-11 rounded-xl border border-outline-variant/30 bg-surface-container-low flex items-center justify-center gap-2 font-medium text-on-surface-variant"
                    }
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {mode === "light" ? "light_mode" : "dark_mode"}
                    </span>
                    {mode === "light" ? t("settings.themeLight") : t("settings.themeDark")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Learning profile */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-[18px]">{t("settings.learningSection")}</h3>
          <div className="glass-card premium-shadow p-4 rounded-2xl space-y-4">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">
                {t("settings.nativeLanguage")}
              </label>
              <select
                value={nativeLanguage}
                onChange={(e) => handleNativeLanguageChange(e.target.value)}
                className={selectClass}
              >
                {languageOptions.map((item) => (
                  <option key={`native-${item.code}`} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">
                {t("settings.targetLanguage")}
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className={selectClass}
              >
                {languageOptions.map((item) => (
                  <option key={`target-${item.code}`} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="font-label-sm text-on-surface-variant">{t("settings.currentLevel")}</label>
                <span className="text-primary font-bold text-sm">
                  {CEFR_LEVELS[currentLevelIdx - 1] ?? "B1"}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={CEFR_LEVELS.length}
                value={currentLevelIdx}
                onChange={(e) => setCurrentLevelIdx(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-surface-container accent-[#630ed4]"
              />
            </div>
          </div>
        </section>

        {/* AI Persona */}
        <section className="space-y-4">
          <h3 className="font-headline-md text-[18px]">{t("settings.aiPersona")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {AI_PERSONAS.map((p) => {
              const active = prefs.aiPersona === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => updatePrefs({ aiPersona: p.key })}
                  className={
                    active
                      ? "glass-card premium-shadow p-4 rounded-2xl text-left border-2 border-primary bg-[#fefcff] transition-all"
                      : "glass-card premium-shadow p-4 rounded-2xl text-left border border-transparent transition-all"
                  }
                >
                  <span
                    className={`material-symbols-outlined mb-2 block ${active ? "text-primary" : "text-on-surface-variant"}`}
                  >
                    {p.icon}
                  </span>
                  <p className="font-bold text-sm">{p.label}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </section>



        <p className="text-center text-xs text-on-surface-variant opacity-60">
          {languageCodes.length} {t("settings.languageSettings").toLowerCase()} · {locale.toUpperCase()}
        </p>
      </main>

      <div className="premium fixed bottom-0 left-1/2 -translate-x-1/2 w-[min(100%,430px)] p-margin-mobile bg-surface/80 backdrop-blur-xl border-t border-outline-variant/20 z-50">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !profile}
          className="w-full h-14 bg-primary text-on-primary rounded-xl font-headline-md text-[16px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-60"
        >
          <span className="material-symbols-outlined">{saved ? "check" : "save"}</span>
          {saving ? t("settings.saving") : saved ? t("settings.saved") : t("settings.save")}
        </button>
      </div>
    </div>
  );
}
