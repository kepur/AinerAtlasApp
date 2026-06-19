import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { petMoodMotion, pickRandomPetAction, petIdleActionMotion, type PetIdleAction } from "./petAnimations";
import type { SceneMood } from "./types";

type Props = {
  mood: SceneMood;
  compact?: boolean;
  /** Cycle through 4–6 idle tricks (bounce, roll, …) when not speaking/thinking. */
  playRandomIdle?: boolean;
};

/** CSS + Framer Motion companion (default until GLB is wired). */
export default function CssCompanionPet({ mood, compact = false, playRandomIdle = false }: Props) {
  const speaking = mood === "speaking";
  const thinking = mood === "thinking";
  const listening = mood === "listening";
  const moodActive = speaking || thinking || listening;

  const [idleAction, setIdleAction] = useState<PetIdleAction>("float");

  useEffect(() => {
    if (!playRandomIdle || moodActive) return;
    let timer: number | undefined;
    const schedule = (prev?: PetIdleAction) => {
      const next = pickRandomPetAction(prev);
      setIdleAction(next);
      const motion = petIdleActionMotion(next);
      const dur = typeof motion.transition.duration === "number" ? motion.transition.duration : 2;
      timer = window.setTimeout(() => schedule(next), (dur + 1.2 + Math.random() * 2) * 1000);
    };
    schedule();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [playRandomIdle, moodActive]);

  const rigMotion = moodActive
    ? petMoodMotion(mood)
    : playRandomIdle
      ? petIdleActionMotion(idleAction)
      : petMoodMotion("idle");

  return (
    <div className={`ambient-pet-stage ${compact ? "compact" : ""}`} aria-hidden>
      <motion.div
        className="ambient-pet-shadow"
        animate={{ scaleX: speaking ? [1, 1.15, 1] : [1, 1.05, 1], opacity: speaking ? [0.35, 0.5, 0.35] : [0.25, 0.35, 0.25] }}
        transition={{ duration: speaking ? 0.6 : 2.4, repeat: Infinity }}
      />
      <motion.div
        className="ambient-pet-rig"
        animate={rigMotion.animate}
        transition={rigMotion.transition}
      >
        <div className="ambient-pet-aura" data-mood={mood} />
        <div className="ambient-pet-body">
          <div className="ambient-pet-ear ambient-pet-ear-l" />
          <div className="ambient-pet-ear ambient-pet-ear-r" />
          <div className="ambient-pet-face">
            <motion.div
              className="ambient-pet-eye ambient-pet-eye-l"
              animate={{ scaleY: thinking ? [1, 0.15, 1] : [1, 1, 0.12, 1] }}
              transition={{ duration: thinking ? 2 : 3.5, repeat: Infinity, times: thinking ? undefined : [0, 0.92, 0.96, 1] }}
            />
            <motion.div
              className="ambient-pet-eye ambient-pet-eye-r"
              animate={{ scaleY: thinking ? [1, 0.15, 1] : [1, 1, 0.12, 1] }}
              transition={{ duration: thinking ? 2 : 3.5, repeat: Infinity, delay: 0.05, times: thinking ? undefined : [0, 0.92, 0.96, 1] }}
            />
            <motion.div
              className="ambient-pet-mouth"
              animate={{
                width: speaking ? [18, 26, 20, 24, 18] : thinking ? [14, 10, 14] : [16, 18, 16],
                height: speaking ? [10, 16, 12, 14, 10] : [8, 8, 8],
              }}
              transition={{ duration: speaking ? 0.45 : 2, repeat: Infinity }}
            />
          </div>
          <div className="ambient-pet-belly-highlight" />
        </div>
        {thinking && (
          <motion.div
            className="ambient-pet-thought"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: [0.4, 1, 0.4], y: [0, -4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            ✦
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
