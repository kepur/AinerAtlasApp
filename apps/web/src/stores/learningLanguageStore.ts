import { create } from "zustand";
import { apiRequest, type Profile } from "../api";
import { useAuthStore } from "./authStore";

type LearningLanguageState = {
  /** Current target language code, e.g. "sr", "en", "es" */
  language: string;
  /** True while a language switch is in flight */
  switching: boolean;
  error: string | null;
  /** Switch the global learning language (updates backend + account profile). */
  switchLanguage: (code: string) => Promise<void>;
  /** Initialise from an already-loaded profile (call after login / loadProfile) */
  initFromProfile: (profile: Profile) => void;
};

export const useLearningLanguageStore = create<LearningLanguageState>((set, get) => ({
  // Server profile is authoritative; do not reuse another account's localStorage.
  language: "en",
  switching: false,
  error: null,

  initFromProfile: (profile) => {
    const lang = profile.primary_target_language || "en";
    set({ language: lang });
  },

  switchLanguage: async (code) => {
    if (code === get().language || get().switching) return;
    set({ switching: true, error: null });
    try {
      // 1. Tell backend to switch (this also updates primary_target_language)
      const result = await apiRequest<{ target_languages: string[] }>("/api/survival-sprint/select-language", {
        method: "POST",
        body: JSON.stringify({ language: code }),
      });
      const profile = useAuthStore.getState().profile;
      if (profile) useAuthStore.setState({ profile: { ...profile, primary_target_language: code, target_languages: result.target_languages } });
      set({ language: code, switching: false });
    } catch (e) {
      set({ switching: false, error: e instanceof Error ? e.message : "切换失败，请重试" });
      throw e;
    }
  },
}));
