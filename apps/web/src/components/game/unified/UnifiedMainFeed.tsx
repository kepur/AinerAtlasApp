import { Volume2, Sparkles, CheckCheck, List, Puzzle } from "lucide-react";

export default function UnifiedMainFeed({ mode }: { mode?: string }) {
  const isTurtleSoup = mode === "turtle_soup";

  return (
    <div className="flex-1 w-full px-4 pt-4 pb-48 overflow-y-auto no-scrollbar flex flex-col gap-4 relative">
      {/* Background Watermark/Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#8b5cf6]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#6366f1]/5 rounded-full blur-3xl"></div>
        {/* Bamboo Watermark Image */}
        <div 
          className="absolute inset-0 opacity-10 bg-no-repeat bg-cover bg-center" 
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1596700570760-706f977bd1df?auto=format&fit=crop&q=80&w=800)' }}
        />
        <div className="absolute inset-0 bg-white/70"></div>
      </div>

      <div className="relative z-10 flex flex-col gap-4 w-full">
        {isTurtleSoup ? (
          <>
            {/* Turtle Soup: Story Reveal Card */}
            <div className="w-full bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden">
              <div className="flex gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0 font-extrabold text-xl shadow-inner border border-[#ede9fe]">
                  ??
                </div>
                <div className="flex-1">
                  <p className="text-[#111827] font-extrabold text-base leading-snug">一个男人走进餐厅，点了一碗海龟汤，喝了一口后突然崩溃自杀。为什么？</p>
                </div>
                <div className="w-20 h-20 shrink-0 opacity-80 -mt-2 -mr-2">
                  <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=200&h=200" alt="Soup" className="w-full h-full object-cover rounded-full shadow-sm opacity-60" style={{ mixBlendMode: 'multiply' }} />
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-[#f8f9fc] rounded-xl p-2 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6b7280]">已发现线索 2/6</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center text-[10px]">✓</div>
                    <div className="w-4 h-4 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center text-[10px]">✓</div>
                    <div className="w-4 h-4 rounded-full bg-gray-200"></div>
                    <div className="w-4 h-4 rounded-full bg-gray-200"></div>
                    <div className="w-4 h-4 rounded-full bg-gray-200"></div>
                    <div className="w-4 h-4 rounded-full bg-gray-200"></div>
                  </div>
                </div>
                <button className="flex items-center gap-1 px-3 py-1 bg-[#f5f3ff] text-[#8b5cf6] text-[10px] font-bold rounded-lg border border-[#ede9fe]">
                  <List size={12} /> 查看线索
                </button>
              </div>
            </div>

            {/* Turtle Soup: User Message */}
            <div className="w-full flex justify-end gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col items-end max-w-[75%]">
                <div className="bg-[#6366f1] text-white rounded-[20px] rounded-tr-[4px] p-3.5 shadow-md">
                  <p className="text-sm font-bold leading-relaxed">他以前喝过这个汤吗？</p>
                </div>
                <div className="flex items-center gap-1 mt-1 mr-1 text-[#9ca3af]">
                  <span className="text-[9px]">23:04</span>
                  <CheckCheck size={12} className="text-[#8b5cf6]" />
                </div>
              </div>
            </div>

            {/* Turtle Soup: AI Message */}
            <div className="w-full flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-100 bg-white flex items-center justify-center text-[24px]">
                🤖
              </div>
              <div className="flex flex-col max-w-[75%]">
                <div className="bg-white rounded-[20px] rounded-tl-[4px] p-3 shadow-sm border border-gray-100 flex items-center gap-2">
                  <p className="text-sm font-bold text-[#111827]">Yes.</p>
                  <button className="w-5 h-5 rounded-full bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] hover:bg-[#ede9fe] transition-colors">
                    <Volume2 size={10} />
                  </button>
                </div>
                <span className="text-[9px] text-[#9ca3af] ml-1 mt-1">23:04</span>
              </div>
            </div>

            {/* Turtle Soup: Clue Message */}
            <div className="w-full flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-10 h-10 rounded-full bg-[#f5f3ff] flex items-center justify-center shrink-0 shadow-sm border border-[#ede9fe] text-[#8b5cf6]">
                <Puzzle size={20} className="fill-current" />
              </div>
              <div className="flex flex-col max-w-[75%]">
                <div className="bg-white rounded-[20px] rounded-tl-[4px] p-3 shadow-sm border border-[#ede9fe]">
                  <p className="text-sm font-bold text-[#8b5cf6] mb-0.5">线索：与过去经历有关</p>
                  <p className="text-[10px] text-[#6b7280]">这个线索可以帮助你缩小范围哦！</p>
                </div>
                <span className="text-[9px] text-[#9ca3af] ml-1 mt-1">23:04</span>
              </div>
            </div>

            {/* Turtle Soup: User Message 2 */}
            <div className="w-full flex justify-end gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col items-end max-w-[75%]">
                <div className="bg-[#6366f1] text-white rounded-[20px] rounded-tr-[4px] p-3.5 shadow-md">
                  <p className="text-sm font-bold leading-relaxed">那这碗汤和他过去发生的事有关吗？</p>
                </div>
                <div className="flex items-center gap-1 mt-1 mr-1 text-[#9ca3af]">
                  <span className="text-[9px]">23:05</span>
                  <CheckCheck size={12} className="text-[#8b5cf6]" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Story Dialogue Narrator */}
            <div className="w-full flex justify-center my-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm text-sm text-[#4b5563] italic">
                <div className="w-6 h-6 rounded-full bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6]">
                  <Sparkles size={12} />
                </div>
                <span>夜色渐深，后山竹林里，小师妹追上了你......</span>
              </div>
            </div>

            {/* Character Message 1 */}
            <div className="w-full flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-100">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7H5IaItFs9IvhQ7dC66eIQTdsOgfBiW_TuNQKLgKAOarXopyy5IEohZ62o5FUkXDGr7l1JhCNVxadiO6FuzbGqOrenDZskk0WWMB-kWGiZCGbU9zEfERZnm6f2Jqbsz-8ZdkwgKSF8zMeGiuWOx3k5gT0g6q00ocL1D0pq55SUaTYn-HZcX2IwwPDWAsh_ku9NUi7ed50_3li5FMxlfdxsx0EXvU0VVuP40-BRkvl-WzD59R4BBYQfCnNjOfF98Aw8w0Qg0nN8Nzh" alt="小师妹" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col max-w-[75%]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#8b5cf6] ml-1">小师妹</span>
                  <button className="w-5 h-5 rounded-full bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] hover:bg-[#ede9fe] transition-colors">
                    <Volume2 size={10} />
                  </button>
                </div>
                <div className="bg-white rounded-[20px] rounded-tl-[4px] p-3.5 shadow-sm border border-gray-100">
                  <p className="text-sm text-[#111827] leading-relaxed">师兄，你最近为什么总是避着我？</p>
                </div>
                <span className="text-[9px] text-[#9ca3af] ml-1 mt-1">23:07</span>
              </div>
            </div>

            {/* User Message */}
            <div className="w-full flex justify-end gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col items-end max-w-[75%]">
                <div className="bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white rounded-[20px] rounded-tr-[4px] p-3.5 shadow-md relative group">
                  <p className="text-sm font-medium leading-relaxed">我觉得我们还是保持一点距离比较好。</p>
                  
                  {/* Learning Point Tag */}
                  <div className="absolute -bottom-3 left-4 bg-[#f5f3ff] text-[#8b5cf6] px-2 py-0.5 rounded-full border border-[#ede9fe] text-[9px] font-bold flex items-center gap-1 shadow-sm cursor-pointer hover:scale-105 transition-transform">
                    <Sparkles size={10} /> 8 学习点
                  </div>
                </div>
                <span className="text-[9px] text-[#9ca3af] mr-1 mt-4">23:08</span>
              </div>
            </div>

            {/* Character Message 2 */}
            <div className="w-full flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-100">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7H5IaItFs9IvhQ7dC66eIQTdsOgfBiW_TuNQKLgKAOarXopyy5IEohZ62o5FUkXDGr7l1JhCNVxadiO6FuzbGqOrenDZskk0WWMB-kWGiZCGbU9zEfERZnm6f2Jqbsz-8ZdkwgKSF8zMeGiuWOx3k5gT0g6q00ocL1D0pq55SUaTYn-HZcX2IwwPDWAsh_ku9NUi7ed50_3li5FMxlfdxsx0EXvU0VVuP40-BRkvl-WzD59R4BBYQfCnNjOfF98Aw8w0Qg0nN8Nzh" alt="小师妹" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col max-w-[75%]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#8b5cf6] ml-1">小师妹</span>
                  <button className="w-5 h-5 rounded-full bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] hover:bg-[#ede9fe] transition-colors">
                    <Volume2 size={10} />
                  </button>
                </div>
                <div className="bg-white rounded-[20px] rounded-tl-[4px] p-3.5 shadow-sm border border-gray-100">
                  <p className="text-sm text-[#111827] leading-relaxed">是我做错了什么吗？</p>
                </div>
                <span className="text-[9px] text-[#9ca3af] ml-1 mt-1">23:09</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
