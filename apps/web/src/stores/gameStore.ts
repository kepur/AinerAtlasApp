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
  sendTurnStream: (sessionId: string, actionType: string, userInput?: string, extra?: Record<string, unknown>) => Promise<TurnResult>;
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
    
    const feedItems: FeedItem[] = [];
    let initialHud: Record<string, unknown> | null = null;

    if (data.turns) {
      for (const turn of data.turns) {
        // Backend feed items already echo the user input, so we don't add it again.
        feedItems.push(...(turn.feed_items || []));
        if (turn.hud && Object.keys(turn.hud).length > 0) {
          initialHud = turn.hud;
        }
      }
    }

    set({ currentSession: data, feedItems, currentHud: initialHud, summary: null });
    return data;
  },

  loadSession: async (sessionId) => {
    try {
      const data = await apiRequest<GameSession>(`/api/games/sessions/${sessionId}`);
      const feedItems: FeedItem[] = [];
      let initialHud: Record<string, unknown> | null = null;

      if (data.turns) {
        for (const turn of data.turns) {
          // Backend feed items already echo the user input.
          feedItems.push(...(turn.feed_items || []));
          if (turn.hud && Object.keys(turn.hud).length > 0) {
            initialHud = turn.hud;
          }
        }
      }
      set({ currentSession: data, feedItems, currentHud: initialHud });
    } catch (e) {
      console.warn("Session not found or error loading:", sessionId, e);
      set({ currentSession: null, feedItems: [], currentHud: null });
    }
  },

  sendTurn: async (sessionId, actionType, userInput = "", extra) => {
    // Auto-detect streaming for roleplay games
    const state = get();
    if (state.currentSession?.game_type === "roleplay") {
      return state.sendTurnStream(sessionId, actionType, userInput, extra);
    }

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

      // Backend feed items already echo the user input — no manual prepend.
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

  sendTurnStream: async (sessionId: string, actionType: string, userInput = "", extra?: Record<string, unknown>) => {
    set({ turnLoading: true });
    const token = localStorage.getItem("ainerspeak_token") || "";
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
    // Remember the feed length before this turn so the final `complete` event can
    // replace all the streamed partials with the authoritative feed (no dupes).
    const baseLen = get().feedItems.length;

    try {
      const response = await fetch(`${baseUrl}/api/games/sessions/${sessionId}/turns/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action_type: actionType,
          user_input: userInput,
          extra: extra || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // Keep incomplete event in buffer

        for (const raw of events) {
          const lines = raw.split("\n");
          let eventType = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6).trim();
            }
          }

          if (!eventType || !dataStr) continue;

          if (eventType === "feed") {
            // Partial feed update — merge streaming narrator chunks into ONE
            // live bubble; append other item types (user bubble) once.
            const parsed = JSON.parse(dataStr);
            const items = parsed.feed_items || [];
            if (items.length > 0) {
              set((s) => {
                const fi = [...s.feedItems];
                for (const it of items) {
                  if (it.type === "narrator") {
                    const last = fi[fi.length - 1];
                    if (last && last.type === "narrator" && (last as any)._streaming) {
                      fi[fi.length - 1] = { ...last, text: (last.text || "") + (it.text || "") };
                    } else {
                      fi.push({ ...it, _streaming: true });
                    }
                  } else {
                    fi.push(it);
                  }
                }
                return { feedItems: fi };
              });
            }
          } else if (eventType === "complete") {
            // Final result — drop all streamed partials and use the clean feed.
            const result = JSON.parse(dataStr) as TurnResult;
            const newFeedItems = result.turn.feed_items || [];
            const hud = result.turn.hud && Object.keys(result.turn.hud).length > 0 ? result.turn.hud : null;

            set((s) => ({
              feedItems: [...s.feedItems.slice(0, baseLen), ...newFeedItems],
              currentHud: hud || s.currentHud,
              currentSession: result.session,
            }));

            return result;
          } else if (eventType === "error") {
            const err = JSON.parse(dataStr);
            throw new Error(err.detail || "Stream error");
          }
        }
      }

      throw new Error("Stream ended without complete event");
    } catch (e) {
      console.error("sendTurnStream error:", e);
      throw e;
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
