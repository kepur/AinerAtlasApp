import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Plus, RefreshCcw } from "lucide-react";

export default function CustomStoryBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"input" | "generated">("input");
  const [text, setText] = useState("我是青云宗大弟子，上一世被小师妹背叛，落得个魂飞魄散的下场。\n这一世重生归来，我要改变命运，守护所爱之人。");

  const handleBack = () => {
    if (step === "generated") {
      setStep("input");
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-16 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top,20px)] border-b border-gray-100 shrink-0">
        <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center text-[#111827] rounded-full hover:bg-gray-50 transition-colors border border-gray-200">
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <div className="font-extrabold text-[#111827] text-base">
            {step === 'input' ? '自定义故事线' : 'AI 生成的故事设定'}
          </div>
          <div className="text-[10px] text-[#6b7280]">
            {step === 'input' ? '输入你的故事设定，AI 帮你展开精彩剧情' : '请确认或修改以下设定'}
          </div>
        </div>
        {step === 'input' ? (
          <button className="w-8 h-8 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center hover:bg-[#ede9fe] transition-colors">
            <HelpCircle size={16} />
          </button>
        ) : (
           <button className="text-[#8b5cf6] text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform">
            重新生成 <RefreshCcw size={12} />
          </button>
        )}
      </header>

      <main className="flex-1 w-full overflow-y-auto pb-32 px-4 pt-4 flex flex-col gap-6 no-scrollbar">
        {step === 'input' ? (
          <>
            {/* Input Section */}
            <section className="flex flex-col gap-2">
              <h3 className="font-bold text-[#111827] text-sm">输入你的故事设定</h3>
              <div className="relative w-full">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="请输入故事设定..."
                  className="w-full h-40 rounded-2xl border border-gray-200 p-4 text-sm text-[#111827] resize-none focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] shadow-sm leading-relaxed"
                ></textarea>
                <div className="absolute bottom-3 right-4 text-[10px] text-[#9ca3af]">
                  {text.length}/500
                </div>
              </div>
            </section>

            {/* Tags Section */}
            <section className="flex flex-col gap-2">
              <h3 className="font-bold text-[#111827] text-sm">添加设定 <span className="text-[#9ca3af] font-normal text-xs">(可选)</span></h3>
              <div className="flex flex-wrap gap-2">
                {['世界观', '主要角色', '核心冲突', '特殊设定'].map(tag => (
                  <span key={tag} className="bg-white text-[#4b5563] px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
                    {tag}
                  </span>
                ))}
                <button className="bg-[#f5f3ff] text-[#8b5cf6] px-3 py-1.5 rounded-full text-xs font-bold border border-[#ede9fe] shadow-sm flex items-center gap-1 cursor-pointer hover:bg-[#ede9fe] transition-colors">
                  <Plus size={14} /> 添加
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Generated Card */}
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4">
              <div className="flex p-4 gap-4">
                {/* Image */}
                <div className="w-32 h-48 rounded-xl overflow-hidden relative shrink-0 shadow-sm">
                  <div className="absolute top-2 left-2 bg-[#8b5cf6] text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm bg-opacity-90">
                    仙侠玄幻
                  </div>
                  <img src="https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?auto=format&fit=crop&q=80&w=300&h=450" alt="Cover" className="w-full h-full object-cover" />
                </div>
                
                {/* Info List */}
                <div className="flex-1 flex flex-col gap-3 justify-center">
                  <div>
                    <div className="text-[10px] text-[#9ca3af] font-bold mb-0.5">故事名</div>
                    <div className="text-sm font-extrabold text-[#111827]">重生之青云逆天</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9ca3af] font-bold mb-0.5">世界观</div>
                    <div className="text-[11px] text-[#4b5563]">修仙世界 · 青云宗 · 门派纷争</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9ca3af] font-bold mb-0.5">你的身份</div>
                    <div className="text-[11px] text-[#8b5cf6] font-bold">青云宗大弟子 (重生者)</div>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 flex flex-col gap-3">
                {/* Characters */}
                <div>
                  <div className="text-[10px] text-[#9ca3af] font-bold mb-1.5">主要角色</div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar">
                    {[
                      { name: '小师妹 (苏珺)', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7H5IaItFs9IvhQ7dC66eIQTdsOgfBiW_TuNQKLgKAOarXopyy5IEohZ62o5FUkXDGr7l1JhCNVxadiO6FuzbGqOrenDZskk0WWMB-kWGiZCGbU9zEfERZnm6f2Jqbsz-8ZdkwgKSF8zMeGiuWOx3k5gT0g6q00ocL1D0pq55SUaTYn-HZcX2IwwPDWAsh_ku9NUi7ed50_3li5FMxlfdxsx0EXvU0VVuP40-BRkvl-WzD59R4BBYQfCnNjOfF98Aw8w0Qg0nN8Nzh' },
                      { name: '师父 (玄清子)', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100&h=100' },
                      { name: '师兄 (凌霄)', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100&h=100' }
                    ].map((char, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-full pr-3 p-1 border border-gray-100 shrink-0">
                        <img src={char.img} alt={char.name} className="w-5 h-5 rounded-full object-cover" />
                        <span className="text-[10px] text-[#4b5563] font-medium">{char.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conflict */}
                <div>
                  <div className="text-[10px] text-[#9ca3af] font-bold mb-0.5">核心冲突</div>
                  <div className="text-[11px] text-[#4b5563] leading-relaxed">
                    上一世被小师妹背叛，这一世你要改变命运，守护宗门与所爱之人。
                  </div>
                </div>

                {/* Learning Focus */}
                <div>
                  <div className="text-[10px] text-[#9ca3af] font-bold mb-1.5">学习重点</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['对话表达', '情感表达', '修仙词汇', '逻辑反驳'].map(tag => (
                      <span key={tag} className="bg-[#f5f3ff] text-[#8b5cf6] px-2 py-0.5 rounded text-[9px] font-bold border border-[#ede9fe]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 pb-[env(safe-area-inset-bottom,16px)] z-50">
        {step === 'input' ? (
          <button 
            onClick={() => setStep('generated')}
            className="w-full h-12 rounded-2xl bg-[#8b5cf6] text-white font-bold text-sm shadow-md hover:bg-[#7c3aed] transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            下一步：AI 生成故事设定
          </button>
        ) : (
          <div className="flex gap-3">
             <button 
              onClick={() => setStep('input')}
              className="flex-1 h-12 rounded-2xl bg-white text-[#8b5cf6] font-bold text-sm shadow-sm border border-[#8b5cf6] hover:bg-[#f5f3ff] transition-colors active:scale-95"
            >
              修改设定
            </button>
            <button 
              onClick={() => navigate('/game/play/roleplay/custom')}
              className="flex-1 h-12 rounded-2xl bg-[#8b5cf6] text-white font-bold text-sm shadow-md hover:bg-[#7c3aed] transition-colors active:scale-95"
            >
              开始故事
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
