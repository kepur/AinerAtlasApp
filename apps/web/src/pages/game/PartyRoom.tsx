import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Star, Settings, Mic, MicOff, Crown, HelpCircle, FileText, BarChart2,
  MoreHorizontal, Volume2, ChevronRight, Play, Lightbulb, ArrowLeft, Send,
} from "lucide-react";
import { apiRequest, API_BASE_URL, getToken } from "../../api";
import VoiceInput from "../../components/VoiceInput";

type PartyRoomState = {
  room_id: string;
  title: string;
  invite_code: string;
  phase: string;
  player_count: number;
  max_players: number;
  is_host: boolean;
  current_turn_user_id?: string;
  round: number;
  players: {
    user_id: string;
    name: string;
    role: string;
    is_host?: boolean;
    mic_on?: boolean;
    avatar_url?: string;
    is_self?: boolean;
  }[];
  feed: {
    type: string;
    speaker?: string;
    user_id?: string;
    text?: string;
    text_native?: string;
  }[];
};

const AVATAR_FALLBACK = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100&h=100";

export default function PartyRoom() {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState<PartyRoomState | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const creatingRef = useRef(false);

  const currentTurnName = room?.players.find(
    (p) => p.user_id === room?.current_turn_user_id,
  )?.name?.replace(" (你)", "") || "—";

  const reloadRoom = async (roomId: string) => {
    const data = await apiRequest<PartyRoomState>(`/api/games/party-rooms/${roomId}`);
    setRoom(data);
  };

  useEffect(() => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    (async () => {
      try {
        const joinCode = searchParams.get("join");
        if (joinCode) {
          const joined = await apiRequest<PartyRoomState>("/api/games/party-rooms/join", {
            method: "POST",
            body: JSON.stringify({ invite_code: joinCode }),
          });
          setRoom(joined);
          navigate(`/game/party-room/${joined.room_id}`, { replace: true });
          return;
        }
        if (routeId && routeId !== "new") {
          const existing = await apiRequest<PartyRoomState>(`/api/games/party-rooms/${routeId}`);
          setRoom(existing);
          return;
        }
        const created = await apiRequest<PartyRoomState>("/api/games/party-rooms", {
          method: "POST",
          body: JSON.stringify({ title: "侦探之夜" }),
        });
        setRoom(created);
        navigate(`/game/party-room/${created.room_id}`, { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载房间失败");
      }
    })();
  }, [routeId, searchParams, navigate]);

  useEffect(() => {
    const roomId = room?.room_id;
    if (!roomId) return;

    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let cancelled = false;

    const startPolling = () => {
      if (pollTimer) return;
      setWsConnected(false);
      pollTimer = setInterval(() => {
        void reloadRoom(roomId).catch(() => {});
      }, 4000);
    };
    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
    const clearPing = () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    };
    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      attempts += 1;
      const delay = Math.min(1000 * 2 ** Math.min(attempts, 4), 15_000);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (cancelled) return;
      const token = getToken();
      if (!token) {
        startPolling();
        return;
      }
      const wsBase = (API_BASE_URL || window.location.origin).replace(/^http/i, "ws");
      const wsUrl = `${wsBase}/api/games/party-rooms/ws/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        startPolling();
        scheduleReconnect();
        return;
      }
      ws.onopen = () => {
        attempts = 0;
        setWsConnected(true);
        stopPolling();
        void reloadRoom(roomId).catch(() => {});
        clearPing();
        pingTimer = setInterval(() => {
          try {
            if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
          } catch { /* ignore */ }
        }, 25_000);
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { type?: string; data?: PartyRoomState };
          if (data.type === "room" && data.data) {
            setRoom(data.data);
          } else if (data.type === "room_sync") {
            void reloadRoom(roomId);
          }
        } catch { /* ignore */ }
      };
      ws.onerror = () => startPolling();
      ws.onclose = () => {
        clearPing();
        setWsConnected(false);
        if (cancelled) return;
        startPolling();
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearPing();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopPolling();
      ws?.close();
    };
  }, [room?.room_id]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.feed?.length]);

  const sendMessage = async (overrideText?: string) => {
    const body = (overrideText ?? text).trim();
    if (!room || !body || busy) return;
    setBusy(true);
    try {
      const data = await apiRequest<PartyRoomState>(
        `/api/games/party-rooms/${room.room_id}/message`,
        { method: "POST", body: JSON.stringify({ text: body }) },
      );
      setRoom(data);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setBusy(false);
    }
  };

  const endTurn = async () => {
    if (!room || busy) return;
    setBusy(true);
    try {
      const data = await apiRequest<PartyRoomState>(
        `/api/games/party-rooms/${room.room_id}/end-turn`,
        { method: "POST" },
      );
      setRoom(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "结束发言失败");
    } finally {
      setBusy(false);
    }
  };

  if (error && !room) {
    return (
      <div className="premium w-full h-full flex items-center justify-center text-white/70 p-6">
        {error}
      </div>
    );
  }

  if (!room) {
    return (
      <div className="premium w-full h-full flex items-center justify-center text-white/60">
        正在进入房间…
      </div>
    );
  }

  const self = room.players.find((p) => p.is_self);

  return (
    <div className="premium w-full h-full bg-[#0b0c10] text-[#e2e8f0] flex flex-col relative overflow-hidden font-sans">
      <header className="sticky top-0 left-0 w-full z-50 px-4 pt-[env(safe-area-inset-top,20px)] bg-[#1f2937]/90 backdrop-blur-md shrink-0 flex items-center justify-between h-16 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white/80 bg-white/5 backdrop-blur-md rounded-full hover:bg-white/20 border border-white/10 transition-colors shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[#8b5cf6] flex items-center justify-center shadow-lg">
            <Star className="text-white fill-white" size={20} />
          </div>
          <div className="flex flex-col">
            <div className="font-bold text-white text-[14px]">{room.title}</div>
            <div className="text-[10px] text-white/50 flex items-center gap-1.5 mt-0.5">
              <span>邀请码 {room.invite_code}</span>
              <span>|</span>
              <span>{room.player_count}/{room.max_players} 人</span>
              <span>|</span>
              <span>{wsConnected ? "实时" : "同步中…"}</span>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-1 text-[11px] text-white/80 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
          <Settings size={12} /> 规则
        </button>
      </header>

      <section className="bg-[#111827] border-b border-white/5 py-3 shrink-0">
        <div className="px-4 text-[11px] font-bold text-white/80 mb-2 flex justify-between items-center">
          <span>玩家列表</span>
          <span className="text-[10px] text-[#8b5cf6] font-normal">R{room.round}</span>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 pb-1">
          {room.players.map((player) => (
            <div key={player.user_id} className="flex flex-col items-center gap-1 shrink-0 relative">
              <div className="relative">
                <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${player.mic_on ? "border-[#10b981]" : "border-white/10"}`}>
                  <img src={player.avatar_url || AVATAR_FALLBACK} alt={player.name} className="w-full h-full object-cover opacity-90" />
                </div>
                {player.is_host && (
                  <div className="absolute -top-2 -right-1 text-yellow-400 drop-shadow-md">
                    <Crown size={14} className="fill-yellow-400" />
                  </div>
                )}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${player.mic_on ? "bg-[#10b981]" : "bg-gray-600"} text-white border border-[#111827]`}>
                  {player.mic_on ? <Mic size={8} /> : <MicOff size={8} />}
                </div>
              </div>
              <div className="text-[10px] font-bold text-white/90 truncate max-w-[50px]">{player.name}</div>
              <div className="text-[8px] px-1.5 py-0.5 rounded text-white bg-[#8b5cf6]">{player.role}</div>
            </div>
          ))}
        </div>
      </section>

      <main className="flex-1 w-full overflow-y-auto px-4 pt-4 pb-48 flex flex-col gap-4 no-scrollbar bg-[#0b0c10]">
        {(room.feed || []).map((f, i) => {
          const isSelf = f.user_id && f.user_id === self?.user_id;
          if (f.type === "message") {
            return (
              <div key={i} className={`flex gap-2 ${isSelf ? "flex-row-reverse" : ""}`}>
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                  <img src={AVATAR_FALLBACK} alt="" className="w-full h-full object-cover" />
                </div>
                <div className={`flex flex-col gap-1 flex-1 ${isSelf ? "items-end" : ""}`}>
                  <span className={`text-[10px] ${isSelf ? "text-[#8b5cf6] font-bold" : "text-white/50"}`}>{f.speaker}</span>
                  <div className={`p-3 rounded-2xl text-[12px] leading-relaxed ${isSelf ? "bg-[#8b5cf6] text-white rounded-tr-sm" : "bg-[#1f2937] text-white/80 border border-white/5 rounded-tl-sm"}`}>
                    {f.text}
                  </div>
                </div>
              </div>
            );
          }
          if (f.type === "host" || f.type === "system") {
            return (
              <div key={i} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-[#1e1b4b] border border-[#8b5cf6]/30 flex items-center justify-center shrink-0">🤖</div>
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] text-white/50">{f.speaker || "AI Host"}</span>
                  <div className="bg-[#1f2937] p-3 rounded-2xl rounded-tl-sm border border-white/5 text-[12px] text-white/80 leading-relaxed whitespace-pre-line">
                    {f.text}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}
        <div ref={feedEndRef} />
      </main>

      <div className="absolute bottom-0 w-full bg-[#111827] border-t border-white/5 rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50 flex flex-col pb-[env(safe-area-inset-bottom,16px)]">
        <div className="flex justify-between items-center px-5 py-3 border-b border-white/5 bg-[#1f2937]/50">
          <div className="flex items-center gap-2 text-[12px] text-white/80">
            <div className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-pulse" />
            当前轮到: <span className="font-bold text-white">{currentTurnName}</span>
          </div>
          <button
            onClick={() => void endTurn()}
            disabled={busy}
            className="bg-[#8b5cf6] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            结束发言
          </button>
        </div>

        {voiceErr && (
          <p className="px-4 -mb-1 text-center text-[11px] font-semibold text-rose-300">{voiceErr}</p>
        )}
        <div className="px-4 py-3 flex gap-2 items-center">
          <VoiceInput
            mode="tap"
            autoStopSilenceMs={1000}
            language="auto"
            disabled={busy}
            onTranscript={(t) => {
              const v = t.trim();
              if (!v || busy) return;
              setVoiceErr(null);
              void sendMessage(v);
            }}
            onError={(m) => {
              setVoiceErr(m);
              window.setTimeout(() => setVoiceErr(null), 3200);
            }}
            iconSize={18}
            className="w-10 h-10 rounded-xl bg-[#1f2937] border border-white/10 flex items-center justify-center text-white shrink-0 active:scale-95 transition-transform disabled:opacity-40"
            title="点击说话 · 再点或停顿 1 秒自动转文字"
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void sendMessage(); } }}
            placeholder="发言或提问…"
            className="flex-1 rounded-xl bg-[#1f2937] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-[#8b5cf6]"
          />
          <button
            onClick={() => void sendMessage()}
            disabled={busy || !text.trim()}
            className="w-10 h-10 rounded-xl bg-[#8b5cf6] flex items-center justify-center disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>

        <div className="px-4 pb-2 flex justify-between">
          {[
            { icon: <Mic size={20} />, label: "发言" },
            { icon: <HelpCircle size={20} />, label: "提问" },
            { icon: <FileText size={20} />, label: "线索" },
            { icon: <BarChart2 size={20} />, label: "投票" },
            { icon: <MoreHorizontal size={20} />, label: "更多" },
          ].map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-1 opacity-70">
              <div className="w-10 h-10 rounded-[14px] bg-[#1f2937] flex items-center justify-center border border-white/5">{action.icon}</div>
              <span className="text-[9px] text-white/60">{action.label}</span>
            </button>
          ))}
        </div>

        <div className="mx-4 mb-2 bg-gradient-to-r from-[#1f2937] to-[#111827] border border-[#8b5cf6]/20 rounded-xl p-3 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-[#c4b5fd] font-bold flex items-center gap-1">
              <Lightbulb size={10} /> 学习助手（仅自己可见）
            </div>
            <div className="text-[13px] font-bold text-white">Can you explain why...?</div>
            <div className="text-[10px] text-white/50">礼貌要求对方解释原因</div>
          </div>
          <Volume2 size={16} className="text-white/50" />
        </div>
      </div>
    </div>
  );
}
