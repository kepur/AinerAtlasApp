import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share, ShieldCheck, Clock, FileText, Search, Play, Plus, Bookmark, ChevronLeft } from "lucide-react";

export default function GameSummaryDark() {
  const navigate = useNavigate();

  return (
    <div className="premium w-full h-full bg-[#0b0c10] text-[#e2e8f0] flex flex-col relative overflow-hidden font-sans">
      
      {/* Background confetti effect (simplified with CSS radial gradients) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-yellow-400"></div>
        <div className="absolute top-20 right-20 w-3 h-3 rotate-45 bg-blue-400"></div>
        <div className="absolute top-40 left-1/4 w-1.5 h-1.5 rounded-full bg-pink-400"></div>
        <div className="absolute top-12 right-1/3 w-2 h-2 rotate-12 bg-green-400"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 px-4 pt-[env(safe-area-inset-top,20px)] shrink-0 flex items-center justify-between h-14">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white/80 rounded-full hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="font-bold text-white text-[15px] tracking-wide">游戏总结</div>
        <button className="w-8 h-8 flex items-center justify-center text-white/80 rounded-full hover:bg-white/10 transition-colors shrink-0">
          <Share size={18} />
        </button>
      </header>

      <main className="flex-1 w-full overflow-y-auto pb-32 px-4 pt-2 flex flex-col gap-4 no-scrollbar relative z-10">
        
        {/* Title */}
        <div className="flex flex-col items-center justify-center py-4">
           <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-md mb-2 flex items-center gap-2">
             ✨ 真相揭晓！ ✨
           </h1>
           <div className="bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#fcd34d] px-3 py-1 rounded-full flex items-center gap-1 text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
             <ShieldCheck size={14} /> 推理正确
           </div>
        </div>

        {/* Case Reveal */}
        <section className="bg-[#111827] rounded-2xl p-4 border border-white/5 shadow-md flex gap-4">
          <div className="w-24 h-32 rounded-xl overflow-hidden shrink-0 border border-white/10">
            <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=200&h=300" alt="Cafe" className="w-full h-full object-cover opacity-80" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="text-[11px] text-white/60 font-bold mb-1">案件：咖啡馆的谎言</div>
            <div className="text-[13px] font-bold text-white/90">
              真相是：<span className="text-[#ef4444]">合伙人 Mark</span>
            </div>
            <p className="text-[10px] text-white/60 leading-relaxed mt-1">
              Mark 因财务纠纷杀害了老板，并伪造不在场证明，他利用监控盲区进入后门，作案后用湿伞伪装外出。
            </p>
          </div>
        </section>

        {/* Performance Stats */}
        <section className="bg-[#111827] rounded-2xl p-4 border border-white/5 shadow-md">
          <h3 className="font-bold text-white/90 text-[13px] mb-3">你的表现</h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] text-white/50"><ShieldCheck size={12} className="text-[#4ade80]" /> 正确推理</div>
              <div className="text-base font-bold text-white">100%</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] text-white/50"><Search size={12} className="text-[#8b5cf6]" /> 提问次数</div>
              <div className="text-base font-bold text-white">8</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] text-white/50"><Clock size={12} className="text-[#3b82f6]" /> 调查时长</div>
              <div className="text-base font-bold text-white">18:36</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] text-white/50"><FileText size={12} className="text-[#f59e0b]" /> 获得线索</div>
              <div className="text-base font-bold text-white">6/6</div>
            </div>
          </div>
        </section>

        {/* Learning */}
        <section className="bg-[#111827] rounded-2xl p-4 border border-white/5 shadow-md flex gap-4">
          {/* Left: Sentences */}
          <div className="flex-1">
             <h3 className="font-bold text-[#fcd34d] text-[12px] mb-2">高频句型</h3>
             <ul className="flex flex-col gap-1.5 text-[10px] text-white/70">
               <li>1. When was the last time you saw...?</li>
               <li>2. Can you explain why...?</li>
               <li>3. That doesn't add up.</li>
             </ul>
          </div>
          {/* Right: Words */}
          <div className="flex-1">
             <h3 className="font-bold text-[#fcd34d] text-[12px] mb-2">新学词汇</h3>
             <div className="flex flex-col gap-1.5">
               <div className="flex items-center justify-between bg-[#1f2937] rounded-md px-2 py-1 text-[10px]">
                 <span className="font-bold text-white/90">alibi</span>
                 <span className="text-white/50">不在场证明</span>
               </div>
               <div className="flex items-center justify-between bg-[#1f2937] rounded-md px-2 py-1 text-[10px]">
                 <span className="font-bold text-white/90">motive</span>
                 <span className="text-white/50">动机</span>
               </div>
               <div className="flex items-center justify-between bg-[#1f2937] rounded-md px-2 py-1 text-[10px]">
                 <span className="font-bold text-white/90">fingerprint</span>
                 <span className="text-white/50">指纹</span>
               </div>
               <div className="flex items-center justify-between bg-[#1f2937] rounded-md px-2 py-1 text-[10px]">
                 <span className="font-bold text-white/90">blind spot</span>
                 <span className="text-white/50">监控盲区</span>
               </div>
             </div>
          </div>
        </section>

        {/* Recap */}
        <section className="bg-[#111827] rounded-2xl p-4 border border-white/5 shadow-md">
          <h3 className="font-bold text-white/90 text-[13px] mb-3">精彩回顾</h3>
          <div className="flex gap-4">
            <ul className="flex-1 flex flex-col gap-2">
              <li className="flex items-start gap-1.5">
                <span className="text-[#10b981] mt-0.5"><ShieldCheck size={12} /></span>
                <span className="text-[10px] text-white/70 leading-tight">成功发现了监控盲区的关键线索</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#10b981] mt-0.5"><ShieldCheck size={12} /></span>
                <span className="text-[10px] text-white/70 leading-tight">准确指出了三处证词矛盾</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#10b981] mt-0.5"><ShieldCheck size={12} /></span>
                <span className="text-[10px] text-white/70 leading-tight">通过逻辑推理锁定了真正凶手</span>
              </li>
            </ul>
            <div className="w-28 h-20 rounded-xl overflow-hidden relative shrink-0 border border-white/10 group cursor-pointer">
              <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=200&h=150" alt="Video thumbnail" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-black/50 border border-white/50 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <Play size={14} className="ml-1" />
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 w-full bg-[#0b0c10]/95 backdrop-blur-xl border-t border-white/5 px-4 pt-3 pb-[env(safe-area-inset-bottom,16px)] z-50 flex flex-col items-center">
        <div className="flex gap-3 w-full mb-4">
           <button className="flex-1 bg-[#1f2937] text-white/80 font-bold text-[12px] h-12 rounded-2xl border border-white/10 hover:bg-[#374151] transition-colors flex items-center justify-center gap-1.5 active:scale-95">
             <Plus size={16} /> 加入消消乐
           </button>
           <button className="flex-1 bg-[#1f2937] text-white/80 font-bold text-[12px] h-12 rounded-2xl border border-white/10 hover:bg-[#374151] transition-colors flex items-center justify-center gap-1.5 active:scale-95">
             <Bookmark size={16} /> 保存到 Assets
           </button>
           <button className="flex-1 bg-[#8b5cf6] text-white font-bold text-[13px] h-12 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-[#7c3aed] transition-colors flex items-center justify-center active:scale-95">
             再来一局
           </button>
        </div>
        <button onClick={() => navigate('/game')} className="text-[11px] text-white/40 hover:text-white/80 transition-colors flex items-center gap-1 pb-2">
          <ChevronLeft size={12} /> 返回游戏大厅
        </button>
      </div>
    </div>
  );
}
