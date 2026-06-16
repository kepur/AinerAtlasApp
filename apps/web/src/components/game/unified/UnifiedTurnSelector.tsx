import { Flag, Pin } from "lucide-react";
import { FeedItem } from "../../../stores/gameStore";

interface Props {
  mode?: string;
  feedItems?: FeedItem[];
  phase?: string;
}

export default function UnifiedTurnSelector({ mode, feedItems = [], phase }: Props) {
  const isTurtleSoup = mode === "turtle_soup";

  const turns: { label: string; active: boolean }[] = [];

  if (isTurtleSoup) {
    const hasStory = feedItems.some((f) => f.type === "story" || f.type === "narrator");
    if (hasStory) turns.push({ label: "T1 表面故事", active: phase === "story_reveal" });
    let qCount = 0;
    for (const item of feedItems) {
      if (item.type === "user_question" || item.type === "user_solve") {
        qCount++;
        turns.push({ label: `T${qCount + 1} 提问${qCount}`, active: false });
      }
    }
    if (turns.length > 1 && phase === "questioning") {
      turns[turns.length - 1].active = true;
    }
  } else {
    let idx = 0;
    for (const item of feedItems) {
      if (item.type === "chapter_start") {
        idx++;
        turns.push({ label: `T${idx} ${(item.chapter as string) || `第${idx}章`}`, active: false });
      }
    }
    if (turns.length === 0 && feedItems.length > 0) {
      turns.push({ label: "T1 开场", active: true });
    }
    if (turns.length > 0) turns[turns.length - 1].active = true;
  }

  if (turns.length === 0) return null;

  return (
    <div className="w-full bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar sticky top-[56px] z-40 shadow-sm">
      {turns.map((t, i) => (
        <button
          key={i}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-colors ${
            t.active
              ? "px-5 bg-[#f5f3ff] text-[#8b5cf6] border border-[#ddd6fe] shadow-inner"
              : "text-[#6b7280] hover:bg-gray-50"
          }`}
        >
          {t.label}
        </button>
      ))}
      <button className="w-7 h-7 ml-auto flex items-center justify-center text-[#9ca3af] hover:text-[#6b7280] shrink-0">
        {isTurtleSoup ? <Flag size={14} /> : <Pin size={14} />}
      </button>
    </div>
  );
}
