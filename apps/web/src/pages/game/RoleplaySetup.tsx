import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, ChevronRight, Mic, Book, MessageSquare, Sparkles, Star } from "lucide-react";

export default function RoleplaySetup() {
  const navigate = useNavigate();
  const [gameMode, setGameMode] = useState("system"); // system, custom, ai_story, free_chat
  const [storyGenre, setStoryGenre] = useState("xianxia");
  const [difficulty, setDifficulty] = useState("normal");
  const [language, setLanguage] = useState("english");

  const handleNext = () => {
    // Route to the right entry by chosen mode (instead of always custom builder).
    if (gameMode === "custom" || gameMode === "ai_story") {
      navigate("/game/custom-story-builder", { state: { genre: storyGenre, difficulty, language } });
    } else if (gameMode === "free_chat") {
      navigate("/game/roleplay/characters");
    } else {
      // system official storylines
      navigate("/game/roleplay/storylines", { state: { genre: storyGenre } });
    }
  };

  return (
    <div className="w-full h-full bg-[#f8f9fc] flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-16 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top,20px)] border-b border-gray-100 shrink-0">
        <button onClick={() => navigate('/game')} className="w-8 h-8 flex items-center justify-center text-[#111827] rounded-full hover:bg-gray-50 transition-colors border border-gray-200">
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <div className="font-extrabold text-[#111827] text-base">Roleplay Setup</div>
          <div className="text-[10px] text-[#6b7280]">创建你的专属故事体验</div>
        </div>
        <button className="w-8 h-8 rounded-full bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center hover:bg-[#ede9fe] transition-colors">
          <HelpCircle size={16} />
        </button>
      </header>

      <main className="flex-1 w-full overflow-y-auto pb-32 px-4 pt-4 flex flex-col gap-6 no-scrollbar">
        
        {/* Section 1: 选择游戏模式 */}
        <section>
          <h3 className="font-bold text-[#111827] text-sm mb-3">选择游戏模式</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Mode: System */}
            <div 
              onClick={() => setGameMode('system')}
              className={`relative p-3 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                gameMode === 'system' 
                  ? 'border-[#8b5cf6] bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe]' 
                  : 'border-transparent bg-white shadow-sm'
              }`}
            >
              <div className="absolute top-0 right-0 bg-[#8b5cf6] text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">推荐</div>
              {gameMode === 'system' && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shadow-sm">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
              <div className="w-10 h-10 mb-2">
                 <img src="https://cdn3d.iconscout.com/3d/premium/thumb/book-4993515-4160032.png" alt="Book" className="w-full h-full object-contain" />
              </div>
              <h4 className="font-bold text-[#111827] text-xs mb-1">系统固定故事线</h4>
              <p className="text-[9px] text-[#6b7280] mb-2 line-clamp-1">体验精心设计的原创剧情</p>
              <div className="flex gap-1">
                <span className="text-[8px] bg-[#ede9fe] text-[#7c3aed] px-1.5 py-0.5 rounded">剧情完整</span>
                <span className="text-[8px] bg-[#ede9fe] text-[#7c3aed] px-1.5 py-0.5 rounded">沉浸体验</span>
              </div>
            </div>

            {/* Mode: Custom */}
            <div 
              onClick={() => setGameMode('custom')}
              className={`relative p-3 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                gameMode === 'custom' 
                  ? 'border-[#8b5cf6] bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe]' 
                  : 'border-transparent bg-white shadow-sm'
              }`}
            >
              {gameMode === 'custom' && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shadow-sm">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
              <div className="w-10 h-10 mb-2">
                 <img src="https://cdn3d.iconscout.com/3d/premium/thumb/feather-pen-5168864-4323719.png" alt="Pen" className="w-full h-full object-contain" />
              </div>
              <h4 className="font-bold text-[#111827] text-xs mb-1">用户自定义故事线</h4>
              <p className="text-[9px] text-[#6b7280] mb-2 line-clamp-1">你来设定剧情，AI为你展开</p>
              <div className="flex gap-1">
                <span className="text-[8px] bg-gray-100 text-[#4b5563] px-1.5 py-0.5 rounded">高度自由</span>
                <span className="text-[8px] bg-gray-100 text-[#4b5563] px-1.5 py-0.5 rounded">专属定制</span>
              </div>
            </div>

            {/* Mode: AI Story */}
            <div 
              onClick={() => setGameMode('ai_story')}
              className={`relative p-3 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                gameMode === 'ai_story' 
                  ? 'border-[#8b5cf6] bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe]' 
                  : 'border-transparent bg-white shadow-sm'
              }`}
            >
               {gameMode === 'ai_story' && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shadow-sm">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
              <div className="w-10 h-10 mb-2">
                 <img src="https://cdn3d.iconscout.com/3d/premium/thumb/chat-bubble-4993540-4160057.png" alt="Chat" className="w-full h-full object-contain" />
              </div>
              <h4 className="font-bold text-[#111827] text-xs mb-1">AI 讲故事 + 用户回答</h4>
              <p className="text-[9px] text-[#6b7280] mb-2 line-clamp-1">AI生成故事，你选择回答</p>
              <div className="flex gap-1">
                <span className="text-[8px] bg-gray-100 text-[#4b5563] px-1.5 py-0.5 rounded">轻松休闲</span>
                <span className="text-[8px] bg-gray-100 text-[#4b5563] px-1.5 py-0.5 rounded">碎片时间</span>
              </div>
            </div>

            {/* Mode: Free Chat */}
            <div 
              onClick={() => setGameMode('free_chat')}
              className={`relative p-3 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                gameMode === 'free_chat' 
                  ? 'border-[#8b5cf6] bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe]' 
                  : 'border-transparent bg-white shadow-sm'
              }`}
            >
               {gameMode === 'free_chat' && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shadow-sm">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
              <div className="w-10 h-10 mb-2">
                 <img src="https://cdn3d.iconscout.com/3d/premium/thumb/user-avatar-4993547-4160064.png" alt="Avatars" className="w-full h-full object-contain" />
              </div>
              <h4 className="font-bold text-[#111827] text-xs mb-1">角色自由对话</h4>
              <p className="text-[9px] text-[#6b7280] mb-2 line-clamp-1">与AI角色自由聊天互动</p>
              <div className="flex gap-1">
                <span className="text-[8px] bg-gray-100 text-[#4b5563] px-1.5 py-0.5 rounded">无剧情限制</span>
                <span className="text-[8px] bg-gray-100 text-[#4b5563] px-1.5 py-0.5 rounded">随心交流</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: 选择故事类型 */}
        <section className={gameMode === 'custom' ? 'opacity-50 pointer-events-none' : ''}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-[#111827] text-sm">选择故事类型 <span className="text-[#6b7280] text-xs font-normal">(系统故事线)</span></h3>
            <span className="text-[10px] text-[#6b7280] flex items-center cursor-pointer hover:text-[#8b5cf6]">全部类型 <ChevronRight size={12} /></span>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {[
              { id: 'xianxia', name: '仙侠玄幻', img: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?auto=format&fit=crop&q=80&w=200&h=150' },
              { id: 'school', name: '校园恋爱', img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=200&h=150' },
              { id: 'city', name: '都市职场', img: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=200&h=150' },
              { id: 'mystery', name: '悬疑推理', img: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=200&h=150' },
              { id: 'history', name: '历史穿越', img: 'https://images.unsplash.com/photo-1548625361-9c6a71e1b212?auto=format&fit=crop&q=80&w=200&h=150' },
            ].map(genre => (
              <div 
                key={genre.id}
                onClick={() => setStoryGenre(genre.id)}
                className={`shrink-0 w-24 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  storyGenre === genre.id ? 'border-[#8b5cf6] shadow-md' : 'border-transparent shadow-sm'
                }`}
              >
                <div className="w-full h-16 bg-gray-200">
                  <img src={genre.img} alt={genre.name} className="w-full h-full object-cover" />
                </div>
                <div className={`py-1.5 text-center text-[11px] font-bold ${storyGenre === genre.id ? 'bg-[#f5f3ff] text-[#8b5cf6]' : 'bg-white text-[#4b5563]'}`}>
                  {genre.name}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: 选择难度 */}
        <section>
          <h3 className="font-bold text-[#111827] text-sm mb-3">选择难度</h3>
          <div className="flex gap-2">
            {[
              { id: 'easy', name: '简单', desc: '轻松体验', stars: 1 },
              { id: 'normal', name: '普通', desc: '推荐选择', stars: 3 },
              { id: 'hard', name: '困难', desc: '挑战极限', stars: 5 },
            ].map(diff => (
              <div 
                key={diff.id}
                onClick={() => setDifficulty(diff.id)}
                className={`flex-1 relative p-3 rounded-xl border-2 transition-all cursor-pointer text-center flex flex-col items-center justify-center ${
                  difficulty === diff.id ? 'border-[#8b5cf6] bg-[#f5f3ff]' : 'border-transparent bg-white shadow-sm'
                }`}
              >
                {difficulty === diff.id && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shadow-sm">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
                <div className={`font-bold text-xs mb-0.5 ${difficulty === diff.id ? 'text-[#8b5cf6]' : 'text-[#111827]'}`}>{diff.name}</div>
                <div className="text-[9px] text-[#6b7280] mb-1.5">{diff.desc}</div>
                <div className="flex gap-0.5 text-[#8b5cf6]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={8} className={i < diff.stars ? 'fill-current' : 'text-gray-300'} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: 目标语言 */}
        <section>
          <h3 className="font-bold text-[#111827] text-sm mb-3">目标语言</h3>
          <div className="flex gap-2">
            <div 
              onClick={() => setLanguage('english')}
              className={`flex-1 relative py-3 rounded-xl border-2 transition-all cursor-pointer text-center ${
                language === 'english' ? 'border-[#8b5cf6] bg-[#f5f3ff]' : 'border-transparent bg-white shadow-sm'
              }`}
            >
               {language === 'english' && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shadow-sm">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              <div className={`font-bold text-xs ${language === 'english' ? 'text-[#8b5cf6]' : 'text-[#111827]'}`}>English</div>
            </div>
            
            {['中文', '日语', '韩语'].map(lang => (
               <div key={lang} className="flex-1 py-2 rounded-xl bg-gray-50 border border-gray-100 text-center opacity-60 pointer-events-none flex flex-col justify-center">
                 <div className="font-bold text-xs text-[#9ca3af]">{lang}</div>
                 <div className="text-[8px] text-[#d1d5db]">Coming soon</div>
               </div>
            ))}
          </div>
        </section>

        {/* Section 5: 其他设置 */}
        <section className="mb-4">
          <h3 className="font-bold text-[#111827] text-sm mb-3">其他设置</h3>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3.5 border-b border-gray-50 active:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-[#4b5563]">
                <Mic size={16} className="text-[#9ca3af]" /> 语音模式
              </div>
              <div className="flex items-center gap-1 text-xs text-[#111827] font-medium">
                文字模式 <ChevronRight size={14} className="text-[#9ca3af]" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3.5 border-b border-gray-50 active:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-[#4b5563]">
                <Book size={16} className="text-[#9ca3af]" /> 学习重点
              </div>
              <div className="flex items-center gap-1 text-xs text-[#111827] font-medium">
                对话表达・词汇・语法 <ChevronRight size={14} className="text-[#9ca3af]" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3.5 active:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-[#4b5563]">
                <MessageSquare size={16} className="text-[#9ca3af]" /> 对话风格
              </div>
              <div className="flex items-center gap-1 text-xs text-[#111827] font-medium">
                自然口语 <ChevronRight size={14} className="text-[#9ca3af]" />
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 pb-[env(safe-area-inset-bottom,16px)] flex items-center justify-between z-50">
        <button className="flex items-center gap-1.5 px-4 h-12 rounded-2xl bg-[#f5f3ff] text-[#8b5cf6] font-bold text-sm shadow-sm hover:bg-[#ede9fe] transition-colors active:scale-95">
          <Sparkles size={16} /> 智能推荐
        </button>
        <div className="text-[10px] text-[#9ca3af] font-medium text-center flex-1">下一步：创建故事</div>
        <button onClick={handleNext} className="px-8 h-12 rounded-2xl bg-[#8b5cf6] text-white font-bold text-sm shadow-md hover:bg-[#7c3aed] transition-colors active:scale-95">
          下一步
        </button>
      </div>
    </div>
  );
}
