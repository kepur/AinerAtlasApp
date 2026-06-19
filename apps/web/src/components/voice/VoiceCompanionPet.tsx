import { motion } from "framer-motion";
import type { VoiceSceneMood } from "./VoiceAmbientScene";

type Props = {
  mood: VoiceSceneMood;
  compact?: boolean;
};

export default function VoiceCompanionPet({ mood, compact = false }: Props) {
  const speaking = mood === "speaking";
  const thinking = mood === "thinking";
  const listening = mood === "listening";

  return (
    <div className={`voice-pet-stage ${compact ? "compact" : ""}`} aria-hidden>
      <motion.div
        className="voice-pet-shadow"
        animate={{ scaleX: speaking ? [1, 1.15, 1] : [1, 1.05, 1], opacity: speaking ? [0.35, 0.5, 0.35] : [0.25, 0.35, 0.25] }}
        transition={{ duration: speaking ? 0.6 : 2.4, repeat: Infinity }}
      />
      <motion.div
        className="voice-pet-rig"
        animate={{
          y: speaking ? [0, -10, -4, 0] : thinking ? [0, -6, 0] : [0, -14, 0],
          rotateY: listening ? [-8, 8, -8] : [0, 0, 0],
        }}
        transition={{
          duration: speaking ? 0.55 : thinking ? 1.2 : 2.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="voice-pet-aura" data-mood={mood} />
        <div className="voice-pet-body">
          <div className="voice-pet-ear voice-pet-ear-l" />
          <div className="voice-pet-ear voice-pet-ear-r" />
          <div className="voice-pet-face">
            <motion.div
              className="voice-pet-eye voice-pet-eye-l"
              animate={{ scaleY: thinking ? [1, 0.15, 1] : [1, 1, 0.12, 1] }}
              transition={{ duration: thinking ? 2 : 3.5, repeat: Infinity, times: thinking ? undefined : [0, 0.92, 0.96, 1] }}
            />
            <motion.div
              className="voice-pet-eye voice-pet-eye-r"
              animate={{ scaleY: thinking ? [1, 0.15, 1] : [1, 1, 0.12, 1] }}
              transition={{ duration: thinking ? 2 : 3.5, repeat: Infinity, delay: 0.05, times: thinking ? undefined : [0, 0.92, 0.96, 1] }}
            />
            <motion.div
              className="voice-pet-mouth"
              animate={{
                width: speaking ? [18, 26, 20, 24, 18] : thinking ? [14, 10, 14] : [16, 18, 16],
                height: speaking ? [10, 16, 12, 14, 10] : [8, 8, 8],
              }}
              transition={{ duration: speaking ? 0.45 : 2, repeat: Infinity }}
            />
          </div>
          <div className="voice-pet-belly-highlight" />
        </div>
        {thinking && (
          <motion.div
            className="voice-pet-thought"
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
