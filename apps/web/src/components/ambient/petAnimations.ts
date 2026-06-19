import type { TargetAndTransition, Transition } from "framer-motion";

export type PetIdleAction = "float" | "bounce" | "roll" | "wiggle" | "hop" | "spin";

export const PET_IDLE_ACTIONS: PetIdleAction[] = ["float", "bounce", "roll", "wiggle", "hop", "spin"];

export function pickRandomPetAction(exclude?: PetIdleAction): PetIdleAction {
  const pool = exclude ? PET_IDLE_ACTIONS.filter((a) => a !== exclude) : PET_IDLE_ACTIONS;
  return pool[Math.floor(Math.random() * pool.length)] ?? "float";
}

export function petIdleActionMotion(action: PetIdleAction): {
  animate: TargetAndTransition;
  transition: Transition;
} {
  switch (action) {
    case "bounce":
      return {
        animate: { y: [0, -22, -8, 0], scale: [1, 1.06, 1.02, 1] },
        transition: { duration: 0.85, ease: "easeOut" },
      };
    case "roll":
      return {
        animate: { rotateZ: [0, 18, -12, 360], y: [0, -6, 0] },
        transition: { duration: 1.1, ease: "easeInOut" },
      };
    case "wiggle":
      return {
        animate: { rotate: [0, -14, 14, -10, 10, 0], x: [0, -4, 4, 0] },
        transition: { duration: 0.75, ease: "easeInOut" },
      };
    case "hop":
      return {
        animate: { y: [0, -18, 0], scaleY: [1, 0.88, 1.05, 1], scaleX: [1, 1.08, 0.96, 1] },
        transition: { duration: 0.65, ease: "easeOut" },
      };
    case "spin":
      return {
        animate: { rotateY: [0, 180, 360], y: [0, -10, 0] },
        transition: { duration: 1.0, ease: "easeInOut" },
      };
    case "float":
    default:
      return {
        animate: { y: [0, -14, 0] },
        transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
      };
  }
}

export function petMoodMotion(mood: "speaking" | "thinking" | "listening" | "idle"): {
  animate: TargetAndTransition;
  transition: Transition;
} {
  if (mood === "speaking") {
    return {
      animate: { y: [0, -10, -4, 0], rotateY: 0 },
      transition: { duration: 0.55, repeat: Infinity, ease: "easeInOut" },
    };
  }
  if (mood === "thinking") {
    return {
      animate: { y: [0, -6, 0], rotateY: 0 },
      transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
    };
  }
  if (mood === "listening") {
    return {
      animate: { y: [0, -8, 0], rotateY: [-8, 8, -8] },
      transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
    };
  }
  return petIdleActionMotion("float");
}
