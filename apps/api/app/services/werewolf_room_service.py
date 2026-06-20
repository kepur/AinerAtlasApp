"""Real multiplayer werewolf rooms — human players + AI GM voice prompts.

State lives in ``party_rooms.state`` with ``game_mode=werewolf_real``.
Min 4 players; roles assigned on host start; night kill + day vote by real users.
"""
from __future__ import annotations

import random
import re
import string
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models import PartyRoom, User, new_id

MIN_PLAYERS = 4
MAX_PLAYERS = 12
GAME_MODE = "werewolf_real"


def _invite_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def _display_name(db: Session, user_id: str) -> str:
    user = db.get(User, user_id)
    if user and user.username:
        return user.username
    if user and user.email:
        return user.email.split("@")[0]
    return "Player"


def _wolf_count(player_count: int) -> int:
    return max(1, player_count // 4)


def _find_player(state: dict, *, user_id: str | None = None, player_id: str | None = None) -> dict | None:
    for p in state.get("players") or []:
        if user_id and p.get("user_id") == user_id:
            return p
        if player_id and p.get("player_id") == player_id:
            return p
    return None


def _alive_players(state: dict) -> list[dict]:
    return [p for p in state.get("players") or [] if p.get("alive", True)]


def _append_feed(state: dict, *, kind: str, text: str, text_native: str = "", round_no: int | None = None) -> None:
    feed = list(state.get("feed") or [])
    feed.append({
        "type": kind,
        "speaker": "AI Host",
        "round": round_no if round_no is not None else state.get("round", 0),
        "text": text,
        "text_native": text_native,
        "tts": True,
    })
    state["feed"] = feed


def _check_winner(state: dict) -> str | None:
    wolves = sum(1 for p in _alive_players(state) if p.get("role") == "werewolf")
    villagers = sum(1 for p in _alive_players(state) if p.get("role") != "werewolf")
    if wolves == 0:
        return "villagers"
    if wolves >= villagers:
        return "werewolves"
    return None


def _save(room: PartyRoom, db: Session) -> None:
    flag_modified(room, "state")
    room.updated_at = datetime.now(UTC)
    db.add(room)
    db.commit()


def _load(db: Session, room_id: str) -> PartyRoom:
    room = db.get(PartyRoom, room_id)
    if not room:
        raise ValueError("Room not found")
    state = room.state or {}
    if state.get("game_mode") != GAME_MODE:
        raise ValueError("Not a werewolf room")
    return room


def _ensure_member(state: dict, user_id: str) -> dict:
    player = _find_player(state, user_id=user_id)
    if not player:
        raise ValueError("Not a room member")
    return player


def _public_view(room: PartyRoom, viewer_id: str) -> dict:
    state = room.state or {}
    me = _find_player(state, user_id=viewer_id)
    phase = room.phase
    round_no = state.get("round", 0)
    alive = _alive_players(state)

    players_out = []
    for p in state.get("players") or []:
        base = p.get("display_name") or p.get("name") or "Player"
        is_self = p.get("user_id") == viewer_id
        item = {
            "player_id": p.get("player_id"),
            "user_id": p.get("user_id"),
            "name": f"{base} (你)" if is_self else base,
            "alive": p.get("alive", True),
            "is_self": is_self,
            "is_host": p.get("is_host", False),
            "seat": p.get("seat", 0),
            "role_confirmed": p.get("role_confirmed", False),
        }
        if is_self and p.get("role"):
            item["role"] = p["role"]
        players_out.append(item)

    my_role = me.get("role") if me else None
    can_speak = (
        phase == "day_discussion"
        and me
        and me.get("alive", True)
        and state.get("current_speaker_user_id") == viewer_id
    )
    can_wolf_kill = (
        phase == "night"
        and me
        and me.get("alive", True)
        and me.get("role") == "werewolf"
    )
    can_vote = phase == "vote" and me and me.get("alive", True)

    wolf_targets = []
    if can_wolf_kill:
        wolf_targets = [
            {"player_id": p["player_id"], "name": p.get("display_name") or p.get("name")}
            for p in alive
            if p.get("role") != "werewolf"
        ]

    vote_targets = []
    if can_vote:
        vote_targets = [
            {"player_id": p["player_id"], "name": p.get("display_name") or p.get("name")}
            for p in alive
            if p.get("user_id") != viewer_id
        ]

    speaker_name = ""
    sid = state.get("current_speaker_user_id")
    if sid:
        sp = _find_player(state, user_id=sid)
        if sp:
            speaker_name = sp.get("display_name") or sp.get("name") or ""

    wolf_votes = state.get("wolf_votes") or {}
    alive_wolves = [p for p in alive if p.get("role") == "werewolf"]

    return {
        "room_id": room.id,
        "title": room.title,
        "invite_code": room.invite_code,
        "phase": phase,
        "status": room.status,
        "round": round_no,
        "min_players": MIN_PLAYERS,
        "max_players": room.max_players,
        "player_count": len(state.get("players") or []),
        "is_host": room.host_user_id == viewer_id,
        "my_player_id": me.get("player_id") if me else None,
        "my_role": my_role,
        "can_speak": can_speak,
        "can_wolf_kill": can_wolf_kill,
        "can_vote": can_vote,
        "speech_turn_name": speaker_name,
        "wolf_targets": wolf_targets,
        "vote_targets": vote_targets,
        "players": players_out,
        "feed": state.get("feed") or [],
        "winner": state.get("winner"),
        "wolf_votes_cast": len(wolf_votes),
        "wolf_votes_needed": len(alive_wolves),
        "reveal_on_death": state.get("reveal_on_death", True),
        "invited_user_ids": list(state.get("invited_user_ids") or []),
    }


def create_room(db: Session, user_id: str, *, title: str = "狼人杀 · 真实房间") -> dict:
    code = _invite_code()
    while db.scalar(select(PartyRoom.id).where(PartyRoom.invite_code == code)):
        code = _invite_code()

    display = _display_name(db, user_id)
    state = {
        "game_mode": GAME_MODE,
        "round": 0,
        "players": [{
            "user_id": user_id,
            "player_id": new_id()[:8],
            "name": display,
            "display_name": display,
            "alive": True,
            "role": None,
            "role_confirmed": False,
            "is_host": True,
            "seat": 0,
        }],
        "feed": [],
        "wolf_votes": {},
        "day_votes": {},
        "winner": None,
        "reveal_on_death": True,
        "current_speaker_user_id": None,
        "speech_queue": [],
        "speech_index": 0,
    }
    _append_feed(
        state,
        kind="host",
        text=f"欢迎来到 {title}！邀请好友加入，至少 {MIN_PLAYERS} 人即可开始。",
        text_native="",
        round_no=0,
    )

    room = PartyRoom(
        id=new_id(),
        host_user_id=user_id,
        template_id="werewolf_real",
        title=title,
        invite_code=code,
        phase="waiting",
        state=state,
        status="open",
        max_players=MAX_PLAYERS,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return _public_view(room, user_id)


def join_room(db: Session, invite_code: str, user_id: str) -> dict:
    room = db.scalar(select(PartyRoom).where(PartyRoom.invite_code == invite_code.upper()))
    if not room or room.status != "open":
        raise ValueError("Room not found")
    state = room.state or {}
    if state.get("game_mode") != GAME_MODE:
        raise ValueError("Not a werewolf room")
    if room.phase != "waiting":
        raise ValueError("Game already started")

    players: list[dict] = list(state.get("players") or [])
    if any(p["user_id"] == user_id for p in players):
        return _public_view(room, user_id)
    if len(players) >= room.max_players:
        raise ValueError("Room is full")

    display = _display_name(db, user_id)
    players.append({
        "user_id": user_id,
        "player_id": new_id()[:8],
        "name": display,
        "display_name": display,
        "alive": True,
        "role": None,
        "role_confirmed": False,
        "is_host": False,
        "seat": len(players),
    })
    state["players"] = players
    _append_feed(
        state,
        kind="system",
        text=f"{display} 加入了房间（{len(players)}/{MIN_PLAYERS}）",
        round_no=0,
    )
    room.state = state
    _save(room, db)
    db.refresh(room)
    return _public_view(room, user_id)


def get_room(db: Session, room_id: str, user_id: str) -> dict:
    room = _load(db, room_id)
    _ensure_member(room.state or {}, user_id)
    return _public_view(room, user_id)


def start_game(db: Session, room_id: str, user_id: str) -> dict:
    room = _load(db, room_id)
    if room.host_user_id != user_id:
        raise ValueError("Only host can start")
    if room.phase != "waiting":
        raise ValueError("Game already started")

    state = room.state or {}
    players = list(state.get("players") or [])
    if len(players) < MIN_PLAYERS:
        raise ValueError(f"Need at least {MIN_PLAYERS} players")

    wolves = _wolf_count(len(players))
    shuffled = players[:]
    random.shuffle(shuffled)
    for p in shuffled[:wolves]:
        p["role"] = "werewolf"
    for p in shuffled[wolves:]:
        p["role"] = "villager"
    for p in players:
        p["role_confirmed"] = False

    state["players"] = players
    state["round"] = 0
    state["wolf_votes"] = {}
    state["day_votes"] = {}
    room.phase = "role_reveal"
    _append_feed(
        state,
        kind="host",
        text="天黑请闭眼… 不对，还没天黑！请先查看你的身份牌，确认后 AI 主持人将发牌完毕并进入第一个夜晚。",
        text_native="Please check your role card. After everyone confirms, night falls.",
        round_no=0,
    )
    _append_feed(
        state,
        kind="host",
        text=f"本局 {len(players)} 人，{wolves} 名狼人。请依次查看身份并点击「确认身份」。",
        round_no=0,
    )
    room.state = state
    _save(room, db)
    db.refresh(room)
    return _public_view(room, user_id)


def confirm_role(db: Session, room_id: str, user_id: str) -> dict:
    room = _load(db, room_id)
    if room.phase != "role_reveal":
        raise ValueError("Not in role reveal phase")

    state = room.state or {}
    me = _ensure_member(state, user_id)
    me["role_confirmed"] = True
    display = me.get("display_name") or me.get("name")
    _append_feed(state, kind="system", text=f"{display} 已确认身份", round_no=0)

    players = state.get("players") or []
    if all(p.get("role_confirmed") for p in players):
        _begin_night(state, room)
    else:
        pending = sum(1 for p in players if not p.get("role_confirmed"))
        _append_feed(
            state,
            kind="host",
            text=f"还有 {pending} 位玩家未确认身份，请稍候…",
            round_no=state.get("round", 0),
        )

    room.state = state
    _save(room, db)
    db.refresh(room)
    return _public_view(room, user_id)


def _begin_night(state: dict, room: PartyRoom) -> None:
    state["round"] = int(state.get("round", 0)) + 1
    state["wolf_votes"] = {}
    state["day_votes"] = {}
    room.phase = "night"
    _append_feed(
        state,
        kind="host",
        text="天黑请闭眼。狼人请睁眼，选择一名玩家袭击。",
        text_native="Close your eyes. Werewolves, open your eyes and choose a victim.",
        round_no=state["round"],
    )


def submit_wolf_kill(db: Session, room_id: str, user_id: str, target_player_id: str) -> dict:
    room = _load(db, room_id)
    if room.phase != "night":
        raise ValueError("Not night phase")

    state = room.state or {}
    me = _ensure_member(state, user_id)
    if me.get("role") != "werewolf" or not me.get("alive", True):
        raise ValueError("Only living werewolves can kill")

    target = _find_player(state, player_id=target_player_id)
    if not target or not target.get("alive", True) or target.get("role") == "werewolf":
        raise ValueError("Invalid target")

    wolf_votes: dict[str, str] = dict(state.get("wolf_votes") or {})
    wolf_votes[user_id] = target_player_id
    state["wolf_votes"] = wolf_votes

    alive_wolves = [p for p in _alive_players(state) if p.get("role") == "werewolf"]
    if len(wolf_votes) < len(alive_wolves):
        _append_feed(
            state,
            kind="system",
            text="狼人阵营已收到部分投票，等待其他狼人…",
            round_no=state.get("round", 0),
        )
        room.state = state
        _save(room, db)
        db.refresh(room)
        return _public_view(room, user_id)

    tally: dict[str, int] = {}
    for tid in wolf_votes.values():
        tally[tid] = tally.get(tid, 0) + 1
    chosen = max(tally.items(), key=lambda x: x[1])[0]
    victim = _find_player(state, player_id=chosen)
    if victim:
        victim["alive"] = False
        name = victim.get("display_name") or victim.get("name")
        reveal = state.get("reveal_on_death", True)
        role_cn = "狼人" if victim.get("role") == "werewolf" else "村民"
        death_text = f"天亮了。昨晚 {name} 被狼人袭击，倒下了。"
        if reveal:
            death_text += f"（身份：{role_cn}）"
        _append_feed(
            state,
            kind="night",
            text=death_text,
            text_native=f"Day breaks. {name} was killed last night.",
            round_no=state.get("round", 0),
        )

    winner = _check_winner(state)
    if winner:
        state["winner"] = winner
        room.phase = "ended"
        _append_feed(
            state,
            kind="host",
            text="好人胜利！" if winner == "villagers" else "狼人胜利！",
            round_no=state.get("round", 0),
        )
    else:
        _begin_day_discussion(state, room)

    room.state = state
    _save(room, db)
    db.refresh(room)
    return _public_view(room, user_id)


def _begin_day_discussion(state: dict, room: PartyRoom) -> None:
    alive = _alive_players(state)
    queue = [p["user_id"] for p in sorted(alive, key=lambda x: x.get("seat", 0))]
    state["speech_queue"] = queue
    state["speech_index"] = 0
    state["current_speaker_user_id"] = queue[0] if queue else None
    room.phase = "day_discussion"

    first = _find_player(state, user_id=queue[0]) if queue else None
    first_name = (first.get("display_name") or first.get("name")) if first else ""
    _append_feed(
        state,
        kind="host",
        text=f"进入白天讨论。请 {first_name} 准备发言。",
        text_native=f"Day discussion. {first_name}, please prepare to speak.",
        round_no=state.get("round", 0),
    )


def submit_speech(db: Session, room_id: str, user_id: str, text: str) -> dict:
    room = _load(db, room_id)
    if room.phase != "day_discussion":
        raise ValueError("Not in discussion phase")

    state = room.state or {}
    if state.get("current_speaker_user_id") != user_id:
        raise ValueError("Not your turn to speak")

    me = _ensure_member(state, user_id)
    content = (text or "").strip()
    if not content:
        raise ValueError("Empty speech")

    feed = list(state.get("feed") or [])
    feed.append({
        "type": "speech",
        "speaker": me.get("display_name") or me.get("name"),
        "user_id": user_id,
        "player_id": me.get("player_id"),
        "round": state.get("round", 0),
        "text": content,
        "text_native": "",
    })
    state["feed"] = feed
    room.state = state
    _save(room, db)
    return end_speech(db, room_id, user_id)


def end_speech(db: Session, room_id: str, user_id: str) -> dict:
    room = _load(db, room_id)
    if room.phase != "day_discussion":
        raise ValueError("Not in discussion phase")

    state = room.state or {}
    if state.get("current_speaker_user_id") != user_id:
        raise ValueError("Not your turn")

    queue = list(state.get("speech_queue") or [])
    idx = int(state.get("speech_index", 0)) + 1
    state["speech_index"] = idx

    if idx >= len(queue):
        room.phase = "vote"
        state["day_votes"] = {}
        state["current_speaker_user_id"] = None
        _append_feed(
            state,
            kind="host",
            text="讨论结束，进入投票阶段。请选择你要放逐的玩家，可用语音或点选。",
            text_native="Discussion ended. Vote to eliminate a player.",
            round_no=state.get("round", 0),
        )
    else:
        next_uid = queue[idx]
        state["current_speaker_user_id"] = next_uid
        nxt = _find_player(state, user_id=next_uid)
        nname = (nxt.get("display_name") or nxt.get("name")) if nxt else ""
        _append_feed(
            state,
            kind="host",
            text=f"现在请 {nname} 发言。",
            text_native=f"{nname}, you may speak now.",
            round_no=state.get("round", 0),
        )

    room.state = state
    _save(room, db)
    db.refresh(room)
    return _public_view(room, user_id)


def submit_vote(
    db: Session, room_id: str, user_id: str, target_player_id: str, reason: str = "",
) -> dict:
    room = _load(db, room_id)
    if room.phase != "vote":
        raise ValueError("Not in vote phase")

    state = room.state or {}
    me = _ensure_member(state, user_id)
    if not me.get("alive", True):
        raise ValueError("Eliminated players cannot vote")

    target = _find_player(state, player_id=target_player_id)
    if not target or not target.get("alive", True) or target.get("user_id") == user_id:
        raise ValueError("Invalid vote target")

    day_votes: dict[str, str] = dict(state.get("day_votes") or {})
    day_votes[user_id] = target_player_id
    state["day_votes"] = day_votes

    alive = _alive_players(state)
    if len(day_votes) < len(alive):
        room.state = state
        _save(room, db)
        db.refresh(room)
        return _public_view(room, user_id)

    tally: dict[str, int] = {}
    for tid in day_votes.values():
        tally[tid] = tally.get(tid, 0) + 1
    max_votes = max(tally.values())
    top = [pid for pid, c in tally.items() if c == max_votes]
    chosen = random.choice(top)
    eliminated = _find_player(state, player_id=chosen)
    votes_detail = []
    for voter_uid, tgt_pid in day_votes.items():
        voter = _find_player(state, user_id=voter_uid)
        tgt = _find_player(state, player_id=tgt_pid)
        votes_detail.append({
            "voter": (voter.get("display_name") or voter.get("name")) if voter else "?",
            "target": (tgt.get("display_name") or tgt.get("name")) if tgt else "?",
        })

    if eliminated:
        eliminated["alive"] = False
        ename = eliminated.get("display_name") or eliminated.get("name")
        reveal = state.get("reveal_on_death", True)
        role_cn = "狼人" if eliminated.get("role") == "werewolf" else "村民"
        msg = f"投票结果：{ename} 被放逐。"
        if reveal:
            msg += f"（身份：{role_cn}）"
        if reason.strip():
            msg += f" 理由：{reason.strip()}"
        _append_feed(state, kind="vote", text=msg, round_no=state.get("round", 0))
        state["last_vote"] = {"votes": votes_detail, "eliminated": ename}

    winner = _check_winner(state)
    if winner:
        state["winner"] = winner
        room.phase = "ended"
        _append_feed(
            state,
            kind="host",
            text="好人胜利！" if winner == "villagers" else "狼人胜利！",
            round_no=state.get("round", 0),
        )
    else:
        _begin_night(state, room)

    room.state = state
    _save(room, db)
    db.refresh(room)
    return _public_view(room, user_id)


def _match_player_name(text: str, candidates: list[dict]) -> str | None:
    lowered = text.lower()
    for p in candidates:
        name = (p.get("display_name") or p.get("name") or "").strip()
        if not name:
            continue
        if name.lower() in lowered or lowered in name.lower():
            return p["player_id"]
    for p in candidates:
        name = (p.get("display_name") or p.get("name") or "").strip()
        for token in re.split(r"[\s,，、]+", lowered):
            if len(token) >= 2 and token in name.lower():
                return p["player_id"]
    return None


async def parse_voice_intent(
    db: Session,
    room_id: str,
    user_id: str,
    transcript: str,
    intent: str,
) -> dict:
    """Map ASR transcript to wolf kill or vote target; falls back to LLM when needed."""
    room = _load(db, room_id)
    state = room.state or {}
    view = _public_view(room, user_id)
    text = (transcript or "").strip()
    if not text:
        raise ValueError("Empty transcript")

    if intent == "wolf_kill":
        if not view.get("can_wolf_kill"):
            raise ValueError("Cannot wolf kill now")
        targets = [
            _find_player(state, player_id=t["player_id"])
            for t in view.get("wolf_targets") or []
        ]
        targets = [t for t in targets if t]
        pid = _match_player_name(text, targets)
        if not pid:
            from app.services.llm import get_fast_llm_provider
            from app.services.runtime_config import resolve_default_llm_provider

            names = [t.get("display_name") or t.get("name") for t in targets]
            provider = get_fast_llm_provider(db, resolve_default_llm_provider(db))
            data = await provider.complete_json(
                "Extract which player the werewolf wants to kill. Return JSON: {\"name\":\"exact name from list or empty\"}",
                f"Transcript: {text}\nCandidates: {names}",
                temperature=0,
                max_tokens=80,
            )
            pick = (data.get("name") or "").strip() if isinstance(data, dict) else ""
            for t in targets:
                n = t.get("display_name") or t.get("name")
                if n and pick.lower() in n.lower():
                    pid = t["player_id"]
                    break
        if not pid:
            raise ValueError("未能识别要袭击的目标，请重说或点选")
        return submit_wolf_kill(db, room_id, user_id, pid)

    if intent == "vote":
        if not view.get("can_vote"):
            raise ValueError("Cannot vote now")
        targets = [
            _find_player(state, player_id=t["player_id"])
            for t in view.get("vote_targets") or []
        ]
        targets = [t for t in targets if t]
        pid = _match_player_name(text, targets)
        if not pid:
            from app.services.llm import get_fast_llm_provider
            from app.services.runtime_config import resolve_default_llm_provider

            names = [t.get("display_name") or t.get("name") for t in targets]
            provider = get_fast_llm_provider(db, resolve_default_llm_provider(db))
            data = await provider.complete_json(
                "Extract vote target from transcript. Return JSON: {\"name\":\"exact name from list or empty\"}",
                f"Transcript: {text}\nCandidates: {names}",
                temperature=0,
                max_tokens=80,
            )
            pick = (data.get("name") or "").strip() if isinstance(data, dict) else ""
            for t in targets:
                n = t.get("display_name") or t.get("name")
                if n and pick.lower() in n.lower():
                    pid = t["player_id"]
                    break
        if not pid:
            raise ValueError("未能识别投票目标，请重说或点选")
        return submit_vote(db, room_id, user_id, pid, reason=text)

    raise ValueError("Unknown intent")


def invite_friend(db: Session, room_id: str, host_user_id: str, friend_user_id: str) -> dict:
    from app.services.friendship_service import are_friends

    room = _load(db, room_id)
    if room.host_user_id != host_user_id:
        raise ValueError("Only host can invite friends")
    if room.phase != "waiting":
        raise ValueError("Game already started")
    if not are_friends(db, host_user_id, friend_user_id):
        raise ValueError("只能邀请已成为好友的用户")

    state = room.state or {}
    players: list[dict] = list(state.get("players") or [])
    if any(p.get("user_id") == friend_user_id for p in players):
        raise ValueError("该好友已在房间中")
    if len(players) >= room.max_players:
        raise ValueError("Room is full")

    invited = list(state.get("invited_user_ids") or [])
    if friend_user_id not in invited:
        invited.append(friend_user_id)
    state["invited_user_ids"] = invited
    friend_name = _display_name(db, friend_user_id)
    _append_feed(
        state,
        kind="system",
        text=f"房主邀请了 {friend_name} 加入（邀请码 {room.invite_code}）",
        round_no=0,
    )
    room.state = state
    _save(room, db)
    db.refresh(room)
    return _public_view(room, host_user_id)


def list_pending_invites(db: Session, user_id: str) -> list[dict]:
    rooms = list(
        db.scalars(
            select(PartyRoom).where(
                PartyRoom.status == "open",
                PartyRoom.phase == "waiting",
            )
        )
    )
    items: list[dict] = []
    for room in rooms:
        state = room.state or {}
        if state.get("game_mode") != GAME_MODE:
            continue
        invited = state.get("invited_user_ids") or []
        if user_id not in invited:
            continue
        if any(p.get("user_id") == user_id for p in state.get("players") or []):
            continue
        host = db.get(User, room.host_user_id)
        items.append({
            "room_id": room.id,
            "title": room.title,
            "invite_code": room.invite_code,
            "host_name": host.username if host else "Host",
            "player_count": len(state.get("players") or []),
            "min_players": MIN_PLAYERS,
        })
    return items
