import { create } from "zustand";
import { apiRequest, API_BASE_URL, getToken, type Conversation, type ConversationReply, type Message } from "../api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type HudData = Message["analysis"] | null;

export type TurnStatus = "pending" | "replying" | "analyzing" | "ready" | "failed";

export type DialogueTurn = {
  turn_id: string;
  user_message_id: string;
  assistant_message_id: string;
  user_text: string;
  ai_reply: string;
  hud: HudData;
  status: TurnStatus;
  label: string;
  pinned: boolean;
  focusCount: number;
};

type ChatState = {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  loading: boolean;
  sending: boolean;
  error: string | null;

  // Turn system
  turns: DialogueTurn[];
  activeTurnId: string | null;
  pinnedTurnId: string | null;

  // Legacy compat
  streamPhase: "replying" | "analyzing" | null;
  hud: HudData;

  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  createConversation: (opts?: {
    title?: string;
    topic?: string;
    mode?: string;
  }) => Promise<Conversation>;
  sendMessage: (conversationId: string, content: string) => Promise<ConversationReply>;
  streamMessage: (conversationId: string, content: string, persona?: string) => Promise<void>;
  clearCurrent: () => void;

  // Turn actions
  setActiveTurn: (turnId: string) => void;
  pinTurn: (turnId: string) => void;
  unpinTurn: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

function extractHud(msg: Message): HudData {
  const a = typeof msg.analysis === "string" ? safeParse(msg.analysis) : msg.analysis;
  return a && a.v2 ? a : null;
}

/** Derive a short Chinese label from a HUD or user text */
function deriveLabel(hud: HudData, userText: string, index: number): string {
  if (hud?.meaning_native) {
    // Take first 4 chars of meaning
    const m = hud.meaning_native;
    return m.length > 6 ? m.slice(0, 6) + "…" : m;
  }
  // Fallback: first few chars of user text
  const t = userText.trim();
  if (t.length > 6) return t.slice(0, 6) + "…";
  if (t) return t;
  return `T${index + 1}`;
}

/** Count focus points (patterns + vocabulary) in a HUD */
function countFocusPoints(hud: HudData): number {
  if (!hud) return 0;
  const patterns = Array.isArray(hud.patterns_v2) ? hud.patterns_v2.length : 0;
  const vocab = Array.isArray(hud.vocabulary) ? hud.vocabulary.length : 0;
  const why = Array.isArray(hud.why_this_expression) ? hud.why_this_expression.length : 0;
  return patterns + vocab + why;
}

/** Build turns from a conversation's messages */
function deriveTurns(conv: Conversation | null): DialogueTurn[] {
  if (!conv) return [];
  const turns: DialogueTurn[] = [];
  const msgs = conv.messages;

  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];
    if (msg.role !== "user") continue;

    // Find the next assistant message
    const assistant = msgs[i + 1];
    if (!assistant || assistant.role !== "assistant") continue;

    const hud = extractHud(assistant);
    const turnIndex = turns.length;
    turns.push({
      turn_id: `turn_${turnIndex}`,
      user_message_id: msg.id,
      assistant_message_id: assistant.id,
      user_text: msg.content,
      ai_reply: assistant.content,
      hud,
      status: hud && hud.main_expression ? "ready" : "pending",
      label: deriveLabel(hud, msg.content, turnIndex),
      pinned: false,
      focusCount: countFocusPoints(hud),
    });
  }

  return turns;
}

/** Get the active turn's HUD for legacy compat */
function activeHud(turns: DialogueTurn[], activeTurnId: string | null): HudData {
  if (!activeTurnId || turns.length === 0) return null;
  const turn = turns.find(t => t.turn_id === activeTurnId);
  return turn?.hud ?? null;
}

// In-flight stream controller — lets a new message abort a previous turn's
// still-running analysis (HUD) phase so the user can keep chatting immediately.
let currentStreamAbort: AbortController | null = null;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  loading: false,
  sending: false,
  error: null,

  turns: [],
  activeTurnId: null,
  pinnedTurnId: null,

  streamPhase: null,
  hud: null,

  // -- Turn actions --
  setActiveTurn: (turnId) => {
    const { turns, pinnedTurnId } = get();
    // Don't switch if a different turn is pinned
    if (pinnedTurnId && pinnedTurnId !== turnId) {
      // Unpin first, then switch
    }
    const turn = turns.find(t => t.turn_id === turnId);
    if (turn) {
      set({
        activeTurnId: turnId,
        hud: turn.hud,
        streamPhase: turn.status === "analyzing" ? "analyzing" : null,
      });
    }
  },

  pinTurn: (turnId) => {
    set((s) => ({
      pinnedTurnId: turnId,
      activeTurnId: turnId,
      hud: s.turns.find(t => t.turn_id === turnId)?.hud ?? null,
      turns: s.turns.map(t => ({
        ...t,
        pinned: t.turn_id === turnId,
      })),
    }));
  },

  unpinTurn: () => {
    const { turns } = get();
    const latest = turns[turns.length - 1];
    set({
      pinnedTurnId: null,
      activeTurnId: latest?.turn_id ?? null,
      hud: latest?.hud ?? null,
      turns: turns.map(t => ({ ...t, pinned: false })),
    });
  },

  // -- Data loading --
  loadConversations: async () => {
    set({ loading: true, error: null });
    try {
      const conversations = await apiRequest<Conversation[]>("/api/conversations");
      set({ conversations, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "加载失败" });
    }
  },

  loadConversation: async (id) => {
    set({ loading: true, error: null });
    try {
      const conversation = await apiRequest<Conversation>(`/api/conversations/${id}`);
      const turns = deriveTurns(conversation);
      const latest = turns[turns.length - 1];
      set({
        currentConversation: conversation,
        turns,
        activeTurnId: latest?.turn_id ?? null,
        pinnedTurnId: null,
        hud: latest?.hud ?? null,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "加载失败" });
    }
  },

  createConversation: async (opts) => {
    set({ loading: true, error: null });
    try {
      const conversation = await apiRequest<Conversation>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({
          title: opts?.title ?? "新的思想对话",
          topic: opts?.topic ?? "free-talk",
          mode: opts?.mode ?? "socratic",
          native_language: "zh",
          target_language: "en"
        })
      });
      set((s) => ({
        conversations: [conversation, ...s.conversations],
        currentConversation: conversation,
        turns: [],
        activeTurnId: null,
        pinnedTurnId: null,
        hud: null,
        loading: false
      }));
      return conversation;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "创建失败" });
      throw e;
    }
  },

  sendMessage: async (conversationId, content) => {
    set({ sending: true, error: null });
    try {
      const reply = await apiRequest<ConversationReply>(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content, content_language: "auto" })
        }
      );
      const turns = deriveTurns(reply.conversation);
      const latest = turns[turns.length - 1];
      const { pinnedTurnId } = get();
      set({
        currentConversation: reply.conversation,
        turns,
        activeTurnId: pinnedTurnId ?? latest?.turn_id ?? null,
        hud: pinnedTurnId
          ? get().hud
          : latest?.hud ?? null,
        sending: false,
      });
      return reply;
    } catch (e) {
      set({ sending: false, error: e instanceof Error ? e.message : "发送失败" });
      throw e;
    }
  },

  streamMessage: async (conversationId, content, persona) => {
    // Abort any previous turn's in-flight (analysis) stream so this new message
    // can proceed without racing the old one's HUD/result updates.
    currentStreamAbort?.abort();
    const abortController = new AbortController();
    currentStreamAbort = abortController;
    set({ sending: true, streamPhase: null, error: null });

    const currentConv = get().currentConversation;
    const currentTurns = get().turns;
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    const tempUserId = `temp-user-${Date.now()}`;
    const newTurnId = `turn_${currentTurns.length}`;

    // Optimistic: add user bubble + create pending turn
    if (currentConv) {
      const userMsg: Message = {
        id: tempUserId,
        role: "user",
        content,
        content_language: "auto",
        translated_content: "",
        analysis: {},
        expression_versions: {},
        created_at: new Date().toISOString(),
      };

      const newTurn: DialogueTurn = {
        turn_id: newTurnId,
        user_message_id: tempUserId,
        assistant_message_id: tempAssistantId,
        user_text: content,
        ai_reply: "",
        hud: null,
        status: "pending",
        label: deriveLabel(null, content, currentTurns.length),
        pinned: false,
        focusCount: 0,
      };

      const { pinnedTurnId } = get();
      set({
        currentConversation: {
          ...currentConv,
          messages: [...currentConv.messages, userMsg],
        },
        turns: [...currentTurns, newTurn],
        activeTurnId: pinnedTurnId ?? newTurnId,
        hud: pinnedTurnId ? get().hud : null,
      });
    }

    // Append token to streaming assistant bubble
    const appendDelta = (text: string) => {
      set((state) => {
        const conv = state.currentConversation;
        if (!conv) return state;
        const msgs = [...conv.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.id === tempAssistantId) {
          msgs[msgs.length - 1] = { ...last, content: last.content + text };
        } else {
          msgs.push({
            id: tempAssistantId,
            role: "assistant",
            content: text,
            content_language: conv.native_language,
            translated_content: "",
            analysis: {},
            expression_versions: {},
            created_at: new Date().toISOString(),
          });
        }

        // Update the turn's ai_reply
        const turns = state.turns.map(t =>
          t.turn_id === newTurnId
            ? { ...t, ai_reply: t.ai_reply + text, status: "replying" as TurnStatus }
            : t
        );

        return { currentConversation: { ...conv, messages: msgs }, turns };
      });
    };

    try {
      const token = getToken();
      const body: Record<string, unknown> = { content, content_language: "auto" };
      if (persona) body.persona = persona;

      const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const parseEvent = (block: string): { event: string; data: string } | null => {
        const lines = block.split("\n");
        let event = "message";
        let data = "";
        for (const l of lines) {
          if (l.startsWith("event: ")) event = l.slice(7).trim();
          else if (l.startsWith("data: ")) data += l.slice(6);
        }
        return data ? { event, data } : (event ? { event, data: "" } : null);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          const ev = parseEvent(block);
          if (!ev) continue;

          if (ev.event === "reply_delta") {
            try {
              appendDelta(JSON.parse(ev.data));
              set({ streamPhase: "replying" });
              // Update turn status
              set((s) => ({
                turns: s.turns.map(t =>
                  t.turn_id === newTurnId ? { ...t, status: "replying" } : t
                ),
              }));
            } catch { /* ignore */ }
          } else if (ev.event === "reply_done") {
            // conversational reply fully streamed
          } else if (ev.event === "analyzing") {
            // Reply is fully streamed — release the composer so the user can keep
            // chatting while the learning HUD analysis finishes in the background.
            set({ streamPhase: "analyzing", sending: false });
            set((s) => ({
              turns: s.turns.map(t =>
                t.turn_id === newTurnId ? { ...t, status: "analyzing" } : t
              ),
            }));
            // If this turn is active (not pinned to another), show analyzing phase
            const { pinnedTurnId, activeTurnId } = get();
            if (!pinnedTurnId || activeTurnId === newTurnId) {
              set({ activeTurnId: newTurnId });
            }
          } else if (ev.event === "hud") {
            try {
              const hudData = JSON.parse(ev.data) as HudData;
              const { pinnedTurnId } = get();
              set((s) => ({
                turns: s.turns.map(t =>
                  t.turn_id === newTurnId
                    ? {
                        ...t,
                        hud: hudData,
                        status: "ready",
                        label: deriveLabel(hudData, t.user_text, parseInt(newTurnId.split("_")[1])),
                        focusCount: countFocusPoints(hudData),
                      }
                    : t
                ),
                hud: pinnedTurnId && pinnedTurnId !== newTurnId ? s.hud : hudData,
              }));
            } catch { /* ignore */ }
          } else if (ev.event === "result") {
            try {
              const reply = JSON.parse(ev.data) as ConversationReply;
              const finalTurns = deriveTurns(reply.conversation);
              const latestTurn = finalTurns[finalTurns.length - 1];
              const { pinnedTurnId } = get();

              // Preserve pin state
              const mergedTurns = finalTurns.map(t => {
                const prev = get().turns.find(pt => pt.turn_id === t.turn_id);
                return prev ? { ...t, pinned: prev.pinned } : t;
              });

              set({
                currentConversation: reply.conversation,
                turns: mergedTurns,
                activeTurnId: pinnedTurnId ?? latestTurn?.turn_id ?? null,
                hud: pinnedTurnId
                  ? activeHud(mergedTurns, pinnedTurnId)
                  : latestTurn?.hud ?? null,
                sending: false,
                streamPhase: null,
              });
              return;
            } catch (e) {
              console.error("Failed to parse result:", e);
            }
          } else if (ev.event === "error") {
            let errMsg = "Stream error";
            try { errMsg = JSON.parse(ev.data).detail || errMsg; } catch { /* ignore */ }
            // Mark turn as failed
            set((s) => ({
              turns: s.turns.map(t =>
                t.turn_id === newTurnId ? { ...t, status: "failed" } : t
              ),
            }));
            throw new Error(errMsg);
          }
        }
      }
      if (currentStreamAbort === abortController) currentStreamAbort = null;
      set({ sending: false, streamPhase: null });
    } catch (e) {
      // A newer message aborted this stream — leave its turn as-is, stay quiet.
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (abortController.signal.aborted) return;
      set({
        sending: false,
        streamPhase: null,
        error: e instanceof Error ? e.message : "流式发送失败",
      });
      // Mark turn as failed
      set((s) => ({
        turns: s.turns.map(t =>
          t.turn_id === newTurnId ? { ...t, status: "failed" } : t
        ),
      }));
      throw e;
    }
  },

  clearCurrent: () => set({
    currentConversation: null,
    turns: [],
    activeTurnId: null,
    pinnedTurnId: null,
    hud: null,
    streamPhase: null,
  }),
}));
