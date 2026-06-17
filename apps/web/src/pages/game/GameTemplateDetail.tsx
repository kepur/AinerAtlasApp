import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, AlertTriangle, BadgeAlert, HelpCircle, GraduationCap, Clock, Zap, Play } from "lucide-react";

export default function GameTemplateDetail() {
  const navigate = useNavigate();

  return (
    <div className="premium w-full min-h-full bg-[#f7f9fb] flex flex-col text-[#191c1e] relative pb-32 font-sans">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-5 h-16 pt-[env(safe-area-inset-top,20px)]">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-md shadow-sm active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} className="text-[#191c1e]" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-md shadow-sm active:scale-95 transition-transform">
          <Share2 size={20} className="text-[#191c1e]" />
        </button>
      </header>

      {/* Cover Image & Title Section */}
      <section className="relative w-full h-[486px] max-h-[500px]">
        <img 
          alt="Immersive cover art" 
          className="absolute inset-0 w-full h-full object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZlFZQMM21gzuCqg6ZrHEs4Zj4SlTbGQe3EUZXH3c0OKViHpLAFezHanubs7RCpOVCOimlmSL8o2TyGRoN5r3Ti0h67aqOZrosbj9okfLhOSbS9IE5dnq4A-44zrBr8tkHd0ZIV1jaGo727moTZdc9J2cQJh-r9YG3gEED3b8ocLbsBn1vdYMmu7VWDNYdfNUPbWk8BamHOJNw8RrAqCDHiElKTCLLzd6tDz6ef8jhUxfAVrlJg9ldwId9VEM0HC-v3Gs2Nef5Z908" 
        />
        {/* Glassmorphism Title Overlay */}
        <div className="absolute inset-x-0 bottom-0 pt-24 pb-6 px-5" style={{ background: 'linear-gradient(to top, rgba(25, 28, 30, 0.9) 0%, rgba(25, 28, 30, 0.4) 50%, transparent 100%)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 rounded bg-[#4648d4]/80 backdrop-blur-sm text-white text-xs font-medium">Roleplay Adventure</span>
            <span className="px-2 py-1 rounded bg-[#10B981]/80 backdrop-blur-sm text-white text-xs font-medium">Level C1</span>
          </div>
          <h1 className="text-4xl text-white font-extrabold leading-tight shadow-sm mb-1">《青云重生》</h1>
          <p className="text-lg text-[#e0e3e5] shadow-sm">Qingyun Rebirth</p>
        </div>
      </section>

      <main className="px-5 pt-6 flex flex-col gap-6">
        {/* Background Description */}
        <section>
          <h2 className="text-xl font-bold text-[#191c1e] mb-2">
            故事背景 <span className="text-xs text-[#767586] ml-1 font-normal">Background</span>
          </h2>
          <p className="text-base text-[#464554] leading-relaxed">
            你曾是青云宗备受瞩目的天才大弟子，却在上一世惨遭同门背叛。如今重活一世，你带着前世记忆归来，是选择复仇，还是守护？
          </p>
        </section>

        {/* Identity & Conflict Card */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-5 border-l-4 border-l-[#3B82F6] shadow-sm">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#d8e2ff] flex items-center justify-center shrink-0">
              <BadgeAlert size={20} className="text-[#0058be]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191c1e]">你的身份 <span className="text-xs text-[#767586] font-normal">Identity</span></h3>
              <p className="text-base text-[#464554] mt-1">青云宗大弟子 (Eldest Disciple of Qingyun Sect)</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-[#ba1a1a]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191c1e]">核心冲突 <span className="text-xs text-[#767586] font-normal">Conflict</span></h3>
              <p className="text-base text-[#464554] mt-1">你知道背叛的真相，但他们不知道。(You know the truth of the betrayal, but they don't.)</p>
            </div>
          </div>
        </div>

        {/* Characters Selection */}
        <section>
          <h2 className="text-xl font-bold text-[#191c1e] mb-3">
            关键人物 <span className="text-xs text-[#767586] ml-1 font-normal">Characters</span>
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x -mx-5 px-5 no-scrollbar">
            <div className="snap-start shrink-0 flex flex-col items-center w-20">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#e0e3e5] shadow-sm mb-2 relative">
                <img alt="小师妹" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7H5IaItFs9IvhQ7dC66eIQTdsOgfBiW_TuNQKLgKAOarXopyy5IEohZ62o5FUkXDGr7l1JhCNVxadiO6FuzbGqOrenDZskk0WWMB-kWGiZCGbU9zEfERZnm6f2Jqbsz-8ZdkwgKSF8zMeGiuWOx3k5gT0g6q00ocL1D0pq55SUaTYn-HZcX2IwwPDWAsh_ku9NUi7ed50_3li5FMxlfdxsx0EXvU0VVuP40-BRkvl-WzD59R4BBYQfCnNjOfF98Aw8w0Qg0nN8Nzh" />
                <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm flex justify-center py-0.5">
                  <HelpCircle size={12} className="text-white" />
                </div>
              </div>
              <span className="text-xs text-[#191c1e] text-center leading-tight font-medium">小师妹<br/><span className="text-[#767586] font-normal text-[10px]">Confused</span></span>
            </div>
            
            <div className="snap-start shrink-0 flex flex-col items-center w-20">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#e0e3e5] shadow-sm mb-2 relative">
                <img alt="师尊" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHWySkvpfvpTyRqYWC4BcqvUFWiygooLuyLBbEINeo-j5pXk63Fc8vbR7lMvHQXxx1DYn8JeFL-BfJDOPFvYvlquLgR3GudWyJOGOZ0Yw-uZlrJolmxG-5-zHbWsFil40JMvhlQWon4-xi7rkQSrzqCT41Wec6xkVyyUGLQ4jgA9KKBsg2QQrJYuwrji96hCQP_fl7hJfP68Tws7g15F3jY1l6MW0nRUskxTxwHZ8zHBAjZJYwplVHCaUubg01LqLm83DHDsvNalN5" />
              </div>
              <span className="text-xs text-[#191c1e] text-center leading-tight font-medium">师尊<br/><span className="text-[#767586] font-normal text-[10px]">Strict</span></span>
            </div>
            
            <div className="snap-start shrink-0 flex flex-col items-center w-20">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#e0e3e5] shadow-sm mb-2 relative">
                <img alt="反派师兄" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXdhp0Wy80hSFVSib8Y-Brmtv324B5n3sxDLZkwGv1ETAKMaUKMmtJO5C0IUS1zmovxb5gKE-XpaHGUMC37KfVSiaed5p-eEmiLcl6Xwsmn0BFHRqP4kekm5dSImPDypnLoQrE4Y1AC9ZBh0j87lLwiC5UPtEfC_Wf7z_isiHEIMJuf9yXpeWOJi5EO5lIKsUx4kyJjNUuoBQciGBirCZkdGVwnZ5MOh1ssDaIPUIBjX92Xn60rNhLVpT8ytWj8nsVTi6EHTtApx3z" />
              </div>
              <span className="text-xs text-[#191c1e] text-center leading-tight font-medium">反派师兄<br/><span className="text-[#767586] font-normal text-[10px]">Hidden</span></span>
            </div>
          </div>
        </section>

        {/* Learning Goals Bento Card */}
        <div className="bg-[#EEF2FF] rounded-3xl p-5 border border-[#e1e0ff]">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap size={20} className="text-[#4648d4]" />
            <h3 className="text-sm font-bold text-[#4648d4]">学习重点 <span className="text-xs text-[#4648d4]/70 font-normal">Learning Goals</span></h3>
          </div>
          <ul className="flex flex-col gap-2 text-base text-[#464554]">
            <li className="flex items-start gap-2">
              <span className="text-[#4648d4] font-bold">1.</span>
              <span>情绪化表达与心理博弈 (Emotional expression & psychological games)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4648d4] font-bold">2.</span>
              <span>正式与非正式社交拒绝 (Formal & informal social rejection)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4648d4] font-bold">3.</span>
              <span>复杂因果关系句型 (Complex causal sentence structures)</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Bottom Fixed Actions */}
      <div className="fixed bottom-0 left-0 w-full bg-[#f7f9fb]/90 backdrop-blur-xl border-t border-[#e0e3e5] px-5 py-4 pb-[env(safe-area-inset-bottom,20px)] z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2 bg-[#f2f4f6] p-1 rounded-full">
            <button className="px-4 py-1.5 rounded-full bg-white shadow-sm text-xs font-semibold text-[#191c1e] transition-all">Text Mode</button>
            <button className="px-4 py-1.5 rounded-full text-[#464554] text-xs font-semibold hover:text-[#191c1e] transition-all">Voice Mode</button>
          </div>
          <div className="flex gap-2 bg-[#f2f4f6] p-1 rounded-full">
            <button className="px-4 py-1.5 rounded-full bg-white shadow-sm text-xs font-semibold text-[#191c1e] transition-all">Solo</button>
            <button className="px-4 py-1.5 rounded-full text-[#464554] text-xs font-semibold hover:text-[#191c1e] transition-all">Party</button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-[#464554] flex items-center gap-1">
              <Clock size={14} /> 15-20 mins
            </span>
            <span className="text-xs text-[#464554] flex items-center gap-1">
              <Zap size={14} /> AI Cost: Medium
            </span>
          </div>
          <button 
            onClick={() => navigate('/game/universal/qingyun-ch1')}
            className="flex-1 bg-[#4648d4] hover:bg-[#2f2ebe] active:scale-95 transition-all text-white text-lg font-bold h-14 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(70,72,212,0.4)] relative overflow-hidden group"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-white/20"></div>
            <Play size={20} className="group-hover:translate-x-1 transition-transform fill-white" />
            <span>开始故事</span>
          </button>
        </div>
      </div>
    </div>
  );
}
