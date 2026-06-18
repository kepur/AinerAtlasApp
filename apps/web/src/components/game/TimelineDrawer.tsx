import { X } from "lucide-react";

export type TimelineFilter = "all" | "speech" | "contradiction" | "vote" | "question";

export type TimelineEntry = {
  id: string;
  type: string;
  speaker?: string;
  text: string;
  textNative?: string;
  round?: number;
};

type TimelineDrawerProps = {
  entries: TimelineEntry[];
  filter: TimelineFilter;
  onFilterChange: (f: TimelineFilter) => void;
  onClose: () => void;
};

const FILTERS: { key: TimelineFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "speech", label: "发言" },
  { key: "question", label: "提问" },
  { key: "contradiction", label: "矛盾" },
  { key: "vote", label: "投票" },
];

function matchesFilter(type: string, filter: TimelineFilter): boolean {
  if (filter === "all") return true;
  if (filter === "speech") return type === "speech";
  if (filter === "question") return type === "user_question";
  if (filter === "contradiction") return type === "contradiction";
  if (filter === "vote") return type === "vote_result";
  return true;
}

export default function TimelineDrawer({
  entries,
  filter,
  onFilterChange,
  onClose,
}: TimelineDrawerProps) {
  const visible = entries.filter((e) => matchesFilter(e.type, filter));

  return (
    <div className="fixed inset-0 z-[320] flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm h-full game-glass-card rounded-l-3xl border-r-0 flex flex-col animate-[fadeInUp_0.25s_ease-out]">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <h3 className="font-bold text-white">发言记录</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white/70">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar shrink-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${
                filter === f.key
                  ? "bg-[#7c5cff]/40 border-[#7c5cff]/60 text-white"
                  : "bg-white/5 border-white/15 text-white/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          {visible.length === 0 && (
            <p className="text-sm text-white/40 text-center py-8">暂无记录</p>
          )}
          {visible.map((e) => (
            <div key={e.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-[#a78bfa]">
                  {e.speaker || (e.type === "contradiction" ? "矛盾提示" : "系统")}
                </span>
                {e.round != null && (
                  <span className="text-[10px] text-white/35">R{e.round}</span>
                )}
              </div>
              <p className="text-sm text-white/90">{e.text}</p>
              {e.textNative && (
                <p className="text-xs text-white/45 mt-1">{e.textNative}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
