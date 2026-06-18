import { Pin, X } from "lucide-react";
import type { DialogueTurn } from "../../stores/chatStore";

type Props = {
  turns: DialogueTurn[];
  activeTurnId: string | null;
  pinnedTurnId: string | null;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: () => void;
};

export function TurnSelector({ turns, activeTurnId, pinnedTurnId, onSelect, onPin, onUnpin }: Props) {
  if (turns.length <= 1) return null;
  return (
    <div className="turn-selector">
      {turns.map((turn, idx) => (
        <div
          key={turn.turn_id}
          className={`turn-chip ${turn.turn_id === activeTurnId ? "active" : ""} ${turn.pinned ? "pinned" : ""}`}
          onClick={() => onSelect(turn.turn_id)}
        >
          <span className="turn-index">T{idx + 1}</span>
          <span>{turn.label}</span>
          {turn.focusCount > 0 && <span className="turn-count">{turn.focusCount}</span>}
          {turn.pinned && <Pin size={10} className="turn-pin-icon" />}
        </div>
      ))}
      {pinnedTurnId ? (
        <button className="turn-pin-btn" onClick={onUnpin} title="取消固定">
          <X size={14} />
        </button>
      ) : activeTurnId && turns.length > 1 ? (
        <button className="turn-pin-btn" onClick={() => onPin(activeTurnId)} title="固定此轮">
          <Pin size={14} />
        </button>
      ) : null}
    </div>
  );
}
