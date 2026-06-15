import { create } from "zustand";
import {
  apiRequest,
  clearToken,
  getToken,
  setToken,
  type AuthToken,
  type AuthUser,
  type Profile
} from "../api";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  profile: Profile | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, verificationCode: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updatePreferences: (uiLanguage: string, uiTheme: string) => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken(),
  user: null,
  profile: null,
  isLoggedIn: !!getToken(),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await apiRequest<AuthToken>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(data.access_token);
      set({ token: data.access_token, user: data.user, isLoggedIn: true, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "登录失败" });
      throw e;
    }
  },

  register: async (email, username, password, verificationCode) => {
    set({ loading: true, error: null });
    try {
      const data = await apiRequest<AuthToken>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, username, verification_code: verificationCode })
      });
      setToken(data.access_token);
      set({ token: data.access_token, user: data.user, isLoggedIn: true, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "注册失败" });
      throw e;
    }
  },

  logout: () => {
    clearToken();
    set({ token: null, user: null, profile: null, isLoggedIn: false });
  },

  loadUser: async () => {
    if (!get().token) return;
    try {
      const user = await apiRequest<AuthUser>("/api/auth/me");
      set({ user, isLoggedIn: true });
    } catch {
      clearToken();
      set({ token: null, user: null, isLoggedIn: false });
    }
  },

  loadProfile: async () => {
    if (!get().token) return;
    try {
      const profile = await apiRequest<Profile>("/api/profile");
      set({ profile });
    } catch {
      set({ profile: null });
    }
  },

  updatePreferences: async (uiLanguage, uiTheme) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = await apiRequest<Profile>("/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        ...profile,
        ui_language: uiLanguage,
        explanation_language: uiLanguage,
        ui_theme: uiTheme
      })
    });
    set({ profile: updated });
  },

  clearError: () => set({ error: null })
}));
