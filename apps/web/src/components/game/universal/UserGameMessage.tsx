import { BookOpen } from "lucide-react";

export default function UserGameMessage({ text, turnId }: { text: string; turnId: string }) {
  return (
    <div className="w-full flex justify-end gap-2 my-1">
      <div className="flex flex-col items-end gap-1 max-w-[80%]">
        <div className="bg-[#4648d4] text-white rounded-2xl rounded-tr-sm p-3.5 shadow-md shadow-[#4648d4]/20">
          <p className="text-sm leading-relaxed">{text}</p>
        </div>
        <button className="flex items-center gap-1 mt-1 mr-1 px-2 py-1 bg-[#EEF2FF] border border-[#c0c1ff] rounded-md text-[#4648d4] active:scale-95 transition-transform">
          <BookOpen size={10} />
          <span className="text-[9px] font-bold">学习点 {turnId}</span>
        </button>
      </div>
    </div>
  );
}
