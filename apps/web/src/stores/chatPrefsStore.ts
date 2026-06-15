import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutoReadMode = "off" | "target_only" | "always" | "voice_only";

export type VoiceStyle =
  | "auto"
  | "sweet_female"
  | "gentle_male"
  | "pro_female"
  | "pro_male"
  | "lively_female"
  | "calm_male";

export type FontSize = "small" | "standard" | "large" | "xlarge";

export type BubbleDensity = "compact" | "comfortable";

export type AIPersona =
  | "encouraging"
  | "lively_friend"
  | "strict_teacher"
  | "socratic"
  | "business_coach"
  | "dating_coach"
  | "debate_opponent";

export type ChatPrefs = {
  autoReadMode: AutoReadMode;
  voiceStyle: VoiceStyle;
  fontSize: FontSize;
  showChineseExplanation: boolean;
  showGrammarHUD: boolean;
  showAgentTips: boolean;
  showSpeakerIcon: boolean;
  showEmoji: boolean;
  bubbleDensity: BubbleDensity;
  aiPersona: AIPersona;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const STORAGE_KEY = "ainerspeak_chat_prefs";

const DEFAULT_PREFS: ChatPrefs = {
  autoReadMode: "always",
  voiceStyle: "auto",
  fontSize: "standard",
  showChineseExplanation: true,
  showGrammarHUD: true,
  showAgentTips: true,
  showSpeakerIcon: true,
  showEmoji: true,
  bubbleDensity: "comfortable",
  aiPersona: "lively_friend",
};

function loadFromStorage(): ChatPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ChatPrefs>;
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch {
    /* corrupted data — fall back to defaults */
  }
  return { ...DEFAULT_PREFS };
}

function saveToStorage(prefs: ChatPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage full or unavailable */
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type ChatPrefsState = ChatPrefs & {
  updatePrefs: (partial: Partial<ChatPrefs>) => void;
};

export const useChatPrefsStore = create<ChatPrefsState>((set) => ({
  ...loadFromStorage(),

  updatePrefs: (partial) => {
    set((state) => {
      const merged: ChatPrefs = {
        autoReadMode: partial.autoReadMode ?? state.autoReadMode,
        voiceStyle: partial.voiceStyle ?? state.voiceStyle,
        fontSize: partial.fontSize ?? state.fontSize,
        showChineseExplanation: partial.showChineseExplanation ?? state.showChineseExplanation,
        showGrammarHUD: partial.showGrammarHUD ?? state.showGrammarHUD,
        showAgentTips: partial.showAgentTips ?? state.showAgentTips,
        showSpeakerIcon: partial.showSpeakerIcon ?? state.showSpeakerIcon,
        showEmoji: partial.showEmoji ?? state.showEmoji,
        bubbleDensity: partial.bubbleDensity ?? state.bubbleDensity,
        aiPersona: partial.aiPersona ?? state.aiPersona,
      };
      saveToStorage(merged);
      return merged;
    });
  },
}));
