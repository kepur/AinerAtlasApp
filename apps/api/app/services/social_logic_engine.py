"""Social Logic Lite — single-user werewolf-style reasoning game engine.

MVP: one human player + 4-6 AI players, villagers vs werewolves, text turns.
Night auto-resolves, daytime AI speeches + user questions + voting, public
role reveal on elimination. AI speeches/answers are LLM-driven; each AI only
speaks from its own knowledge scope and never reveals hidden roles.

Game state is kept in-process (dict) — fine for the single-user MVP. A DB-backed
store can replace ``_GAMES`` later without changing the route surface.
"""
from __future__ import annotations

import logging
import random
import uuid

from sqlalchemy.orm import Session

from app.services.llm import require_llm_provider
from app.services.runtime_config import resolve_default_llm_provider

logger = logging.getLogger(__name__)

_GAMES: dict[str, dict] = {}

# AI player roster with light personalities (spec §15).
_ROSTER = [
    {"name": "Alex", "code": "A", "personality": "cautious, speaks conservatively"},
    {"name": "Blake", "code": "B", "personality": "assertive, quick to push back"},
    {"name": "Chris", "code": "C", "personality": "logical, points out contradictions"},
    {"name": "Dana", "code": "D", "personality": "nervous, may leak details"},
    {"name": "Evan", "code": "E", "personality": "social, likes to lead the rhythm"},
    {"name": "Finn", "code": "F", "personality": "calm, hard to read"},
]

_DIFFICULTY = {
    "easy": {"ai": 4, "wolves": 1, "reveal": True},
    "normal": {"ai": 5, "wolves": 1, "reveal": True},
    "hard": {"ai": 6, "wolves": 2, "reveal": False},
}


def _provider(db: Session):
    return require_llm_provider(resolve_default_llm_provider(db), db=db)


def _public_view(game: dict) -> dict:
    """State safe to send to the client — hides AI roles unless revealed."""
    players = []
    for p in game["players"]:
        players.append({
            "id": p["id"],
            "name": p["name"],
            "code": p["code"],
            "is_user": p["is_user"],
            "alive": p["alive"],
            "suspicion": p["suspicion"],
            "public_claim": p.get("public_claim", ""),
            # role only exposed for the user, eliminated (if reveal), or game end
            "role": p["role"] if (p["is_user"] or p.get("revealed") or game["phase"] == "ended") else None,
        })
    return {
        "game_id": game["game_id"],
        "difficulty": game["difficulty"],
        "round": game["round"],
        "phase": game["phase"],
        "target_language": game["target_language"],
        "native_language": game["native_language"],
        "players": players,
        "user_player_id": game["user_player_id"],
        "feed": game["feed"],
        "winner": game["winner"],
        "alive_count": sum(1 for p in game["players"] if p["alive"]),
        "total_count": len(game["players"]),
    }


def _alive(game: dict, *, role: str | None = None, exclude_user: bool = False) -> list[dict]:
    out = []
    for p in game["players"]:
        if not p["alive"]:
            continue
        if exclude_user and p["is_user"]:
            continue
        if role and p["role"] != role:
            continue
        out.append(p)
    return out


def _check_winner(game: dict) -> str | None:
    wolves = len(_alive(game, role="werewolf"))
    villagers = len(_alive(game)) - wolves
    if wolves == 0:
        return "villagers"
    if wolves >= villagers:
        return "werewolves"
    return None


async def create_game(db: Session, user_id: str, difficulty: str = "easy",
                      target_language: str = "en", native_language: str = "zh") -> dict:
    cfg = _DIFFICULTY.get(difficulty, _DIFFICULTY["easy"])
    roster = random.sample(_ROSTER, cfg["ai"])
    players: list[dict] = []
    for r in roster:
        players.append({
            "id": str(uuid.uuid4())[:8], "name": r["name"], "code": r["code"],
            "personality": r["personality"], "is_user": False, "alive": True,
            "role": "villager", "public_claim": "", "suspicion": random.randint(10, 35),
            "revealed": False,
        })
    # assign werewolves among AI
    for p in random.sample(players, cfg["wolves"]):
        p["role"] = "werewolf"
    user_pid = "you"
    players.append({
        "id": user_pid, "name": "You", "code": "You", "personality": "the human player",
        "is_user": True, "alive": True, "role": "villager", "public_claim": "",
        "suspicion": 0, "revealed": True,
    })

    game = {
        "game_id": str(uuid.uuid4()), "user_id": user_id, "difficulty": difficulty,
        "target_language": target_language, "native_language": native_language,
        "round": 1, "phase": "night", "players": players, "user_player_id": user_pid,
        "feed": [], "winner": None, "reveal_on_death": cfg["reveal"], "learning_turns": [],
    }
    _GAMES[game["game_id"]] = game

    game["feed"].append({"type": "host", "speaker": "AI Host", "round": 1,
                         "text": f"欢迎进入狼人杀 Lite。本局 {len(players)} 名玩家，{cfg['wolves']} 名狼人。你的身份：村民。",
                         "text_native": ""})
    await _resolve_night(db, game)
    await _generate_day_speeches(db, game)
    game["phase"] = "day_discussion"
    return _public_view(game)


async def _resolve_night(db: Session, game: dict) -> None:
    game["phase"] = "night"
    victims = _alive(game, exclude_user=True)
    villager_victims = [p for p in victims if p["role"] == "villager"]
    if villager_victims:
        victim = random.choice(villager_victims)
        victim["alive"] = False
        victim["revealed"] = game["reveal_on_death"]
        game["feed"].append({"type": "night", "speaker": "AI Host", "round": game["round"],
                             "text": f"昨晚 {victim['name']} 倒下了。现在进入白天发言阶段。", "text_native": ""})


async def _generate_day_speeches(db: Session, game: dict) -> None:
    alive_ai = _alive(game, exclude_user=True)
    if not alive_ai:
        return
    roster_desc = "\n".join(
        f"- {p['name']} ({p['code']}): role={p['role']}, personality={p['personality']}"
        for p in alive_ai
    )
    wolves = [p["name"] for p in _alive(game, role="werewolf")]
    system = (
        "You run AI players in a werewolf-style social deduction game. Generate ONE short "
        "daytime speech (1-2 sentences, in English) per ALIVE AI player. Rules: villagers "
        "share honest but limited observations; werewolves subtly deflect/mislead but NEVER "
        "reveal they are wolves; match each player's personality; keep it natural and short. "
        f"Werewolves (secret, do not reveal): {wolves}. "
        'Output strict JSON: {"speeches":[{"name":"...","text":"...","text_native":"<short Chinese gloss>"}]}'
    )
    user = f"Players this round:\n{roster_desc}\n\nRound {game['round']} daytime. Write each player's speech."
    try:
        data = await _provider(db).complete_json(system, user, temperature=0.85, max_tokens=900)
        speeches = data.get("speeches", []) if isinstance(data, dict) else []
    except Exception as exc:  # noqa: BLE001
        logger.warning("day speech generation failed: %s", exc)
        speeches = []
    by_name = {p["name"]: p for p in alive_ai}
    if speeches:
        for s in speeches:
            p = by_name.get(s.get("name", ""))
            text = (s.get("text") or "").strip()
            if p and text:
                p["public_claim"] = text
                game["feed"].append({"type": "speech", "speaker": p["name"], "player_id": p["id"],
                                     "round": game["round"], "text": text,
                                     "text_native": (s.get("text_native") or "").strip()})
    else:
        for p in alive_ai:
            game["feed"].append({"type": "speech", "speaker": p["name"], "player_id": p["id"],
                                 "round": game["round"], "text": "I didn't see anything unusual last night.",
                                 "text_native": "我昨晚没看到什么异常。"})


async def question_player(db: Session, game_id: str, user_id: str,
                          target_player_id: str, content: str) -> dict:
    game = _GAMES.get(game_id)
    if not game or game["user_id"] != user_id:
        raise ValueError("Game not found")
    if game["phase"] not in ("day_discussion",):
        raise ValueError("Not in discussion phase")
    target = next((p for p in game["players"] if p["id"] == target_player_id and not p["is_user"]), None)
    if not target or not target["alive"]:
        raise ValueError("Invalid target")

    target_name = "English"  # target language label kept simple for MVP
    system = (
        "You are the orchestrator of a werewolf-style reasoning game that ALSO teaches the user "
        f"to challenge other players in {target_name}. The user (a {game['native_language']} speaker) "
        f"wants to question/challenge player {target['name']}. Do TWO things and return strict JSON:\n"
        '1) "hud": teach the user how to say their challenge in English with 4 versions '
        '(natural, assertive, polite, deductive), why_this (2-3 items with point+explanation in Chinese), '
        'patterns (1-3 reusable challenge patterns with pattern+example+add_to_crush), '
        'vocabulary (3-5), agents (Logic Agent / Language Coach / Game Coach, each one short line).\n'
        f'2) "answer": player {target["name"]} (role hidden, personality={target["personality"]}) '
        "answers the challenge in character (1-2 English sentences) without revealing their role, "
        "plus a short Chinese gloss.\n"
        'JSON shape: {"hud":{"main_expression":"...","meaning_native":"...","variants":'
        '{"natural":"...","assertive":"...","polite":"...","deductive":"..."},'
        '"why_this_expression":[{"point":"...","explanation":"..."}],'
        '"patterns":[{"pattern":"...","example":"...","add_to_crush":true}],'
        '"vocabulary":["..."],"agents":[{"agent":"Logic Agent","result":"..."}]},'
        '"answer":{"text":"...","text_native":"..."}}'
    )
    user = f"User's challenge (may be Chinese): {content}\nTarget: {target['name']}."
    data = await _provider(db).complete_json(system, user, temperature=0.8, max_tokens=1200)
    hud = data.get("hud", {}) if isinstance(data, dict) else {}
    answer = data.get("answer", {}) if isinstance(data, dict) else {}

    # record user question + AI answer in the feed
    game["feed"].append({"type": "user_question", "speaker": "You", "round": game["round"],
                         "text": hud.get("main_expression", content), "text_native": content,
                         "target": target["name"]})
    ans_text = (answer.get("text") or "").strip()
    if ans_text:
        game["feed"].append({"type": "speech", "speaker": target["name"], "player_id": target["id"],
                             "round": game["round"], "text": ans_text,
                             "text_native": (answer.get("text_native") or "").strip()})
    # being questioned nudges suspicion up a little
    target["suspicion"] = min(95, target["suspicion"] + random.randint(6, 14))

    hud["v2"] = True
    hud["detected_intent"] = "expression_learning"
    game["learning_turns"].append(hud)
    return {"hud": hud, "answer": answer, "state": _public_view(game)}


async def cast_vote(db: Session, game_id: str, user_id: str,
                    target_player_id: str, reason: str = "") -> dict:
    game = _GAMES.get(game_id)
    if not game or game["user_id"] != user_id:
        raise ValueError("Game not found")
    if game["phase"] != "day_discussion":
        raise ValueError("Not votable now")
    target = next((p for p in game["players"] if p["id"] == target_player_id), None)
    if not target or not target["alive"]:
        raise ValueError("Invalid vote target")

    game["phase"] = "vote"
    tally: dict[str, int] = {}
    votes_log: list[dict] = []
    # user vote
    tally[target["id"]] = tally.get(target["id"], 0) + 1
    votes_log.append({"voter": "You", "target": target["name"], "reason": reason})
    # AI votes — weighted toward highest suspicion among alive (excluding self)
    for voter in _alive(game, exclude_user=True):
        candidates = [p for p in _alive(game) if p["id"] != voter["id"]]
        if not candidates:
            continue
        # werewolves avoid voting fellow wolves
        if voter["role"] == "werewolf":
            non_wolves = [c for c in candidates if c["role"] != "werewolf"]
            candidates = non_wolves or candidates
        weights = [max(1, c["suspicion"]) for c in candidates]
        choice = random.choices(candidates, weights=weights, k=1)[0]
        tally[choice["id"]] = tally.get(choice["id"], 0) + 1
        votes_log.append({"voter": voter["name"], "target": choice["name"], "reason": ""})

    eliminated_id = max(tally, key=tally.get)
    eliminated = next(p for p in game["players"] if p["id"] == eliminated_id)
    eliminated["alive"] = False
    eliminated["revealed"] = game["reveal_on_death"]
    game["feed"].append({"type": "vote_result", "speaker": "AI Host", "round": game["round"],
                         "text": f"{eliminated['name']} 被投票出局。" + (
                             f"身份：{'狼人' if eliminated['role'] == 'werewolf' else '村民'}。"
                             if game["reveal_on_death"] else "（身份不公开）"),
                         "text_native": "", "votes": votes_log})

    winner = _check_winner(game)
    if winner:
        game["winner"] = winner
        game["phase"] = "ended"
        game["feed"].append({"type": "host", "speaker": "AI Host", "round": game["round"],
                             "text": ("好人阵营胜利！" if winner == "villagers" else "狼人阵营胜利。"),
                             "text_native": ""})
    else:
        game["round"] += 1
        await _resolve_night(db, game)
        winner = _check_winner(game)
        if winner:
            game["winner"] = winner
            game["phase"] = "ended"
            game["feed"].append({"type": "host", "speaker": "AI Host", "round": game["round"],
                                 "text": ("好人阵营胜利！" if winner == "villagers" else "狼人阵营胜利。"),
                                 "text_native": ""})
        else:
            await _generate_day_speeches(db, game)
            game["phase"] = "day_discussion"
    return _public_view(game)


def get_game(game_id: str, user_id: str) -> dict:
    game = _GAMES.get(game_id)
    if not game or game["user_id"] != user_id:
        raise ValueError("Game not found")
    return _public_view(game)


async def summarize_game(db: Session, game_id: str, user_id: str) -> dict:
    game = _GAMES.get(game_id)
    if not game or game["user_id"] != user_id:
        raise ValueError("Game not found")
    # Aggregate challenge patterns the user practiced this game.
    patterns: list[str] = []
    for turn in game["learning_turns"]:
        for p in (turn.get("patterns") or []):
            pat = p.get("pattern") if isinstance(p, dict) else str(p)
            if pat and pat not in patterns:
                patterns.append(pat)
    return {
        "winner": game["winner"],
        "rounds": game["round"],
        "questions_asked": len(game["learning_turns"]),
        "patterns": patterns,
        "summary": ("好人阵营胜利！" if game["winner"] == "villagers"
                    else "狼人阵营胜利。" if game["winner"] == "werewolves" else "游戏进行中"),
    }
