import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Copy, Loader2, Send, Users } from "lucide-react";
import { apiRequest, API_BASE_URL, getToken } from "../../api";
import VoiceInput from "../../components/VoiceInput";
import GameShell from "../../components/game/GameShell";
import GameStatusBar from "../../components/game/GameStatusBar";
import LobbyReady from "../../components/game/LobbyReady";
import RoleCard from "../../components/game/RoleCard";
import SpeechFeed from "../../components/game/SpeechFeed";
import AIHostCard from "../../components/game/AIHostCard";
import PlayerSpeechCard from "../../components/game/PlayerSpeechCard";
import { useTts } from "../../components/learning";
import "../../game.css";

type WerewolfRoomView = {
  room_id: string;
  title: string;
  invite_code: string;
  phase: string;
  round: number;
  min_players: number;
  player_count: number;
  max_players: number;
  is_host: boolean;
  my_player_id?: string;
  my_role?: string;
  can_speak: boolean;
  can_wolf_kill: boolean;
  can_vote: boolean;
  speech_turn_name?: string;
  wolf_targets: { player_id: string; name: string }[];
  vote_targets: { player_id: string; name: string }[];
  invited_user_ids?: string[];
  players: {
    player_id: string;
    user_id: string;
    name: string;
    alive: boolean;
    is_self: boolean;
    is_host: boolean;
    role_confirmed?: boolean;
  }[];
  feed: {
    type: string;
    speaker?: string;
    user_id?: string;
    text?: string;
    text_native?: string;
    tts?: boolean;
  }[];
  winner?: string | null;
};

const ROLE_META: Record<string, { zh: string; en: string; emoji: string; campZh: string; campEn: string }> = {
  werewolf: { zh: "狼人", en: "Werewolf", emoji: "🐺", campZh: "狼人阵营", campEn: "Werewolf Camp" },
  villager: { zh: "村民", en: "Villager", emoji: "👨‍🌾", campZh: "好人阵营", campEn: "Good Camp" },
};

const PHASE_LABEL: Record<string, string> = {
  waiting: "等待玩家",
  role_reveal: "查看身份",
  night: "夜晚",
  day_discussion: "白天讨论",
  vote: "投票",
  ended: "已结束",
};

let createRoomInFlight: Promise<WerewolfRoomView> | null = null;

function requestCreateRoom(): Promise<WerewolfRoomView> {
  if (!createRoomInFlight) {
    createRoomInFlight = apiRequest<WerewolfRoomView>("/api/games/werewolf-rooms", {
      method: "POST",
      body: JSON.stringify({ title: "狼人杀 · 真实房间" }),
    }).finally(() => {
      createRoomInFlight = null;
    });
  }
  return createRoomInFlight;
}

export default function WerewolfRoom() {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState<WerewolfRoomView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [roleFaceUp, setRoleFaceUp] = useState(false);
  const [speechDraft, setSpeechDraft] = useState("");
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [voteReason, setVoteReason] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteFriends, setInviteFriends] = useState<{
    id: string;
    username: string;
    is_online?: boolean;
    invited?: boolean;
    can_invite?: boolean;
  }[]>([]);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<{ room_id: string; title: string; invite_code: string; host_name: string }[]>([]);
  const bootstrapKeyRef = useRef<string | null>(null);
  const reloadInFlightRef = useRef<Map<string, Promise<WerewolfRoomView>>>(new Map());
  const postBusyRef = useRef(false);
  const joinBusyRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const lastTtsRef = useRef("");
  const { speak } = useTts();

  const reloadRoom = useCallback(async (roomId: string) => {
    const inflight = reloadInFlightRef.current.get(roomId);
    if (inflight) return inflight;
    const request = apiRequest<WerewolfRoomView>(`/api/games/werewolf-rooms/${roomId}`)
      .then((data) => {
        setRoom(data);
        return data;
      })
      .finally(() => {
        reloadInFlightRef.current.delete(roomId);
      });
    reloadInFlightRef.current.set(roomId, request);
    return request;
  }, []);

  const loadInviteCandidates = useCallback(async (roomId: string) => {
    try {
      const data = await apiRequest<{
        items?: {
          user_id: string;
          username: string;
          is_online?: boolean;
          invited?: boolean;
          can_invite?: boolean;
        }[];
      }>(`/api/games/werewolf-rooms/${roomId}/invite-candidates`);
      setInviteFriends(
        (data.items ?? []).map((f) => ({
          id: f.user_id,
          username: f.username,
          is_online: f.is_online,
          invited: f.invited,
          can_invite: f.can_invite,
        })),
      );
    } catch {
      setInviteFriends([]);
    }
  }, []);

  const loadPendingInvites = useCallback(async () => {
    try {
      const data = await apiRequest<{ items?: typeof pendingInvites }>("/api/games/werewolf-rooms/invites/pending");
      setPendingInvites(data.items ?? []);
    } catch {
      setPendingInvites([]);
    }
  }, []);

  const post = useCallback(async (path: string, body?: unknown) => {
    if (!room?.room_id || postBusyRef.current) return null;
    postBusyRef.current = true;
    setBusy(true);
    try {
      const data = await apiRequest<WerewolfRoomView>(
        `/api/games/werewolf-rooms/${room.room_id}${path}`,
        { method: "POST", body: body ? JSON.stringify(body) : undefined },
      );
      setRoom(data);
      return data;
    } finally {
      postBusyRef.current = false;
      setBusy(false);
    }
  }, [room?.room_id]);

  useEffect(() => {
    const joinCode = searchParams.get("join");
    const bootstrapKey = joinCode
      ? `join:${joinCode}`
      : routeId && routeId !== "new"
        ? `room:${routeId}`
        : "new";
    if (bootstrapKeyRef.current === bootstrapKey) return;
    bootstrapKeyRef.current = bootstrapKey;

    (async () => {
      try {
        if (joinCode) {
          const joined = await apiRequest<WerewolfRoomView>("/api/games/werewolf-rooms/join", {
            method: "POST",
            body: JSON.stringify({ invite_code: joinCode }),
          });
          setRoom(joined);
          navigate(`/game/werewolf-room/${joined.room_id}`, { replace: true });
          return;
        }
        if (routeId && routeId !== "new") {
          await reloadRoom(routeId);
          return;
        }
        const created = await requestCreateRoom();
        setRoom(created);
        navigate(`/game/werewolf-room/${created.room_id}`, { replace: true });
      } catch (e) {
        bootstrapKeyRef.current = null;
        setError(e instanceof Error ? e.message : "加载房间失败");
      }
    })();
  }, [routeId, searchParams, navigate, reloadRoom]);

  useEffect(() => {
    const roomId = room?.room_id;
    if (!roomId) return;

    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => void reloadRoom(roomId).catch(() => {}), 4000);
    };

    const token = getToken();
    if (token) {
      const wsBase = (API_BASE_URL || window.location.origin).replace(/^http/i, "ws");
      const wsUrl = `${wsBase}/api/games/werewolf-rooms/ws/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`;
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data) as { type?: string; data?: WerewolfRoomView };
            if (msg.type === "room" && msg.data) setRoom(msg.data);
            if (msg.type === "room_sync") {
              if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
              syncTimerRef.current = setTimeout(() => {
                syncTimerRef.current = null;
                void reloadRoom(roomId).catch(() => {});
              }, 300);
            }
          } catch { /* ignore */ }
        };
        ws.onerror = () => startPolling();
        ws.onclose = () => startPolling();
      } catch {
        startPolling();
      }
    } else {
      startPolling();
    }

    return () => {
      ws?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [room?.room_id, reloadRoom]);

  useEffect(() => {
    if (room?.phase !== "waiting" || !room.is_host || !room.room_id) return;
    void loadInviteCandidates(room.room_id);
    const timer = setInterval(() => void loadInviteCandidates(room.room_id), 15_000);
    return () => clearInterval(timer);
  }, [room?.phase, room?.is_host, room?.room_id, room?.players.length, room?.invited_user_ids, loadInviteCandidates]);

  useEffect(() => {
    void loadPendingInvites();
    const timer = setInterval(() => void loadPendingInvites(), 4000);
    return () => clearInterval(timer);
  }, [loadPendingInvites]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const wsBase = (API_BASE_URL || window.location.origin).replace(/^http/i, "ws");
    const wsUrl = `${wsBase}/api/connect/notifications/ws?token=${encodeURIComponent(token)}`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { type?: string };
          if (msg.type === "werewolf_invite") void loadPendingInvites();
        } catch { /* ignore */ }
      };
    } catch { /* ignore */ }
    return () => ws?.close();
  }, [loadPendingInvites]);

  async function handleAcceptInvite(roomId: string) {
    if (joinBusyRef.current || busy) return;
    joinBusyRef.current = true;
    setBusy(true);
    try {
      const joined = await apiRequest<WerewolfRoomView>("/api/games/werewolf-rooms/invites/accept", {
        method: "POST",
        body: JSON.stringify({ room_id: roomId }),
      });
      setRoom(joined);
      setPendingInvites((prev) => prev.filter((p) => p.room_id !== roomId));
      navigate(`/game/werewolf-room/${joined.room_id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "加入失败");
    } finally {
      joinBusyRef.current = false;
      setBusy(false);
    }
  }

  async function handleInviteFriend(friendUserId: string) {
    if (!room?.room_id) return;
    setInviteBusyId(friendUserId);
    try {
      const data = await apiRequest<WerewolfRoomView>(
        `/api/games/werewolf-rooms/${room.room_id}/invite-friend`,
        { method: "POST", body: JSON.stringify({ friend_user_id: friendUserId }) },
      );
      setRoom(data);
      void loadInviteCandidates(room.room_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "邀请失败");
    } finally {
      setInviteBusyId(null);
    }
  }

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.feed?.length]);

  useEffect(() => {
    const last = room?.feed?.[room.feed.length - 1];
    if (!last?.text || !last.tts) return;
    const key = `${last.type}:${last.text}`;
    if (lastTtsRef.current === key) return;
    lastTtsRef.current = key;
    speak(last.text, last.type === "host" || last.type === "night" ? "zh-CN" : "en-US");
  }, [room?.feed, speak]);

  async function handleJoinByCode() {
    if (!joinCode.trim() || joinBusyRef.current || busy) return;
    joinBusyRef.current = true;
    setBusy(true);
    try {
      const joined = await apiRequest<WerewolfRoomView>("/api/games/werewolf-rooms/join", {
        method: "POST",
        body: JSON.stringify({ invite_code: joinCode.trim() }),
      });
      setRoom(joined);
      navigate(`/game/werewolf-room/${joined.room_id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "加入失败");
    } finally {
      joinBusyRef.current = false;
      setBusy(false);
    }
  }

  async function handleVoiceIntent(transcript: string, intent: "wolf_kill" | "vote" | "speech") {
    if (!room?.room_id || !transcript.trim()) return;
    if (intent === "speech") {
      await post("/speech", { text: transcript });
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest<WerewolfRoomView>(
        `/api/games/werewolf-rooms/${room.room_id}/voice-intent`,
        { method: "POST", body: JSON.stringify({ transcript, intent }) },
      );
      setRoom(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "语音识别失败");
    } finally {
      setBusy(false);
    }
  }

  if (error && !room) {
    return (
      <div className="premium flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center game-dark">
        <p className="text-error">{error}</p>
        <button className="game-btn-primary px-5 py-2 rounded-full" onClick={() => navigate("/game")}>
          返回游戏
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="game-dark flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white/60" size={32} />
      </div>
    );
  }

  const roleMeta = ROLE_META[room.my_role || "villager"] || ROLE_META.villager;
  const me = room.players.find((p) => p.is_self);
  const wolves = Math.max(1, Math.floor(room.player_count / 4));
  const lobbyPlayers = room.players.map((p) => ({
    id: p.player_id,
    name: p.name.replace(" (你)", ""),
    isHost: p.is_host,
    isHuman: true,
    status: p.role_confirmed ? "已确认" : "等待中",
  }));

  return (
    <GameShell>
      <GameStatusBar
        roundTitle={room.phase === "waiting" ? room.title : `第 ${room.round} 轮 · ${PHASE_LABEL[room.phase] || room.phase}`}
        aliveCount={room.players.filter((p) => p.alive).length}
        totalCount={room.players.length}
        userRole={room.my_role ? roleMeta.zh : undefined}
        onBack={() => navigate("/game")}
      />

      {error ? (
        <div className="mx-4 mt-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-400/30 flex items-start justify-between gap-2">
          <p className="text-[12px] text-red-200 leading-relaxed flex-1">{error}</p>
          <button type="button" onClick={() => setError("")} className="text-red-300 text-[11px] shrink-0 underline">
            关闭
          </button>
        </div>
      ) : null}

      <div className="game-subbar flex items-center justify-between px-4 py-1 border-b">
        <div className="flex-1" />
        <div className="text-center min-w-0 flex-1 px-2">
          <p className="game-subbar-label text-[10px] flex items-center justify-center gap-1">
            <Users size={12} /> {room.player_count}/{room.max_players} · 邀请码
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(room.invite_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="game-invite-code-btn flex items-center gap-1 text-[11px] flex-1 justify-end min-w-0"
        >
          <Copy size={14} /> {copied ? "已复制" : room.invite_code}
        </button>
      </div>

      {pendingInvites.length > 0 && room.phase === "waiting" && !room.players.some((p) => p.is_self && p.is_host) && (
        <div className="mx-4 mt-2 p-3 rounded-xl bg-[#7c5cff]/15 border border-[#7c5cff]/40">
          <p className="text-[12px] text-white/80 mb-2">收到狼人杀邀请</p>
          {pendingInvites.slice(0, 3).map((inv) => (
            <div key={inv.room_id} className="flex gap-2 mb-2 last:mb-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleAcceptInvite(inv.room_id)}
                className="game-btn-primary flex-1 text-left px-3 py-2 rounded-lg text-[12px]"
              >
                接受 · {inv.host_name} 的 {inv.title}
              </button>
            </div>
          ))}
        </div>
      )}

      {pendingInvites.length > 0 && room.phase === "waiting" && room.is_host && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
          <p className="text-[11px] game-text-secondary">已发出邀请，等待好友在线接受</p>
        </div>
      )}

      {room.phase === "waiting" && (
        <>
          {!routeId?.includes(room.room_id) && (
            <div className="px-4 py-2 flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="输入邀请码加入"
                className="flex-1 rounded-xl px-3 py-2 text-sm game-text-primary"
              />
              <button onClick={() => void handleJoinByCode()} className="game-btn-primary px-4 py-2 rounded-xl text-sm">
                加入
              </button>
            </div>
          )}
          <LobbyReady
            players={lobbyPlayers}
            onStartDealing={() => void post("/start")}
            startDisabled={!room.is_host || room.player_count < room.min_players || busy}
            startLabel={
              room.player_count < room.min_players
                ? `等待玩家 (${room.player_count}/${room.min_players})`
                : room.is_host
                  ? `开始游戏（${wolves} 狼 / ${room.player_count} 人）`
                  : "等待房主开始"
            }
            hideStart={!room.is_host && room.player_count < room.min_players}
            maxPlayers={room.max_players}
            inviteFriends={room.is_host ? inviteFriends : []}
            onInviteFriend={room.is_host ? (id) => void handleInviteFriend(id) : undefined}
            inviteBusyId={inviteBusyId}
          />
          {!room.is_host && room.player_count >= room.min_players && (
            <p className="text-center text-white/50 text-sm pb-24">等待房主开始游戏…</p>
          )}
        </>
      )}

      {room.phase === "role_reveal" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 overflow-y-auto">
          <p className="text-white/80 text-sm text-center">点击翻开身份牌，确认后进入第一个夜晚</p>
          <RoleCard
            isFaceUp={roleFaceUp}
            isUser
            playerName={me?.name.replace(" (你)", "")}
            roleEn={roleMeta.en}
            roleZh={roleMeta.zh}
            campEn={roleMeta.campEn}
            campZh={roleMeta.campZh}
            emoji={roleMeta.emoji}
            onClick={() => setRoleFaceUp((v) => !v)}
          />
          {roleFaceUp && !me?.role_confirmed && (
            <button
              disabled={busy}
              onClick={() => void post("/confirm-role")}
              className="game-btn-primary px-8 py-3 rounded-full"
            >
              确认身份
            </button>
          )}
          {me?.role_confirmed && (
            <p className="text-emerald-400 text-sm">已确认，等待其他玩家…</p>
          )}
        </div>
      )}

      {(room.phase === "night" || room.phase === "day_discussion" || room.phase === "vote" || room.phase === "ended") && (
        <>
          <SpeechFeed>
            {room.feed.map((item, i) =>
              item.type === "host" || item.type === "night" || item.type === "system" || item.type === "vote" ? (
                <AIHostCard
                  key={i}
                  text={item.text || ""}
                  onSpeak={item.text ? () => void speak(item.text!, "zh-CN") : undefined}
                />
              ) : (
                <PlayerSpeechCard
                  key={i}
                  playerName={item.speaker || "Player"}
                  englishText={item.text || ""}
                  chineseGloss={item.text_native}
                  avatarChar={(item.speaker || "?").charAt(0)}
                  onSpeak={item.text ? () => void speak(item.text!, "en-US") : undefined}
                />
              ),
            )}
            <div ref={feedEndRef} />
          </SpeechFeed>

          {room.phase === "night" && room.can_wolf_kill && (
            <div className="werewolf-action-bar px-4 pb-4 flex flex-col gap-3 pt-3">
              <p className="text-red-300 text-sm font-bold text-center">🐺 狼人请睁眼 — 选择袭击目标</p>
              <div className="grid grid-cols-2 gap-2">
                {room.wolf_targets.map((t) => (
                  <button
                    key={t.player_id}
                    disabled={busy}
                    onClick={() => void post("/wolf-kill", { target_player_id: t.player_id })}
                    className="game-target-btn game-glass-card py-3 text-sm font-medium active:scale-95"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <VoiceInput
                mode="hold"
                className="voice-input-glass mx-auto"
                iconSize={22}
                disabled={busy}
                title="按住说目标名字"
                onTranscript={(text) => void handleVoiceIntent(text, "wolf_kill")}
                onError={(msg) => setError(msg)}
              />
              <p className="text-[11px] text-white/40 text-center">可点选或按住说话（如「杀 Alex」）</p>
            </div>
          )}

          {room.phase === "night" && !room.can_wolf_kill && (
            <p className="text-center text-white/50 py-6 text-sm">天黑请闭眼… 等待狼人行动</p>
          )}

          {room.phase === "day_discussion" && room.can_speak && (
            <div className="werewolf-action-bar px-4 pb-4 flex flex-col gap-2 pt-3">
              <p className="text-[#7c5cff] text-sm font-bold text-center">轮到你发言</p>
              <div className="flex gap-2">
                <input
                  value={speechDraft}
                  onChange={(e) => setSpeechDraft(e.target.value)}
                  placeholder="输入发言…"
                  className="flex-1 rounded-xl px-3 py-2 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && speechDraft.trim() && void post("/speech", { text: speechDraft }).then(() => setSpeechDraft(""))}
                />
                <button
                  disabled={!speechDraft.trim() || busy}
                  onClick={() => void post("/speech", { text: speechDraft }).then(() => setSpeechDraft(""))}
                  className="game-btn-primary w-10 h-10 rounded-full flex items-center justify-center"
                >
                  <Send size={16} />
                </button>
                <VoiceInput
                  mode="hold"
                  className="voice-input-glass voice-input-glass--compact"
                  iconSize={18}
                  disabled={busy}
                  onTranscript={(text) => void handleVoiceIntent(text, "speech")}
                  onError={(msg) => setError(msg)}
                  title="按住说话发言"
                />
              </div>
              <button
                disabled={busy}
                onClick={() => void post("/end-speech")}
                className="game-btn-ghost text-[12px] underline mx-auto"
              >
                结束发言
              </button>
            </div>
          )}

          {room.phase === "day_discussion" && !room.can_speak && (
            <p className="text-center text-white/50 py-4 text-sm">
              请 {room.speech_turn_name || "其他玩家"} 发言…
            </p>
          )}

          {room.phase === "vote" && room.can_vote && (
            <div className="werewolf-action-bar px-4 pb-6 flex flex-col gap-3 pt-3">
              <p className="text-white text-sm font-bold text-center">投票放逐</p>
              <div className="grid grid-cols-2 gap-2">
                {room.vote_targets.map((t) => (
                  <button
                    key={t.player_id}
                    onClick={() => setVoteTarget(t.player_id)}
                    className={`game-target-btn game-glass-card py-3 text-sm font-medium ${voteTarget === t.player_id ? "is-selected" : ""}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              {voteTarget && (
                <>
                  <input
                    value={voteReason}
                    onChange={(e) => setVoteReason(e.target.value)}
                    placeholder="投票理由（可选）"
                    className="rounded-xl px-3 py-2 text-sm w-full"
                  />
                  <button
                    disabled={busy}
                    onClick={() => void post("/vote", { target_player_id: voteTarget, reason: voteReason })}
                    className="game-btn-danger py-3 rounded-xl font-bold w-full"
                  >
                    确认投票
                  </button>
                </>
              )}
              <VoiceInput
                mode="hold"
                className="voice-input-glass mx-auto"
                iconSize={22}
                disabled={busy}
                title="按住说出投票对象"
                onTranscript={(text) => void handleVoiceIntent(text, "vote")}
                onError={(msg) => setError(msg)}
              />
            </div>
          )}

          {room.phase === "vote" && !room.can_vote && (
            <p className="text-center text-white/50 py-4 text-sm">等待其他玩家投票…</p>
          )}

          {room.phase === "ended" && (
            <div className="px-4 pb-8 text-center">
              <p className="text-2xl font-bold text-white mb-2">
                {room.winner === "villagers" ? "好人胜利 🎉" : "狼人胜利 🐺"}
              </p>
              <button onClick={() => navigate("/game")} className="game-btn-primary mt-4 px-6 py-2 rounded-full">
                返回游戏大厅
              </button>
            </div>
          )}
        </>
      )}

      {error && <p className="text-red-400 text-xs text-center px-4 pb-2">{error}</p>}
    </GameShell>
  );
}
