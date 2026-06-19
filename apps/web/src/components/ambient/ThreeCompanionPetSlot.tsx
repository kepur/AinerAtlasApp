import type { SceneMood } from "./types";

type Props = {
  mood: SceneMood;
  compact?: boolean;
};

/**
 * Reserved mount point for three.js / @react-three/fiber GLB pet.
 *
 * Future usage:
 * ```tsx
 * <CompanionPet
 *   mood={mood}
 *   renderer="three"
 *   threeSlot={
 *     <Suspense fallback={null}>
 *       <Canvas className="ambient-pet-three-canvas">
 *         <PetGlbModel mood={mood} url="/models/coach-pet.glb" />
 *       </Canvas>
 *     </Suspense>
 *   }
 * />
 * ```
 */
export default function ThreeCompanionPetSlot({ mood, compact = false }: Props) {
  return (
    <div
      className={`ambient-pet-three-slot ${compact ? "compact" : ""}`}
      data-mood={mood}
      data-renderer="three"
      aria-hidden
    />
  );
}
