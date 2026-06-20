import { Settings, Users, Moon, Globe, StarHalf, Bot, User } from "lucide-react";
import PresenceAvatar from "../PresenceAvatar";

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
  inviteFriends?: {
    id: string;
    username: string;
    match_type?: string;
    is_online?: boolean;
    invited?: boolean;
    can_invite?: boolean;
  }[];
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
      <section className="game-glass-card werewolf-lobby-config p-5 mt-4">
        <h2 className="text-xs game-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2 font-semibold">
          <Settings size={16} className="text-[#a78bfa]" /> Game Configuration
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="werewolf-lobby-config-cell rounded-lg p-3 flex flex-col">
            <span className="text-[11px] game-text-muted font-medium">Format</span>
            <span className="text-sm game-text-primary font-semibold flex items-center gap-1 mt-1">
              <Users size={16} className="text-[#a78bfa]" /> 6人局
            </span>
          </div>
          <div className="werewolf-lobby-config-cell rounded-lg p-3 flex flex-col">
            <span className="text-[11px] game-text-muted font-medium">Setup</span>
            <span className="text-sm game-text-primary font-semibold flex items-center gap-1 mt-1">
              <Moon size={16} className="text-red-300" /> 2 狼人 / 4 好人
            </span>
          </div>
          <div className="werewolf-lobby-config-cell rounded-lg p-3 flex flex-col">
            <span className="text-[11px] game-text-muted font-medium">Language</span>
            <span className="text-sm game-text-primary font-semibold flex items-center gap-1 mt-1">
              <Globe size={16} className="text-sky-300" /> English
            </span>
          </div>
          <div className="werewolf-lobby-config-cell rounded-lg p-3 flex flex-col">
            <span className="text-[11px] game-text-muted font-medium">Difficulty</span>
            <span className="text-sm game-text-primary font-semibold flex items-center gap-1 mt-1">
              <StarHalf size={16} className="text-emerald-300" /> Normal
            </span>
          </div>
        </div>
      </section>

      {/* Player Roster */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold game-text-primary px-1">
          Lobby Roster{" "}
          <span className="game-text-secondary text-sm font-semibold ml-2">
            ({players.length}/{maxPlayers})
          </span>
        </h2>
        
        <div className="flex flex-col gap-3">
          {players.map((p, idx) => (
            <div key={p.id} className={`game-glass-card p-3 flex items-center gap-4 relative overflow-hidden transition-all ${p.isHuman ? 'border border-[#7c5cff]/50 bg-[#7c5cff]/10' : ''}`}>
              {p.isHuman && <div className="absolute top-0 left-0 w-1 h-full bg-[#7c5cff]"></div>}
              
              <div className={`w-12 h-12 rounded-full flex items-center justify-center relative ${p.isHuman ? '' : 'bg-white/10'}`}>
                {p.isHuman ? (
                  <PresenceAvatar
                    name={p.name}
                    isOnline
                    size="lg"
                    offlineMuted={false}
                    showDot={false}
                    faceClassName="!bg-[#7c5cff] !text-white !border-[#a78bfa]/40"
                  />
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
                    <span className="game-text-secondary text-xs font-medium">人类玩家</span>
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

          {onInviteFriend && players.length < maxPlayers && (
            <div className="game-glass-card p-3 border border-dashed border-[#7c5cff]/40">
              <p className="text-[11px] game-text-secondary mb-1 uppercase tracking-wider font-semibold">
                邀请在线好友
              </p>
              <p className="text-[10px] game-text-muted mb-2">仅显示 3 分钟内在线的匹配好友，离线用户不可邀请</p>
              {inviteFriends.length === 0 ? (
                <p className="text-[12px] game-text-muted">暂无匹配好友，先去 Connect 添加好友吧</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {inviteFriends.map((f) => {
                    const disabled = inviteBusyId === f.id || f.invited || !f.can_invite || f.is_online === false;
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 bg-black/15 border border-white/10"
                      >
                        <PresenceAvatar
                          name={f.username}
                          isOnline={f.is_online === true}
                          size="sm"
                          offlineMuted
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold game-text-primary truncate">{f.username}</p>
                          <p className={`text-[10px] font-medium ${f.is_online ? "presence-avatar__label--online" : "presence-avatar__label--offline"}`}>
                            {f.invited ? "已邀请" : f.is_online ? "在线 · 可邀请" : "离线"}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onInviteFriend!(f.id)}
                          className="game-btn-secondary shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 disabled:opacity-45"
                        >
                          {inviteBusyId === f.id ? "邀请中…" : f.invited ? "已邀请" : "邀请"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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
            className="game-btn-primary game-btn-primary--waiting w-full h-14 rounded-full text-lg shadow-[0_0_24px_rgba(124,92,255,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:shadow-none"
          >
            {startLabel || "开始发牌"}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
