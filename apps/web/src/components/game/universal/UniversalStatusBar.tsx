import { ArrowLeft, Settings, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UniversalStatusBar() {
  const navigate = useNavigate();
  return (
    <div className="w-full bg-[#f7f9fb]/90 backdrop-blur-md border-b border-[#e0e3e5] px-4 py-2 flex flex-col z-50 sticky top-0 pt-[env(safe-area-inset-top,20px)]">
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center -ml-2 text-[#4648d4] active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <div className="text-sm font-bold text-[#191c1e] tracking-tight">《青云重生》第 1 章</div>
        <div className="flex gap-1">
          <button className="w-8 h-8 flex items-center justify-center text-[#767586] hover:text-[#4648d4]">
            <HelpCircle size={18} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-[#767586] hover:text-[#4648d4]">
            <Settings size={18} />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 text-[10px] font-medium text-[#464554]">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span> 当前场景：后山重逢</span>
        <span className="w-px h-3 bg-[#e0e3e5]"></span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#4648d4]"></span> English</span>
        <span className="w-px h-3 bg-[#e0e3e5]"></span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> 情绪表达</span>
      </div>
    </div>
  );
}
