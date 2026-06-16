import { useNavigate } from "react-router-dom";
import { Star, Settings, Mic, MicOff, Crown, MessageSquare, HelpCircle, FileText, BarChart2, MoreHorizontal, Bookmark, Volume2, ChevronRight, Play, Lightbulb, ArrowLeft } from "lucide-react";

export default function PartyRoom() {
  const navigate = useNavigate();

  return (
    <div className="premium w-full h-full bg-[#0b0c10] text-[#e2e8f0] flex flex-col relative overflow-hidden font-sans">
      
      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] bg-[#1f2937]/90 backdrop-blur-md shrink-0 flex items-center justify-between h-16 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white/80 bg-white/5 backdrop-blur-md rounded-full hover:bg-white/20 border border-white/10 transition-colors shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[#8b5cf6] flex items-center justify-center shadow-lg">
            <Star className="text-white fill-white" size={20} />
          </div>
          <div className="flex flex-col">
            <div className="font-bold text-white text-[14px] flex items-center gap-1.5">
              房间: 侦探之夜 #1024
            </div>
            <div className="text-[10px] text-white/50 flex items-center gap-1.5 mt-0.5">
              <span>ID: 1024</span>
              <span>|</span>
              <span>6/8 人</span>
              <span>|</span>
              <span>English</span>
            </div>
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[11px] text-white/80 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
          <Settings size={12} /> 规则
        </button>
      </header>

      {/* Horizontal Players List (Mobile adapted) */}
      <section className="bg-[#111827] border-b border-white/5 py-3 shrink-0">
        <div className="px-4 text-[11px] font-bold text-white/80 mb-2 flex justify-between items-center">
          <span>玩家列表</span>
          <span className="text-[10px] text-[#8b5cf6] font-normal cursor-pointer flex items-center">展开 <ChevronRight size={12} /></span>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 pb-1">
          {[
            { name: 'Alice (你)', role: '侦探', roleColor: 'bg-[#8b5cf6]', mic: true, host: true, img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100' },
            { name: 'Bob', role: '侦探', roleColor: 'bg-[#8b5cf6]', mic: false, host: false, img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100&h=100' },
            { name: 'Cindy', role: '侦探', roleColor: 'bg-[#8b5cf6]', mic: true, host: false, img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100' },
            { name: 'David', role: '侦探', roleColor: 'bg-[#8b5cf6]', mic: false, host: false, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100&h=100' },
            { name: 'Eva', role: '旁观', roleColor: 'bg-gray-500', mic: false, host: false, img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100&h=100' },
          ].map((player, i) => (
            <div key={i} className="flex flex-col items-center gap-1 shrink-0 relative">
              <div className="relative">
                <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${player.mic ? 'border-[#10b981]' : 'border-white/10'}`}>
                  <img src={player.img} alt={player.name} className="w-full h-full object-cover opacity-90" />
                </div>
                {player.host && (
                  <div className="absolute -top-2 -right-1 text-yellow-400 drop-shadow-md">
                    <Crown size={14} className="fill-yellow-400" />
                  </div>
                )}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${player.mic ? 'bg-[#10b981]' : 'bg-gray-600'} text-white border border-[#111827]`}>
                  {player.mic ? <Mic size={8} /> : <MicOff size={8} />}
                </div>
              </div>
              <div className="text-[10px] font-bold text-white/90 truncate max-w-[50px]">{player.name}</div>
              <div className={`text-[8px] px-1.5 py-0.5 rounded text-white ${player.roleColor}`}>{player.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Chat Area */}
      <main className="flex-1 w-full overflow-y-auto px-4 pt-4 pb-48 flex flex-col gap-4 no-scrollbar bg-[#0b0c10]">
        
        {/* System/Host Message */}
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1e1b4b] border border-[#8b5cf6]/30 flex items-center justify-center shrink-0">
            🤖
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[10px] text-white/50">AI Host</span>
            <div className="bg-[#1f2937] p-3 rounded-2xl rounded-tl-sm border border-white/5 text-[12px] text-white/80 leading-relaxed">
              欢迎来到侦探之夜！本案：咖啡馆的谎言<br/>
              当前阶段：白天讨论阶段 (第 1 轮)<br/>
              现在轮到 <span className="text-[#8b5cf6] font-bold">Alice</span> 发言或提问。
            </div>
          </div>
        </div>

        {/* Player Message */}
        <div className="flex gap-2 flex-row-reverse">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Alice" />
          </div>
          <div className="flex flex-col gap-1 items-end flex-1">
            <span className="text-[10px] text-[#8b5cf6] font-bold">Alice (你)</span>
            <div className="bg-[#8b5cf6] p-3 rounded-2xl rounded-tr-sm text-[12px] text-white leading-relaxed">
              我想问 Anna，你最后一次见到老板是什么时候？
            </div>
          </div>
        </div>

        {/* AI Suspect Message */}
        <div className="flex gap-2">
           <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-red-500/30">
            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Anna" className="opacity-80" />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[10px] text-red-400">Anna (AI 嫌疑人)</span>
            <div className="bg-[#450a0a]/40 p-3 rounded-2xl rounded-tl-sm border border-red-500/20 text-[12px] text-white/90 leading-relaxed flex gap-2 items-center">
              <Play size={14} className="text-red-400 shrink-0" />
              大概 9 点左右，我看到他从办公室出来。
            </div>
          </div>
        </div>

        {/* Player Message */}
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
            <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100&h=100" alt="Bob" />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[10px] text-white/50">Bob</span>
            <div className="bg-[#1f2937] p-3 rounded-2xl rounded-tl-sm border border-white/5 text-[12px] text-white/80 leading-relaxed">
              我觉得 Mark 有问题，他的证词有矛盾。
            </div>
          </div>
        </div>

        {/* System Message with Clue */}
        <div className="flex justify-center my-2">
          <div className="bg-[#1e1b4b] border border-[#8b5cf6]/30 px-3 py-1.5 rounded-full text-[10px] text-[#c4b5fd]">
            Cindy 请求查看线索：<span className="font-bold text-white">湿伞</span>
          </div>
        </div>

      </main>

      {/* Bottom Panel (Fixed) */}
      <div className="absolute bottom-0 w-full bg-[#111827] border-t border-white/5 rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50 flex flex-col pb-[env(safe-area-inset-bottom,16px)]">
        
        {/* Turn indicator */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-white/5 bg-[#1f2937]/50">
          <div className="flex items-center gap-2 text-[12px] text-white/80">
            <div className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-pulse"></div>
            当前轮到: <span className="font-bold text-white">David</span>
          </div>
          <div className="flex items-center gap-3">
             <span className="font-mono text-[#10b981] font-bold text-sm">00:45</span>
             <button className="bg-[#8b5cf6] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
               结束发言
             </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-4 flex flex-col gap-3">
           <div className="text-[10px] text-white/50 font-bold px-1">操作面板</div>
           <div className="flex justify-between">
             {[
               { icon: <Mic size={20} />, label: '发言', active: true },
               { icon: <HelpCircle size={20} />, label: '提问', active: false },
               { icon: <FileText size={20} />, label: '查看线索', active: false },
               { icon: <BarChart2 size={20} />, label: '投票', active: false },
               { icon: <MoreHorizontal size={20} />, label: '更多', active: false },
             ].map((action, i) => (
               <button key={i} className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform bg-transparent outline-none">
                 <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors ${action.active ? 'bg-[#8b5cf6] text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 'bg-[#1f2937] text-white/70 border border-white/5 group-hover:bg-[#374151]'}`}>
                   {action.icon}
                 </div>
                 <span className={`text-[10px] ${action.active ? 'text-white font-bold' : 'text-white/60'}`}>{action.label}</span>
               </button>
             ))}
           </div>
        </div>

        {/* Learning Assistant Miniature */}
        <div className="mx-4 mb-2 bg-gradient-to-r from-[#1f2937] to-[#111827] border border-[#8b5cf6]/20 rounded-xl p-3 flex items-center justify-between shadow-lg">
          <div className="flex flex-col gap-1">
             <div className="text-[9px] text-[#c4b5fd] font-bold flex items-center gap-1">
               <Lightbulb size={10} /> 你的学习助手 (仅自己可见)
             </div>
             <div className="text-[13px] font-bold text-white">Can you explain why...?</div>
             <div className="text-[10px] text-white/50">用于礼貌地要求对方解释原因</div>
          </div>
          <div className="flex flex-col gap-2">
            <button className="text-yellow-500 hover:text-yellow-400 transition-colors"><Bookmark size={16} /></button>
            <button className="text-white/50 hover:text-white transition-colors"><Volume2 size={16} /></button>
          </div>
        </div>

      </div>
    </div>
  );
}
