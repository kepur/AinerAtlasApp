import { Search, Key } from "lucide-react";
import { LearningHUD } from "../../learning/LearningHUD";
import { normalizeGameHud } from "../../learning/gameHud";
import { useTts } from "../../learning/useTts";
import { useGameStore } from "../../../stores/gameStore";

interface Props {
  mode?: string;
  hud?: Record<string, unknown> | null;
  sessionTitle?: string;
  questionsAsked?: number;
  cluesFound?: number;
  totalClues?: number;
  chapter?: string;
  /** Caption above the cards, e.g. "本轮学习要点（实时）". */
  hintText?: string;
  onTokenClick?: (token: string, context: string) => void;
}

/**
 * Games' learning HUD — an adapter over the shared {@link LearningHUD}.
 *
 * Chat and games teach the same things (natural expression, why it is phrased
 * that way, patterns, the agent panel), so they render from one component.
 * This layer only supplies what is game-specific: the variant-key mapping,
 * the session's target language for TTS, and the progress chips.
 */
export default function UnifiedLearningHUD({
  mode,
  hud,
  questionsAsked = 0,
  cluesFound = 0,
  totalClues = 6,
  chapter,
  hintText,
  onTokenClick,
}: Props) {
  const language = useGameStore((s) => s.currentSession?.target_language);
  const hudPhase = useGameStore((s) => s.hudPhase);
  const { speak } = useTts(language);

  const stats = (questionsAsked > 0 || cluesFound > 0 || chapter) && (
    <span className="hud-caption-stats">
      {chapter && <span className="hud-stat">{chapter}</span>}
      {questionsAsked > 0 && (
        <span className="hud-stat">
          <Search size={10} /> {questionsAsked}
        </span>
      )}
      {totalClues > 0 && cluesFound > 0 && (
        <span className="hud-stat">
          <Key size={10} /> {cluesFound}/{totalClues}
        </span>
      )}
    </span>
  );

  return (
    <LearningHUD
      hud={normalizeGameHud(hud)}
      streamPhase={hudPhase}
      speak={speak}
      onTokenClick={onTokenClick ?? (() => {})}
      className="game-dark"
      hintText={hintText}
      statsSlot={stats || undefined}
      // Turtle Soup reads better as a board than as a scrolling rail.
      layout={mode === "turtle_soup" ? "split" : "scroll"}
    />
  );
}
