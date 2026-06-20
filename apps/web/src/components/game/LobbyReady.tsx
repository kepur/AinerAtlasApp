import { Settings, Users, Moon, Globe, StarHalf, Bot, User } from "lucide-react";

type Player = {
  id: string;
  name: string;
  isHost?: boolean;
  isHuman?: boolean;
  personality?: string;
  status?: string;
};

type LobbyReadyProps = {
  players: Player[];
  onStartDealing: () => void;
  startDisabled?: boolean;
  startLabel?: string;
  hideStart?: boolean;
  inviteFriends?: { id: string; username: string; match_type?: string }[];
  onInviteFriend?: (friendUserId: string) => void;
  inviteBusyId?: string | null;
  maxPlayers?: number;
};

export default function LobbyReady({
  players,
  onStartDealing,
  startDisabled,
  startLabel,
  hideStart,
  inviteFriends = [],
  onInviteFriend,
  inviteBusyId,
  maxPlayers = 6,
}: LobbyReadyProps) {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-md mx-auto w-full relative z-10 pb-36">
      {/* Game Settings Card */}
      <section className="game-glass-card p-5 mt-4">
        <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings size={16} /> Game Configuration
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/20 rounded-lg p-3 flex flex-col">
            <span className="text-[11px] text-white/50">Format</span>
            <span className="text-sm text-white font-medium flex items-center gap-1 mt-1">
              <Users size={16} className="text-[#7c5cff]" /> 6人局
            </span>
          </div>
          <div className="bg-black/20 rounded-lg p-3 flex flex-col">
            <span className="text-[11px] text-white/50">Setup</span>
            <span className="text-sm text-white font-medium flex items-center gap-1 mt-1">
              <Moon size={16} className="text-red-400" /> 2 狼人 / 4 好人
            </span>
          </div>
          <div className="bg-black/20 rounded-lg p-3 flex flex-col">
            <span className="text-[11px] text-white/50">Language</span>
            <span className="text-sm text-white font-medium flex items-center gap-1 mt-1">
              <Globe size={16} className="text-blue-400" /> English
            </span>
          </div>
          <div className="bg-black/20 rounded-lg p-3 flex flex-col">
            <span className="text-[11px] text-white/50">Difficulty</span>
            <span className="text-sm text-white font-medium flex items-center gap-1 mt-1">
              <StarHalf size={16} className="text-emerald-400" /> Normal
            </span>
          </div>
        </div>
      </section>

      {/* Player Roster */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white px-1">
          Lobby Roster <span className="text-white/50 text-sm font-normal ml-2">({players.length}/{maxPlayers})</span>
        </h2>
        
        <div className="flex flex-col gap-3">
          {players.map((p, idx) => (
            <div key={p.id} className={`game-glass-card p-3 flex items-center gap-4 relative overflow-hidden transition-all ${p.isHuman ? 'border border-[#7c5cff]/50 bg-[#7c5cff]/10' : ''}`}>
              {p.isHuman && <div className="absolute top-0 left-0 w-1 h-full bg-[#7c5cff]"></div>}
              
              <div className={`w-12 h-12 rounded-full flex items-center justify-center relative ${p.isHuman ? 'bg-[#7c5cff] text-white' : 'bg-white/10'}`}>
                {p.isHuman ? (
                  <span className="text-xl font-bold">{p.name.charAt(0)}</span>
                ) : (
                  <Bot size={24} className="text-white/70" />
                )}
                {!p.isHuman && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#4edea3] rounded-full border-2 border-[#1a1140]"></div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col">
                <span className="text-base text-white font-medium">
                  {p.name} {p.isHost && <span className="text-[#7c5cff] font-normal text-xs ml-1">(Host)</span>}
                </span>
                <div className="flex gap-2 mt-1">
                  {p.personality ? (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[11px]">
                      {p.personality}
                    </span>
                  ) : (
                    <span className="text-white/50 text-xs">人类玩家</span>
                  )}
                </div>
              </div>

              {p.isHuman ? (
                <User size={20} className="text-[#7c5cff]" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#4edea3] game-pulse" style={{ animationDelay: `${idx * 0.2}s` }}></div>
              )}
            </div>
          ))}

          {onInviteFriend && players.length < maxPlayers && inviteFriends.length > 0 && (
            <div className="game-glass-card p-3 border border-dashed border-[#7c5cff]/40">
              <p className="text-[11px] text-white/60 mb-2 uppercase tracking-wider">邀请好友</p>
              <div className="flex flex-wrap gap-2">
                {inviteFriends.slice(0, 8).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    disabled={inviteBusyId === f.id}
                    onClick={() => onInviteFriend(f.id)}
                    className="game-btn-secondary px-3 py-1.5 rounded-full text-[12px] font-semibold active:scale-95 disabled:opacity-50"
                  >
                    {inviteBusyId === f.id ? "邀请中…" : `+ ${f.username}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {!hideStart && (
      <div className="fixed bottom-0 left-0 w-full px-4 pt-8 pb-[max(env(safe-area-inset-bottom,16px),16px)] bg-gradient-to-t from-[#0b0a1f] via-[#0b0a1f]/95 to-transparent z-40">
        <div className="max-w-md mx-auto">
          <button 
            onClick={onStartDealing}
            disabled={startDisabled}
            className="game-btn-primary w-full h-14 rounded-full text-lg shadow-[0_0_24px_rgba(124,92,255,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40 disabled:shadow-none"
          >
            {startLabel || "开始发牌"}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
