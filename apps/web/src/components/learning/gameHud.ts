import type { HudData } from "../../stores/chatStore";

/**
 * Map a game engine's HUD payload onto the shape LearningHUD renders.
 *
 * Game engines name their variants after the game ("assertive", "deductive",
 * "detective"), while the shared HUD shows four fixed tabs. This is the one
 * place that translation happens, so Chat and every game render from the same
 * component.
 */
export function normalizeGameHud(hud: Record<string, unknown> | null | undefined): HudData {
  if (!hud) return null;
  const variants = (hud.variants as Record<string, string> | undefined) || {};
  const main = String(hud.main_expression || "");
  return {
    ...(hud as HudData),
    main_expression: main,
    meaning_native: String(hud.meaning_native || ""),
    variants: {
      natural_spoken: variants.natural || variants.natural_spoken || main,
      basic: variants.polite || variants.basic || "",
      written: variants.deductive || variants.written || "",
      advanced: variants.assertive || variants.advanced || "",
    },
    detected_intent: (hud.detected_intent as string) || "expression_learning",
  };
}

/** True while the backend is still generating this turn's analysis. */
export function isHudPending(hud: Record<string, unknown> | null | undefined): boolean {
  return !!hud && hud.analysis_status === "pending";
}

/** True when the analysis could not run — render nothing rather than blanks. */
export function isHudFailed(hud: Record<string, unknown> | null | undefined): boolean {
  return !!hud && hud.analysis_status === "failed";
}
