type SuspicionMeterProps = {
  level: number;
  compact?: boolean;
};

function labelFor(level: number): { text: string; color: string } {
  if (level >= 70) return { text: "高度可疑", color: "text-red-400" };
  if (level >= 40) return { text: "中度可疑", color: "text-orange-400" };
  return { text: "低可疑", color: "text-[#4edea3]" };
}

export default function SuspicionMeter({ level, compact }: SuspicionMeterProps) {
  const { text, color } = labelFor(level);
  const pct = Math.min(100, Math.max(0, level));

  if (compact) {
    return (
      <span className={`text-[10px] font-bold ${color}`}>{text}</span>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-white/60">可疑度估算</span>
        <span className={`text-xs font-bold ${color}`}>{text} · {pct}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-orange-500" : "bg-[#4edea3]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-white/35 mt-2">* 仅基于公开发言的估算，不代表真实身份</p>
    </div>
  );
}
