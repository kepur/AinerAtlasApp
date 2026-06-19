import type { HudData } from "../stores/chatStore";
import type { TurnStatus } from "../stores/chatStore";

export type VoiceDialogueTurn = {
  turn_id: string;
  userBubbleId: string;
  assistantBubbleId: string | null;
  user_text: string;
  ai_reply: string;
  hud: HudData;
  status: TurnStatus;
  label: string;
  pinned: boolean;
  focusCount: number;
};

export function countFocusPoints(hud: HudData): number {
  if (!hud) return 0;
  const patterns = Array.isArray(hud.patterns_v2) ? hud.patterns_v2.length : 0;
  const vocab = Array.isArray(hud.vocabulary) ? hud.vocabulary.length : 0;
  const why = Array.isArray(hud.why_this_expression) ? hud.why_this_expression.length : 0;
  return patterns + vocab + why;
}

export function deriveTurnLabel(hud: HudData, userText: string, index: number): string {
  if (hud?.meaning_native) {
    const m = hud.meaning_native;
    return m.length > 6 ? `${m.slice(0, 6)}…` : m;
  }
  const t = userText.trim();
  if (t.length > 6) return `${t.slice(0, 6)}…`;
  if (t) return t;
  return `T${index + 1}`;
}

export function mergeHudData(prev: HudData, incoming: HudData): HudData {
  if (!incoming) return prev;
  if (!prev) return incoming;
  return {
    ...prev,
    ...incoming,
    main_expression: incoming.main_expression || prev.main_expression,
    corrected_sentence: incoming.corrected_sentence || prev.corrected_sentence,
    meaning_native: incoming.meaning_native || prev.meaning_native,
    grammar_tips: incoming.grammar_tips?.length ? incoming.grammar_tips : prev.grammar_tips,
    vocabulary: incoming.vocabulary?.length ? incoming.vocabulary : prev.vocabulary,
    patterns_v2: incoming.patterns_v2?.length ? incoming.patterns_v2 : prev.patterns_v2,
    patterns: incoming.patterns?.length ? incoming.patterns : prev.patterns,
    why_this_expression: incoming.why_this_expression?.length ? incoming.why_this_expression : prev.why_this_expression,
    agents: incoming.agents?.length ? incoming.agents : prev.agents,
    variants: { ...(prev.variants || {}), ...(incoming.variants || {}) },
    expression_versions: { ...(prev.expression_versions || {}), ...(incoming.expression_versions || {}) },
  };
}
