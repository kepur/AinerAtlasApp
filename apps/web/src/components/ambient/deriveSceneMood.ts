import type { SceneMood } from "./types";

type TurnLike = { status?: string };

/** Voice call: in-call mood from turns + streaming assistant bubbles. */
export function deriveVoiceSceneMood(opts: {
  inCall: boolean;
  turns: TurnLike[];
  assistantStreaming?: boolean;
}): SceneMood {
  if (!opts.inCall) return "idle";
  if (opts.turns.some((t) => t.status === "analyzing")) return "thinking";
  if (opts.assistantStreaming) return "speaking";
  return "listening";
}

/** Text chat: map reply / analyze / compose states to pet mood. */
export function deriveChatSceneMood(opts: {
  sending: boolean;
  streamPhase: "replying" | "analyzing" | null;
  turns: TurnLike[];
  draft: string;
}): SceneMood {
  if (opts.streamPhase === "replying") return "speaking";
  if (opts.streamPhase === "analyzing" || opts.turns.some((t) => t.status === "analyzing")) return "thinking";
  if (opts.sending) return "thinking";
  if (opts.draft.trim()) return "listening";
  return "idle";
}
