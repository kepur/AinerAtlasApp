import { apiRequest } from "../api";
import { useLearningLanguageStore } from "../stores/learningLanguageStore";
import { useGameStore } from "../stores/gameStore";

/** Save a game's learned content as a reusable expression asset. */
export async function saveGameToAssets(
  title: string,
  lines: string[],
  targetLanguage = useGameStore.getState().currentSession?.target_language || useLearningLanguageStore.getState().language,
): Promise<boolean> {
  const sourceText = lines.filter(Boolean).join("\n");
  if (!sourceText.trim()) return false;
  try {
    await apiRequest("/api/assets", {
      method: "POST",
      body: JSON.stringify({
        title: title || "游戏学习收获",
        source_text: sourceText,
        target_language: targetLanguage,
      }),
    });
    return true;
  } catch (e) {
    console.error("saveGameToAssets failed", e);
    return false;
  }
}

/** Add learned patterns to the user's Pattern Crush (消消乐) review queue. */
export async function addPatternsToCrush(
  patterns: string[],
  languageCode = useGameStore.getState().currentSession?.target_language || useLearningLanguageStore.getState().language,
): Promise<number> {
  let ok = 0;
  for (const pattern of patterns.filter(Boolean).slice(0, 12)) {
    try {
      await apiRequest("/api/grammar/candidate", {
        method: "POST",
        body: JSON.stringify({
          pattern,
          item_type: "pattern",
          language_code: languageCode,
        }),
      });
      ok += 1;
    } catch (e) {
      console.error("addPatternsToCrush failed for", pattern, e);
    }
  }
  return ok;
}
