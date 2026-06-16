import { Mic, Send, Lightbulb } from "lucide-react";

type AdaptiveInputBarProps = {
  mode?: "free" | "choice" | "turtle_soup";
  choices?: { label: string; action: string }[];
};

export default function AdaptiveInputBar({ mode = "free", choices }: AdaptiveInputBarProps) {
  return (
    <div className="w-full fixed bottom-0 left-0 bg-[#f7f9fb]/90 backdrop-blur-xl border-t border-[#e0e3e5] px-4 py-3 pb-[env(safe-area-inset-bottom,20px)] z-50">
      
      {mode === "free" && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <button className="text-[11px] font-bold text-[#4648d4] flex items-center gap-1 hover:opacity-80">
              <Lightbulb size={12} /> 帮我表达
            </button>
            <span className="text-[10px] text-[#767586]">中英文混合输入均可</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-[#e0e3e5] rounded-full h-11 flex items-center px-4 shadow-sm focus-within:border-[#4648d4] focus-within:ring-1 focus-within:ring-[#4648d4] transition-all">
              <input 
                type="text" 
                placeholder="输入你的回应..." 
                className="flex-1 bg-transparent border-none outline-none text-sm text-[#191c1e] placeholder:text-[#767586]"
              />
              <button className="text-[#767586] hover:text-[#4648d4] ml-2">
                <Mic size={18} />
              </button>
            </div>
            <button className="w-11 h-11 bg-[#4648d4] text-white rounded-full flex items-center justify-center shadow-md shadow-[#4648d4]/30 active:scale-95 transition-transform shrink-0">
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {mode === "choice" && choices && (
        <div className="flex flex-col gap-2">
          {choices.map((choice, i) => (
            <button 
              key={i}
              className="w-full py-3 px-4 bg-white border border-[#e0e3e5] rounded-xl text-left text-sm font-semibold text-[#191c1e] hover:border-[#4648d4] hover:bg-[#EEF2FF] transition-colors shadow-sm active:scale-[0.98]"
            >
              {String.fromCharCode(65 + i)}. {choice.label}
            </button>
          ))}
          <button className="w-full py-3 px-4 bg-[#f2f4f6] border border-transparent rounded-xl text-center text-sm font-bold text-[#4648d4] hover:bg-[#EEF2FF] transition-colors active:scale-[0.98]">
            自己输入...
          </button>
        </div>
      )}

      {mode === "turtle_soup" && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-[#191c1e] mb-1 px-1">快速提问芯片</div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {['Did he...?', 'Was he...?', 'Had he... before?', 'Is it related to...?'].map((chip, i) => (
              <button key={i} className="shrink-0 px-3 py-1.5 bg-[#EEF2FF] text-[#4648d4] border border-[#c0c1ff] rounded-full text-xs font-bold active:scale-95 transition-transform">
                {chip}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-white border border-[#e0e3e5] rounded-full h-11 flex items-center px-4 shadow-sm focus-within:border-[#4648d4] focus-within:ring-1 focus-within:ring-[#4648d4] transition-all">
              <input 
                type="text" 
                placeholder="提出一个是/否问题..." 
                className="flex-1 bg-transparent border-none outline-none text-sm text-[#191c1e] placeholder:text-[#767586]"
              />
            </div>
            <button className="w-11 h-11 bg-[#4648d4] text-white rounded-full flex items-center justify-center shadow-md shadow-[#4648d4]/30 active:scale-95 transition-transform shrink-0">
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
