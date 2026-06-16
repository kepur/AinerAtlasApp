import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share, PenTool, MessageSquare, Clock, Lightbulb } from "lucide-react";

export default function DetectiveBoardDark() {
  const navigate = useNavigate();

  return (
    <div className="premium w-full h-full bg-[#0b0c10] text-[#e2e8f0] flex flex-col relative overflow-hidden font-sans">
      
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] bg-[#0b0c10]/80 backdrop-blur-xl shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between h-14">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 border border-white/10 transition-colors shrink-0">
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex flex-col items-center flex-1 px-4">
            <div className="font-bold text-white text-[15px] tracking-wide drop-shadow-md">案件线索板</div>
            <div className="text-[10px] text-white/50 mt-0.5">案件：咖啡馆的谎言</div>
          </div>

          <button className="w-8 h-8 flex items-center justify-center text-white bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 border border-white/10 transition-colors shrink-0">
            <Share size={16} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between px-2 mb-3 mt-2">
          <div className="text-[10px] text-white/60 font-medium">调查进度：42%</div>
          <div className="flex-1 max-w-[120px] h-1.5 bg-white/10 rounded-full overflow-hidden ml-3 shadow-inner border border-white/5">
            <div className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#4ade80] shadow-[0_0_10px_rgba(139,92,246,0.5)]" style={{ width: '42%' }}></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-between items-center bg-[#1f2937]/30 backdrop-blur-md border border-white/10 rounded-[18px] p-1 mb-3">
          {['案件背景', '线索 (12)', '嫌疑人 (4)', '时间线', '笔记'].map((tab, i) => (
            <button key={i} className={`flex-1 text-[11px] font-bold py-2 rounded-xl transition-all ${i === 0 ? 'bg-white/20 text-white shadow-md border border-white/10' : 'bg-transparent text-white/50 hover:text-white hover:bg-white/5'}`}>
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 w-full overflow-y-auto pb-28 px-4 pt-2 flex flex-col gap-5 no-scrollbar">
        
        {/* Case Background */}
        <section>
          <div className="bg-[#111827] rounded-2xl p-4 border border-white/5 shadow-md flex flex-col gap-3">
            <h3 className="font-bold text-white/90 text-sm">案件背景</h3>
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <p className="text-[11px] text-white/70 leading-relaxed">
                  昨晚 9:00 左右，魔咖馆老板在店内后门被发现死亡。
                </p>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  <span className="text-white/50">死因：</span>头部重击。凶器不在现场。
                </p>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  当晚店内共有 4 人：服务员 Anna、合伙人 Mark、常客 Leo、外卖员 Tom。
                </p>
              </div>
              <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0 border border-white/10">
                <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=200&h=200" alt="Cafe" className="w-full h-full object-cover opacity-80" />
              </div>
            </div>
          </div>
        </section>

        {/* Clue Cards */}
        <section className="flex flex-col gap-3">
          <h3 className="font-bold text-white/90 text-sm px-1">线索卡片</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: '湿伞', desc: '这把伞是湿的，但当天没有下雨。', img: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=200&h=150', isNew: true },
              { title: '三个杯子', desc: '桌上有三个杯子，但只有两人喝了咖啡。', img: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&q=80&w=200&h=150', isNew: true },
              { title: '撕碎的纸条', desc: '垃圾桶里有一张被撕碎的纸条。', img: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=200&h=150', isNew: true },
              { title: '后门钥匙', desc: '钥匙上有咖啡馆后门的指纹，但不属于老板。', img: 'https://images.unsplash.com/photo-1584820927498-cafe2c1c69be?auto=format&fit=crop&q=80&w=200&h=150', isNew: false },
              { title: '监控盲区', desc: '案发时间段，监控刚好有 3 分钟中断。', img: 'https://images.unsplash.com/photo-1557800636-8ab27a58a74e?auto=format&fit=crop&q=80&w=200&h=150', isNew: false },
              { title: '血迹拖痕', desc: '地上有一小段血迹拖痕，通向储物间。', img: 'https://images.unsplash.com/photo-1595991209266-5af51952e46b?auto=format&fit=crop&q=80&w=200&h=150', isNew: true },
            ].map((clue, idx) => (
              <div key={idx} className="bg-[#111827] rounded-xl overflow-hidden border border-white/5 shadow-md flex flex-col relative">
                {clue.isNew && (
                  <div className="absolute top-2 right-2 bg-[#8b5cf6] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md z-10">新</div>
                )}
                <div className="w-full h-24 bg-[#1f2937] relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent z-10"></div>
                  <img src={clue.img} alt={clue.title} className="w-full h-full object-cover opacity-70 mix-blend-luminosity" />
                </div>
                <div className="p-3 pt-1 flex-1 flex flex-col justify-between z-20">
                  <h4 className="font-bold text-white/90 text-xs mb-1">{clue.title}</h4>
                  <p className="text-[10px] text-white/50 leading-snug line-clamp-2">{clue.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 w-full bg-[#0b0c10]/95 backdrop-blur-xl border-t border-white/5 px-4 py-3 pb-[env(safe-area-inset-bottom,16px)] z-50">
        <div className="text-[10px] text-white/50 font-bold mb-2">快捷操作</div>
        <div className="flex gap-2 h-12">
           <button onClick={() => navigate('/game/interrogation/1')} className="flex-1 bg-[#1f2937] text-white/80 font-bold text-[11px] rounded-xl border border-white/10 hover:bg-[#374151] transition-colors flex items-center justify-center gap-1.5 active:scale-95">
             <MessageSquare size={14} /> 审问嫌疑人
           </button>
           <button className="flex-1 bg-[#1f2937] text-white/80 font-bold text-[11px] rounded-xl border border-white/10 hover:bg-[#374151] transition-colors flex items-center justify-center gap-1.5 active:scale-95">
             <Clock size={14} /> 查看时间线
           </button>
           <button className="w-12 bg-[#1f2937] text-white/80 rounded-xl border border-white/10 hover:bg-[#374151] transition-colors flex items-center justify-center shrink-0 active:scale-95">
             <PenTool size={16} />
           </button>
           <button className="px-5 bg-[#8b5cf6] text-white font-bold text-[12px] rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#7c3aed] transition-colors flex items-center justify-center shrink-0 active:scale-95">
             提交推理
           </button>
           <button className="w-12 bg-transparent text-[#8b5cf6] border border-[#8b5cf6]/30 rounded-xl hover:bg-[#8b5cf6]/10 transition-colors flex items-center justify-center shrink-0 active:scale-95">
             <Lightbulb size={16} />
           </button>
        </div>
      </div>
    </div>
  );
}
