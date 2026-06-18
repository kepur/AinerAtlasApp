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
  pushTurn: (label: string, hud: HudData) => void;
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
  },

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

/** Map game HUD variant keys to Chat LearningHUD tabs. */
export function normalizeGameHud(hud: Record<string, unknown> | null | undefined): HudData {
  if (!hud) return null;
  const variants = (hud.variants as Record<string, string> | undefined) || {};
  return {
    ...(hud as HudData),
    main_expression: String(hud.main_expression || ""),
    meaning_native: String(hud.meaning_native || ""),
    variants: {
      natural_spoken: variants.natural || variants.natural_spoken || String(hud.main_expression || ""),
      basic: variants.polite || variants.basic || "",
      written: variants.deductive || variants.written || "",
      advanced: variants.assertive || variants.advanced || "",
    },
    detected_intent: (hud.detected_intent as string) || "expression_learning",
  };
}
