import { X, MessageCircle, AlertTriangle, History } from "lucide-react";
import SuspicionMeter from "./SuspicionMeter";

export type PlayerDetail = {
  id: string;
  name: string;
  alive: boolean;
  suspicion: number;
  publicClaim?: string;
  roleKnown?: string;
  speechSummary: string[];
  suspicionHints: string[];
};

type PlayerDetailSheetProps = {
  player: PlayerDetail;
  onClose: () => void;
  onQuestion: () => void;
  onChallenge: () => void;
  onViewHistory: () => void;
};

export default function PlayerDetailSheet({
  player,
  onClose,
  onQuestion,
  onChallenge,
  onViewHistory,
}: PlayerDetailSheetProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg game-glass-card rounded-t-3xl border-b-0 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)] animate-[fadeInUp_0.3s_ease-out]">
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{player.name}</h3>
            <p className="text-xs text-white/50 mt-0.5">
              公开身份：{player.roleKnown || "未知"}
              {!player.alive && " · 已出局"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white/70">
            <X size={18} />
          </button>
        </div>

        <SuspicionMeter level={player.suspicion} />

        {player.publicClaim && (
          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">公开说法</p>
            <p className="text-sm text-white/90">{player.publicClaim}</p>
          </div>
        )}

        {player.speechSummary.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-white/60 mb-2">发言摘要</p>
            <ul className="space-y-1.5">
              {player.speechSummary.slice(-4).map((s, i) => (
                <li key={i} className="text-sm text-white/80 flex gap-2">
                  <span className="text-[#7c5cff] shrink-0">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {player.suspicionHints.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-orange-400/90 mb-2 flex items-center gap-1">
              <AlertTriangle size={12} /> 可疑点
            </p>
            <ul className="space-y-1.5">
              {player.suspicionHints.map((h, i) => (
                <li key={i} className="text-sm text-orange-200/80">{h}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={onQuestion}
            disabled={!player.alive}
            className="py-3 rounded-xl bg-[#7c5cff]/30 border border-[#7c5cff]/50 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <MessageCircle size={16} /> 提问
          </button>
          <button
            onClick={onChallenge}
            disabled={!player.alive}
            className="py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold disabled:opacity-40"
          >
            质疑发言
          </button>
          <button
            onClick={onViewHistory}
            className="col-span-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm flex items-center justify-center gap-1.5"
          >
            <History size={16} /> 查看历史记录
          </button>
        </div>
      </div>
    </div>
  );
}
