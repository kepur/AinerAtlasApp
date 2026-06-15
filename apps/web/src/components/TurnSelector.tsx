import { Pin, PinOff } from "lucide-react";
import { useRef, useEffect } from "react";
import type { DialogueTurn } from "../stores/chatStore";
import { useChatStore } from "../stores/chatStore";

export default function TurnSelector() {
  const turns = useChatStore((s) => s.turns);
  const activeTurnId = useChatStore((s) => s.activeTurnId);
  const pinnedTurnId = useChatStore((s) => s.pinnedTurnId);
  const setActiveTurn = useChatStore((s) => s.setActiveTurn);
  const pinTurn = useChatStore((s) => s.pinTurn);
  const unpinTurn = useChatStore((s) => s.unpinTurn);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest turn chip
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [turns.length]);

  if (turns.length === 0) return null;

  // Show last 10 turns
  const visible = turns.slice(-10);

  return (
    <div className="turn-selector" ref={scrollRef}>
      {visible.map((turn) => {
        const isActive = turn.turn_id === activeTurnId;
        const isPinned = turn.turn_id === pinnedTurnId;
        const idx = turns.indexOf(turn);
        const statusClass =
          turn.status === "analyzing" ? "turn-analyzing" :
          turn.status === "replying" ? "turn-replying" :
          turn.status === "failed" ? "turn-failed" :
          turn.status === "ready" ? "turn-ready" : "";

        return (
          <button
            key={turn.turn_id}
            className={`turn-chip ${isActive ? "active" : ""} ${isPinned ? "pinned" : ""} ${statusClass}`}
            onClick={() => setActiveTurn(turn.turn_id)}
            title={turn.user_text}
          >
            <span className="turn-index">T{idx + 1}</span>
            <span className="turn-label">{turn.label}</span>
            {turn.focusCount > 0 && (
              <span className="turn-count">{turn.focusCount}</span>
            )}
            {isPinned && <PinOff size={10} className="turn-pin-icon" onClick={(e) => { e.stopPropagation(); unpinTurn(); }} />}
          </button>
        );
      })}
      {/* Pin toggle for active turn */}
      {activeTurnId && !pinnedTurnId && (
        <button
          className="turn-pin-btn"
          onClick={() => pinTurn(activeTurnId)}
          title="固定当前学习轮"
        >
          <Pin size={12} />
        </button>
      )}
    </div>
  );
}
