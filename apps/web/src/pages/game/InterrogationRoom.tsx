import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MoreHorizontal, Search, ChevronDown, ChevronUp, Volume2, Lightbulb } from "lucide-react";

export default function InterrogationRoom() {
  const navigate = useNavigate();

  return (
    <div className="premium w-full h-full bg-[#0b0c10] text-[#e2e8f0] flex flex-col relative overflow-hidden font-sans">
      
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] bg-[#0b0c10]/95 backdrop-blur-md shrink-0 flex items-center justify-between h-14 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white/80 rounded-full bg-white/5 hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft size={18} />
        </button>
        
        <div className="font-bold text-white text-[15px] tracking-wide flex-1 px-4 text-left truncate">
          审问：服务员 Anna
        </div>

        <div className="flex flex-col items-end shrink-0 mr-3">
          <div className="text-[9px] text-white/50 mb-0.5">回合 3/5</div>
          <div className="flex items-center gap-1 text-[10px] text-white/80">
            <Heart size={10} className="fill-[#ef4444] text-[#ef4444]" /> 好感度: <span className="text-[#ef4444] font-bold">-10</span>
          </div>
        </div>

        <button onClick={() => navigate('/game/summary/1')} className="w-8 h-8 flex items-center justify-center text-white/80 rounded-full bg-white/5 hover:bg-white/10 transition-colors shrink-0">
          <MoreHorizontal size={18} />
        </button>
      </header>

      <main className="flex-1 w-full overflow-y-auto pb-40 px-4 pt-4 flex flex-col gap-5 no-scrollbar">
        
        {/* Profile & Chat */}
        <section className="flex gap-4">
          {/* Avatar Image */}
          <div className="w-[140px] h-[180px] rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg relative">
             <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10]/80 via-transparent to-transparent z-10"></div>
             <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300&h=400" alt="Anna" className="w-full h-full object-cover" />
          </div>

          {/* Chat Bubble & Info */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Bubble */}
            <div className="relative">
              <span className="absolute -top-3 left-2 bg-[#8b5cf6] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">Anna</span>
              <div className="bg-[#1f2937] text-white/90 text-[13px] leading-relaxed p-3.5 pt-4 rounded-2xl rounded-tl-sm border border-white/5 shadow-md">
                我昨晚一直在吧台工作，大概 9 点左右看到老板从办公室出来。
              </div>
            </div>

            {/* Known Info */}
            <div className="bg-[#111827] rounded-xl p-3 border border-white/5 shadow-inner">
              <div className="text-[11px] font-bold text-white/80 flex items-center gap-1.5 mb-2">
                <div className="w-1 h-1 rounded-full bg-[#8b5cf6]"></div> 已知信息
              </div>
              <ul className="flex flex-col gap-1.5">
                {[
                  'Anna 声称案发时间在工作。',
                  '监控显示 9:02 ~ 9:05 有盲区。',
                  '湿伞指纹不属于 Anna。'
                ].map((info, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#10b981] mt-1 text-[8px]">●</span>
                    <span className="text-[10px] text-white/60 leading-tight">{info}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Question Options */}
        <section className="mt-2">
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="font-bold text-white/90 text-[13px]">你想问什么？</h3>
            <span className="text-[10px] text-white/50">剩余提问次数: 2</span>
          </div>
          
          <div className="flex flex-col gap-2">
            {[
              '你最后一次见到老板是什么时候？',
              '案发时间段你在做什么？',
              '你为什么要储物间？',
              '你能解释一下这把湿伞吗？'
            ].map((q, i) => (
              <button key={i} className="w-full bg-[#111827] border border-white/10 rounded-xl p-3.5 flex items-center gap-3 text-left hover:bg-[#1f2937] transition-colors active:scale-[0.98]">
                <Search size={14} className="text-white/40 shrink-0" />
                <span className="text-[12px] text-white/80 font-medium leading-tight">{q}</span>
              </button>
            ))}
          </div>

          <button className="w-full py-3 mt-2 text-[11px] text-white/50 flex items-center justify-center gap-1 hover:text-white/80 transition-colors">
            更多问题 <ChevronDown size={12} />
          </button>
        </section>

      </main>

      {/* Learning Assistant - Bottom Floating */}
      <div className="absolute bottom-4 left-4 right-4 bg-gradient-to-br from-[#1f2937] to-[#111827] rounded-2xl border border-[#8b5cf6]/30 shadow-[0_0_20px_rgba(139,92,246,0.15)] z-50 overflow-hidden flex flex-col">
        {/* Glow effect */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#8b5cf6]/0 via-[#8b5cf6] to-[#8b5cf6]/0"></div>
        
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-white/5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#c4b5fd]">
            <Lightbulb size={12} className="text-[#8b5cf6]" /> 学习助手
          </div>
          <button className="flex items-center gap-0.5 text-[10px] text-white/40 hover:text-white/80 transition-colors">
            收起 <ChevronUp size={12} />
          </button>
        </div>

        <div className="p-4 flex gap-3 relative">
          <div className="flex-1">
            <h4 className="font-bold text-[#e2e8f0] text-[14px] leading-tight mb-2 pr-8">When was the last time you saw the owner?</h4>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] text-white/50">
                <span className="text-[#8b5cf6] font-bold">句型：</span>When was the last time you...?
              </div>
              <div className="text-[10px] text-white/50">
                <span className="text-[#8b5cf6] font-bold">用途：</span>用来询问“你上一次做某事是什么时候”
              </div>
            </div>
          </div>
          <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] flex items-center justify-center hover:bg-[#8b5cf6]/30 transition-colors">
            <Volume2 size={16} />
          </button>
        </div>
      </div>

    </div>
  );
}
