import { Search } from "lucide-react";

export default function ClueCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="w-full flex justify-center my-3">
      <div className="w-[85%] bg-gradient-to-br from-[#ECFDF5] to-[#f2f4f6] rounded-xl p-4 border border-[#10B981]/30 shadow-sm relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-5">
          <Search size={80} />
        </div>
        <div className="flex items-center gap-2 mb-1.5 relative z-10">
          <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center">
            <Search size={10} />
          </div>
          <span className="text-xs font-bold text-[#10B981] tracking-wide">线索发现 (CLUE)</span>
        </div>
        <h4 className="text-sm font-bold text-[#191c1e] mb-1 relative z-10">{title}</h4>
        <p className="text-[11px] text-[#464554] leading-relaxed relative z-10">{desc}</p>
      </div>
    </div>
  );
}
