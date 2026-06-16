import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Share2, Award, Download, BookmarkPlus, Lightbulb } from "lucide-react";

export default function GameSummaryScreen() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#f7f9fb] flex flex-col text-[#191c1e] relative pb-32">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-5 h-16 pt-[env(safe-area-inset-top,20px)] bg-[#f7f9fb]/90 backdrop-blur-xl border-b border-[#e0e3e5]">
        <button 
          onClick={() => navigate('/game')}
          className="w-10 h-10 flex items-center justify-start text-[#4648d4] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-[#191c1e] tracking-tight">章节结算</h1>
        <button className="w-10 h-10 flex items-center justify-end text-[#4648d4] hover:opacity-80 transition-opacity">
          <Share2 size={20} />
        </button>
      </header>

      <main className="px-5 pt-24 flex flex-col gap-6">
        
        {/* Header Summary */}
        <section className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4648d4] to-[#3B82F6] flex items-center justify-center text-white mb-3 shadow-[0_4px_20px_rgba(70,72,212,0.3)]">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-extrabold text-[#191c1e] mb-1">《青云重生》第 1 章</h2>
          <p className="text-[#464554] text-sm">你已完成本章节故事体验与英语练习。</p>
        </section>

        {/* Story Plot Summary */}
        <section className="bg-white/70 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-[#e0e3e5]">
          <div className="flex items-center gap-2 mb-3">
            <Award size={20} className="text-[#F59E0B]" />
            <h3 className="font-bold text-[#191c1e]">剧情总结</h3>
          </div>
          <p className="text-sm text-[#464554] leading-relaxed">
            你重生后第一次见到小师妹，面对她的关心，你选择了保持距离。这让她感到非常错愕和受伤，但你也成功避免了重蹈前世的覆辙。
          </p>
          <div className="mt-4 pt-4 border-t border-[#e0e3e5]">
            <h4 className="text-xs font-bold text-[#191c1e] mb-2">关系变化</h4>
            <div className="flex gap-2">
              <span className="bg-[#ffdad6] text-[#ba1a1a] px-2 py-1 rounded text-[10px] font-bold">小师妹好感度 -15</span>
              <span className="bg-[#EEF2FF] text-[#4648d4] px-2 py-1 rounded text-[10px] font-bold">你的戒备心 +20</span>
            </div>
          </div>
        </section>

        {/* Highlight Quote */}
        <section className="bg-gradient-to-br from-[#EEF2FF] to-[#e1e0ff] rounded-3xl p-5 border border-[#c0c1ff] relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Lightbulb size={100} />
          </div>
          <h3 className="font-bold text-[#4648d4] mb-2 relative z-10">高光台词 (Highlight)</h3>
          <p className="text-lg font-bold text-[#191c1e] leading-snug relative z-10 italic">
            "I think it's better for us to keep some distance."
          </p>
          <p className="text-xs text-[#464554] mt-1 relative z-10">我觉得我们还是保持一点距离比较好。</p>
        </section>

        {/* Learned Phrases */}
        <section>
          <h3 className="font-bold text-[#191c1e] mb-3">学到的句型与词汇</h3>
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-2xl p-4 border border-[#e0e3e5] shadow-sm flex justify-between items-center">
              <div>
                <div className="text-sm font-bold text-[#191c1e]">keep some distance</div>
                <div className="text-[11px] text-[#464554]">保持一点距离</div>
              </div>
              <button className="text-[#4648d4] hover:opacity-80 active:scale-95"><BookmarkPlus size={20} /></button>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#e0e3e5] shadow-sm flex justify-between items-center">
              <div>
                <div className="text-sm font-bold text-[#191c1e]">Why are you avoiding me?</div>
                <div className="text-[11px] text-[#464554]">你为什么要躲着我？</div>
              </div>
              <button className="text-[#4648d4] hover:opacity-80 active:scale-95"><BookmarkPlus size={20} /></button>
            </div>
          </div>
        </section>

      </main>

      {/* Bottom Action Area */}
      <div className="fixed bottom-0 left-0 w-full p-5 bg-gradient-to-t from-[#f7f9fb] via-[#f7f9fb]/90 to-transparent pb-[env(safe-area-inset-bottom,20px)] z-40 flex gap-3">
        <button className="flex-1 h-12 bg-white text-[#4648d4] border border-[#e0e3e5] rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <Download size={16} /> 保存到资产
        </button>
        <button 
          onClick={() => navigate('/game')}
          className="flex-1 h-12 bg-[#4648d4] text-white rounded-xl text-sm font-bold shadow-[0_4px_14px_rgba(70,72,212,0.3)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          继续下一章
        </button>
      </div>
    </div>
  );
}
