import { useState } from "react";

type RoleCardProps = {
  isFaceUp: boolean;
  role?: string;
  camp?: string;
  ability?: string;
  goal?: string;
  isUser?: boolean;
  playerName?: string;
  onClick?: () => void;
};

export default function RoleCard({ isFaceUp, role, camp, ability, goal, isUser, playerName, onClick }: RoleCardProps) {
  const isWolf = role === "狼人";

  return (
    <div 
      className={`perspective-1000 cursor-pointer transition-transform hover:scale-105 ${isUser ? 'w-48 h-72' : 'w-20 h-28'}`}
      onClick={onClick}
    >
      <div 
        className={`relative w-full h-full duration-700 transform-style-3d ${isFaceUp ? 'rotate-y-180' : ''}`}
      >
        {/* Back of Card */}
        <div className={`absolute inset-0 backface-hidden bg-gradient-to-br from-[#1a1140] to-[#0b0a1f] border-2 border-white/20 rounded-xl flex flex-col items-center justify-center ${isUser ? 'shadow-[0_0_20px_rgba(124,92,255,0.4)] border-[#7c5cff]/50' : ''}`}>
          <div className="w-8 h-8 border border-dashed border-[#7c5cff]/50 rounded-full flex items-center justify-center mb-2">
            <span className="text-[#7c5cff] text-sm">?</span>
          </div>
          {playerName && (
            <span className="text-[10px] text-white/50">{playerName}</span>
          )}
          {isUser && !isFaceUp && (
            <div className="absolute -bottom-10 text-sm text-[#7c5cff] animate-bounce whitespace-nowrap">
              点击翻开你的身份牌
            </div>
          )}
        </div>

        {/* Front of Card */}
        <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2 ${isWolf ? 'border-red-500/50 bg-gradient-to-br from-[#2a0808] to-[#1a0505]' : 'border-[#4edea3]/50 bg-gradient-to-br from-[#052a1a] to-[#021a10]'} flex flex-col items-center justify-start p-4 shadow-2xl`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mt-2 ${isWolf ? 'bg-red-500/20 text-red-400' : 'bg-[#4edea3]/20 text-[#4edea3]'}`}>
            <span className="text-3xl">{isWolf ? '🐺' : '👨‍🌾'}</span>
          </div>
          
          <h3 className={`text-2xl font-bold mb-1 ${isWolf ? 'text-red-400' : 'text-[#4edea3]'}`}>{role}</h3>
          <span className="text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-full mb-4">阵营：{camp}</span>
          
          <div className="flex flex-col w-full gap-2 text-left mt-2">
            <div className="bg-black/30 p-2 rounded text-xs">
              <span className="text-white/50 block mb-0.5">目标</span>
              <span className="text-white">{goal}</span>
            </div>
            <div className="bg-black/30 p-2 rounded text-xs">
              <span className="text-white/50 block mb-0.5">能力</span>
              <span className="text-white">{ability}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
