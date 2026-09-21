import { create } from "zustand";
import type { HudData } from "./chatStore";

export type GameLearningTurn = {
  turn_id: string;
  label: string;
  hud: HudData;
  pinned?: boolean;
};

type SocialLogicStore = {
  turns: GameLearningTurn[];
  activeTurnId: string | null;
  pinnedTurnId: string | null;
  /** Returns the new turn's id so a pending HUD can be filled in later. */
  pushTurn: (label: string, hud: HudData) => string;
  /** Replace a turn's HUD once the background analysis lands. */
  updateTurnHud: (turnId: string, hud: HudData) => void;
  setActiveTurn: (id: string) => void;
  pinTurn: (id: string) => void;
  unpinTurn: () => void;
  reset: () => void;
  activeHud: () => HudData;
};

export const useSocialLogicStore = create<SocialLogicStore>((set, get) => ({
  turns: [],
  activeTurnId: null,
  pinnedTurnId: null,

  pushTurn: (label, hud) => {
    const turn_id = `gt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({
      turns: [...s.turns, { turn_id, label, hud }],
      activeTurnId: s.pinnedTurnId ?? turn_id,
    }));
    return turn_id;
  },

  updateTurnHud: (turnId, hud) =>
    set((s) => ({
      turns: s.turns.map((t) => (t.turn_id === turnId ? { ...t, hud } : t)),
    })),

  setActiveTurn: (id) => set({ activeTurnId: id }),

  pinTurn: (id) =>
    set((s) => ({
      pinnedTurnId: id,
      activeTurnId: id,
      turns: s.turns.map((t) => ({ ...t, pinned: t.turn_id === id })),
    })),

  unpinTurn: () =>
    set((s) => ({
      pinnedTurnId: null,
      turns: s.turns.map((t) => ({ ...t, pinned: false })),
      activeTurnId: s.turns[s.turns.length - 1]?.turn_id ?? null,
    })),

  reset: () => set({ turns: [], activeTurnId: null, pinnedTurnId: null }),

  activeHud: () => {
    const { turns, activeTurnId } = get();
    const turn = turns.find((t) => t.turn_id === activeTurnId) ?? turns[turns.length - 1];
    return turn?.hud ?? null;
  },
}));

// Moved to components/learning/gameHud so Chat and games share one mapping.
export { normalizeGameHud } from "../components/learning/gameHud";
