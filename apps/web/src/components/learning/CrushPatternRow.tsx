import { useState } from "react";
import { Flame, Volume2 } from "lucide-react";
import type { ChatV2PatternItem } from "../../api";
import { addCrushCandidate } from "../../api";

type Props = {
  pattern: ChatV2PatternItem;
  speak: (text: string, lang?: string) => void;
};

export function CrushPatternRow({ pattern, speak }: Props) {
  const [added, setAdded] = useState(false);
  const handleAdd = async () => {
    if (added) return;
    try {
      await addCrushCandidate(pattern.pattern, pattern.example);
      setAdded(true);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="crush-pattern-row">
      <div className="crush-pattern-text">
        <p className="crush-pattern-label">{pattern.pattern}</p>
        {pattern.example && <p className="crush-pattern-example">{pattern.example}</p>}
      </div>
      <button className="tts-btn" onClick={() => speak(pattern.example || pattern.pattern, "en-US")}>
        <Volume2 size={13} />
      </button>
      <button className={`hud-crush-btn ${added ? "added" : ""}`} onClick={handleAdd}>
        <Flame size={11} /> {added ? "已加入" : "加入"}
      </button>
    </div>
  );
}
