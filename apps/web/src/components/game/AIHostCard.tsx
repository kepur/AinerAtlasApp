import { Info } from "lucide-react";

export default function AIHostCard({ text }: { text: string }) {
  return (
    <div className="flex justify-center my-4 w-full">
      <div className="bg-[#7c5cff]/10 border border-[#7c5cff]/20 rounded-full px-4 py-2 flex items-center gap-2 max-w-[85%]">
        <Info size={14} className="text-[#c0c1ff]" />
        <span className="text-xs text-[#c0c1ff] font-medium">{text}</span>
      </div>
    </div>
  );
}
