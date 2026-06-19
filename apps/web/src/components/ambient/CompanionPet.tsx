import type { ReactNode } from "react";
import CssCompanionPet from "./CssCompanionPet";
import ThreeCompanionPetSlot from "./ThreeCompanionPetSlot";
import type { CompanionPetRenderer, SceneMood } from "./types";

export type CompanionPetProps = {
  mood: SceneMood;
  compact?: boolean;
  playRandomIdle?: boolean;
  /** `css` = default puppet; `three` = GLB slot (pass threeSlot or use built-in placeholder) */
  renderer?: CompanionPetRenderer;
  threeSlot?: ReactNode;
};

export default function CompanionPet({
  mood,
  compact = false,
  playRandomIdle = false,
  renderer = "css",
  threeSlot,
}: CompanionPetProps) {
  if (renderer === "three") {
    return (
      <div className={`ambient-pet-zone ${compact ? "compact" : ""}`}>
        {threeSlot ?? <ThreeCompanionPetSlot mood={mood} compact={compact} />}
      </div>
    );
  }

  return (
    <div className={`ambient-pet-zone ${compact ? "compact" : ""}`}>
      <CssCompanionPet mood={mood} compact={compact} playRandomIdle={playRandomIdle} />
    </div>
  );
}
