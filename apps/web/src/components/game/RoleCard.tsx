type RoleCardProps = {
  isFaceUp: boolean;
  role?: string;
  camp?: string;
  ability?: string;
  goal?: string;
  roleEn?: string;
  roleZh?: string;
  campEn?: string;
  campZh?: string;
  abilityEn?: string;
  abilityZh?: string;
  goalEn?: string;
  goalZh?: string;
  emoji?: string;
  isUser?: boolean;
  playerName?: string;
  onClick?: () => void;
};

export default function RoleCard({
  isFaceUp,
  role,
  camp,
  ability,
  goal,
  roleEn,
  roleZh,
  campEn,
  campZh,
  abilityEn,
  abilityZh,
  goalEn,
  goalZh,
  emoji,
  isUser,
  playerName,
  onClick
}: RoleCardProps) {
  const finalRoleEn = roleEn || role || "Villager";
  const finalRoleZh = roleZh || role || "村民";
  const finalCampEn = campEn || camp || "Good Camp";
  const finalCampZh = campZh || camp || "好人阵营";
  const finalAbilityEn = abilityEn || "No special ability. Find the werewolves by reasoning.";
  const finalAbilityZh = abilityZh || ability || "无特殊能力，靠推理找出狼人。";
  const finalGoalEn = goalEn || "Banish all werewolves during the day.";
  const finalGoalZh = goalZh || goal || "白天放逐所有狼人。";

  const isWolf = finalRoleEn.toLowerCase() === "werewolf" || finalRoleZh === "狼人";

  return (
    <div 
      className={`perspective-1000 cursor-pointer transition-all duration-300 hover:scale-[1.03] ${
        isUser ? 'w-72 h-[500px]' : 'w-20 h-28'
      }`}
      onClick={onClick}
    >
      <style>{`
        @keyframes breathing-glow-red {
          0%, 100% {
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.25), inset 0 0 10px rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.35);
          }
          50% {
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.75), inset 0 0 15px rgba(239, 68, 68, 0.35);
            border-color: rgba(239, 68, 68, 0.75);
          }
        }
        @keyframes breathing-glow-green {
          0%, 100% {
            box-shadow: 0 0 15px rgba(78, 222, 163, 0.25), inset 0 0 10px rgba(78, 222, 163, 0.1);
            border-color: rgba(78, 222, 163, 0.35);
          }
          50% {
            box-shadow: 0 0 30px rgba(78, 222, 163, 0.75), inset 0 0 15px rgba(78, 222, 163, 0.35);
            border-color: rgba(78, 222, 163, 0.75);
          }
        }
        .breathing-red {
          animation: breathing-glow-red 3s infinite ease-in-out;
        }
        .breathing-green {
          animation: breathing-glow-green 3s infinite ease-in-out;
        }
      `}</style>

      <div 
        className={`relative w-full h-full duration-700 transform-style-3d ${isFaceUp ? 'rotate-y-180' : ''}`}
      >
        {/* Back of Card */}
        <div className={`absolute inset-0 backface-hidden bg-gradient-to-br from-[#1a1140]/90 to-[#0b0a1f]/95 border-2 border-white/20 rounded-2xl flex flex-col items-center justify-center ${isUser ? 'shadow-[0_0_20px_rgba(124,92,255,0.4)] border-[#7c5cff]/50' : ''}`}>
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
        <div 
          className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border-2 backdrop-blur-xl ${
            isWolf 
              ? 'border-red-500/30 bg-gradient-to-br from-[#1d0505]/95 to-[#0b0202]/95 breathing-red' 
              : 'border-[#4edea3]/30 bg-gradient-to-br from-[#02180e]/95 to-[#010a06]/95 breathing-green'
          } flex flex-col items-center justify-start p-5 shadow-2xl`}
        >
          {/* Top Emoji Icon */}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 mt-0.5 ${isWolf ? 'bg-red-500/10 text-red-400' : 'bg-[#4edea3]/10 text-[#4edea3]'}`}>
            <span className="text-3xl">{emoji || (isWolf ? '🐺' : '👨‍🌾')}</span>
          </div>
          
          {/* Role Name */}
          <div className="text-center mb-1">
            <h3 className={`text-2xl font-extrabold tracking-wide ${isWolf ? 'text-red-400' : 'text-[#4edea3]'}`}>
              {finalRoleEn}
            </h3>
            <p className="text-xs text-white/50 font-medium mt-0.5">{finalRoleZh}</p>
          </div>

          {/* Camp */}
          <div className="text-center mb-3">
            <span className={`inline-flex flex-col items-center px-4 py-0.5 rounded-full text-xs font-semibold ${
              isWolf ? 'bg-red-950/60 text-red-300 border border-red-900/30' : 'bg-emerald-950/60 text-[#4edea3] border border-emerald-900/30'
            }`}>
              <span className="text-[9px] uppercase tracking-widest">{finalCampEn}</span>
              <span className="text-[8px] opacity-75 font-normal">{finalCampZh}</span>
            </span>
          </div>
          
          {/* Target & Ability Info */}
          <div className="flex flex-col w-full gap-2.5 text-left mt-1">
            <div className="bg-black/55 backdrop-blur-md py-2.5 px-3 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Goal / 目标</span>
              </div>
              <p className="text-[12px] font-semibold text-white/95 leading-snug">{finalGoalEn}</p>
              <p className="text-[10px] text-white/50 mt-0.5 leading-snug">{finalGoalZh}</p>
            </div>
            
            <div className="bg-black/55 backdrop-blur-md py-2.5 px-3 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Ability / 能力</span>
              </div>
              <p className="text-[12px] font-semibold text-white/95 leading-snug">{finalAbilityEn}</p>
              <p className="text-[10px] text-white/50 mt-0.5 leading-snug">{finalAbilityZh}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
