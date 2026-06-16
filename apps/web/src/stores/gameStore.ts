import { create } from "zustand";
import { apiRequest } from "../api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameTemplate {
  id: string;
  slug: string;
  game_type: string;
  title: string;
  subtitle: string;
  description: string;
  cover_url: string;
  difficulty: string;
  target_language: string;
  native_language: string;
  estimated_minutes: number;
  learning_focus: string[];
  tags: string[];
  config: Record<string, unknown>;
  play_count: number;
}

export interface GameTurn {
  id: string;
  turn_number: number;
  actor: string;
  action_type: string;
  user_input: string;
  ai_response: Record<string, unknown>;
  hud: Record<string, unknown>;
  feed_items: FeedItem[];
  phase_after: string;
  created_at: string;
}

export interface GameSession {
  id: string;
  game_type: string;
  template_id: string | null;
  title: string;
  target_language: string;
  native_language: string;
  difficulty: string;
  phase: string;
  turn_count: number;
  score: number;
  status: string;
  view: Record<string, unknown>;
  turns?: GameTurn[];
  created_at: string;
  updated_at: string;
}

export interface FeedItem {
  type: string;
  text?: string;
  text_en?: string;
  text_native?: string;
  speaker?: string;
  [key: string]: unknown;
}

export interface TurnResult {
  turn: GameTurn;
  session: GameSession;
}

export interface GameSummary {
  solved?: boolean;
  completed?: boolean;
  score: number;
  patterns: string[];
  vocabulary: string[];
  expressions: string[];
  summary: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface GameStore {
  templates: GameTemplate[];
  templatesLoading: boolean;
  sessions: GameSession[];
  sessionsLoading: boolean;
  currentSession: GameSession | null;
  feedItems: FeedItem[];
  currentHud: Record<string, unknown> | null;
  turnLoading: boolean;
  summary: GameSummary | null;

  loadTemplates: (gameType?: string) => Promise<void>;
  loadTemplate: (id: string) => Promise<GameTemplate>;
  loadSessions: (status?: string) => Promise<void>;
  createSession: (gameType: string, templateId?: string, config?: Record<string, unknown>) => Promise<GameSession>;
  loadSession: (sessionId: string) => Promise<void>;
  sendTurn: (sessionId: string, actionType: string, userInput?: string, extra?: Record<string, unknown>) => Promise<TurnResult>;
  loadSummary: (sessionId: string) => Promise<GameSummary>;
  clearCurrent: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  templates: [],
  templatesLoading: false,
  sessions: [],
  sessionsLoading: false,
  currentSession: null,
  feedItems: [],
  currentHud: null,
  turnLoading: false,
  summary: null,

  loadTemplates: async (gameType) => {
    set({ templatesLoading: true });
    try {
      const qs = gameType ? `?game_type=${gameType}` : "";
      const data = await apiRequest<GameTemplate[]>(`/api/games/templates${qs}`);
      set({ templates: data });
    } finally {
      set({ templatesLoading: false });
    }
  },

  loadTemplate: async (id) => {
    return apiRequest<GameTemplate>(`/api/games/templates/${id}`);
  },

  loadSessions: async (status) => {
    set({ sessionsLoading: true });
    try {
      const qs = status ? `?status=${status}` : "";
      const data = await apiRequest<GameSession[]>(`/api/games/sessions${qs}`);
      set({ sessions: data });
    } finally {
      set({ sessionsLoading: false });
    }
  },

  createSession: async (gameType, templateId, config) => {
    const data = await apiRequest<GameSession>("/api/games/sessions", {
      method: "POST",
      body: JSON.stringify({
        game_type: gameType,
        template_id: templateId || null,
        config: config || null,
      }),
    });
    set({ currentSession: data, feedItems: [], currentHud: null, summary: null });
    return data;
  },

  loadSession: async (sessionId) => {
    const data = await apiRequest<GameSession>(`/api/games/sessions/${sessionId}`);
    const feedItems: FeedItem[] = [];
    if (data.turns) {
      for (const turn of data.turns) {
        feedItems.push(...(turn.feed_items || []));
      }
    }
    set({ currentSession: data, feedItems, currentHud: null });
  },

  sendTurn: async (sessionId, actionType, userInput = "", extra) => {
    set({ turnLoading: true });
    try {
      const result = await apiRequest<TurnResult>(`/api/games/sessions/${sessionId}/turns`, {
        method: "POST",
        body: JSON.stringify({
          action_type: actionType,
          user_input: userInput,
          extra: extra || null,
        }),
      });

      const newFeedItems = result.turn.feed_items || [];
      const hud = result.turn.hud && Object.keys(result.turn.hud).length > 0 ? result.turn.hud : null;

      set((s) => ({
        feedItems: [...s.feedItems, ...newFeedItems],
        currentHud: hud || s.currentHud,
        currentSession: result.session,
      }));

      return result;
    } finally {
      set({ turnLoading: false });
    }
  },

  loadSummary: async (sessionId) => {
    const data = await apiRequest<GameSummary>(`/api/games/sessions/${sessionId}/summary`);
    set({ summary: data });
    return data;
  },

  clearCurrent: () => {
    set({ currentSession: null, feedItems: [], currentHud: null, summary: null });
  },
}));
