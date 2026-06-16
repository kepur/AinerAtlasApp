"""Social Logic Lite — single-user werewolf-style reasoning game engine.

Phases: lobby → dealing → role_reveal → night → day_discussion → vote → result → ended
AI speeches/answers driven by LLM (dual-tier: quality for reasoning, cheap for gloss).
State kept in-process (_GAMES dict). DB persistence can replace it later.
"""
from __future__ import annotations

import logging
import random
import uuid

from sqlalchemy.orm import Session

from app.services.llm import get_llm_provider_for_task
from app.services.runtime_config import resolve_default_llm_provider

logger = logging.getLogger(__name__)

_GAMES: dict[str, dict] = {}

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


def _provider_for(task_type: str, db: Session):
    return get_llm_provider_for_task(task_type, resolve_default_llm_provider(db), db)


def _public_view(game: dict) -> dict:
    players = []
    for p in game["players"]:
        show_role = (
            p["is_user"]
            or p.get("revealed")
            or game["phase"] == "ended"
        )
        players.append({
            "id": p["id"], "name": p["name"], "code": p["code"],
            "is_user": p["is_user"], "alive": p["alive"],
            "suspicion": p["suspicion"],
            "public_claim": p.get("public_claim", ""),
            "role": p["role"] if show_role else None,
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
        "user_role": game.get("user_role"),
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


# ─────────────────────────────────────────────────
# Phase 1: CREATE → lobby
# ─────────────────────────────────────────────────

async def create_game(
    db: Session, user_id: str, difficulty: str = "easy",
    target_language: str = "en", native_language: str = "zh",
) -> dict:
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

    user_pid = "you"
    players.append({
        "id": user_pid, "name": "You", "code": "You", "personality": "the human player",
        "is_user": True, "alive": True, "role": "villager", "public_claim": "",
        "suspicion": 0, "revealed": True,
    })

    game = {
        "game_id": str(uuid.uuid4()), "user_id": user_id, "difficulty": difficulty,
        "target_language": target_language, "native_language": native_language,
        "round": 0, "phase": "lobby", "players": players, "user_player_id": user_pid,
        "feed": [], "winner": None, "reveal_on_death": cfg["reveal"],
        "learning_turns": [], "user_role": None,
        "wolves_count": cfg["wolves"],
    }

    game["feed"].append({
        "type": "host", "speaker": "AI Host", "round": 0,
        "text": f"欢迎来到狼人杀 Lite！本局 {len(players)} 名玩家，其中 {cfg['wolves']} 名狼人。准备好了就开始发牌吧。",
        "text_native": "",
    })
    _GAMES[game["game_id"]] = game
    return _public_view(game)


# ─────────────────────────────────────────────────
# Phase 2: DEAL → role_reveal
# ─────────────────────────────────────────────────

async def deal_cards(db: Session, game_id: str, user_id: str) -> dict:
    game = _get_game(game_id, user_id)
    if game["phase"] != "lobby":
        raise ValueError("Can only deal in lobby phase")

    cfg = _DIFFICULTY.get(game["difficulty"], _DIFFICULTY["easy"])

    ai_players = [p for p in game["players"] if not p["is_user"]]
    for p in ai_players:
        p["role"] = "villager"
    for p in random.sample(ai_players, cfg["wolves"]):
        p["role"] = "werewolf"

    user_p = next(p for p in game["players"] if p["is_user"])
    user_p["role"] = "villager"
    game["user_role"] = "villager"

    game["phase"] = "role_reveal"
    game["feed"].append({
        "type": "host", "speaker": "AI Host", "round": 0,
        "text": "牌已发好。翻开你的身份牌吧！",
        "text_native": "",
    })
    return _public_view(game)


# ─────────────────────────────────────────────────
# Phase 3: START → night + day_discussion
# ─────────────────────────────────────────────────

async def start_game(db: Session, game_id: str, user_id: str) -> dict:
    game = _get_game(game_id, user_id)
    if game["phase"] != "role_reveal":
        raise ValueError("Can only start after role reveal")

    game["round"] = 1
    await _resolve_night(db, game)

    winner = _check_winner(game)
    if winner:
        game["winner"] = winner
        game["phase"] = "ended"
    else:
        await _generate_day_speeches(db, game)
        game["phase"] = "day_discussion"

    return _public_view(game)


# ─────────────────────────────────────────────────
# Night resolution (rule-based, no LLM)
# ─────────────────────────────────────────────────

async def _resolve_night(db: Session, game: dict) -> None:
    game["phase"] = "night"
    victims = _alive(game, exclude_user=True)
    villager_victims = [p for p in victims if p["role"] == "villager"]
    if villager_victims:
        victim = random.choice(villager_victims)
        victim["alive"] = False
        victim["revealed"] = game["reveal_on_death"]
        game["feed"].append({
            "type": "night", "speaker": "AI Host", "round": game["round"],
            "text": f"昨晚 {victim['name']} 被狼人袭击倒下了。"
                    + (f"（身份揭示：{'狼人' if victim['role'] == 'werewolf' else '村民'}）"
                       if game["reveal_on_death"] else ""),
            "text_native": "",
        })
    game["feed"].append({
        "type": "host", "speaker": "AI Host", "round": game["round"],
        "text": "天亮了，进入白天讨论阶段。请仔细听每位玩家的发言。",
        "text_native": "",
    })


# ─────────────────────────────────────────────────
# Day speeches (one LLM call for ALL alive AI)
# ─────────────────────────────────────────────────

async def _generate_day_speeches(db: Session, game: dict) -> None:
    alive_ai = _alive(game, exclude_user=True)
    if not alive_ai:
        return

    wolves_names = [p["name"] for p in _alive(game, role="werewolf")]
    recent_events = game["feed"][-6:]
    events_desc = "\n".join(f"  [{e['type']}] {e['speaker']}: {e['text']}" for e in recent_events)

    player_lines = []
    for p in alive_ai:
        scope = f"role={p['role']}, personality={p['personality']}"
        if p["role"] == "werewolf":
            scope += f", knows wolves are: {wolves_names}"
        player_lines.append(f"- {p['name']} ({p['code']}): {scope}")

    system = (
        "你是狼人杀游戏的 AI 主持人。为每个存活的 AI 玩家生成一段白天发言。\n\n"
        "规则：\n"
        "- 每个玩家说 1-2 句英文，符合其性格\n"
        "- 村民：基于公开信息做出合理推理，语气真诚\n"
        "- 狼人：巧妙伪装，可以适度甩锅给其他村民，但不能暴露自己是狼人\n"
        "- 每个发言附一句简短中文翻译\n\n"
        '输出严格 JSON：\n{"speeches":[{"name":"玩家名","text":"英文发言","text_native":"中文翻译"}]}'
    )
    user = (
        f"第 {game['round']} 轮白天。\n\n"
        f"最近事件：\n{events_desc}\n\n"
        f"存活玩家：\n" + "\n".join(player_lines)
    )
    try:
        provider = _provider_for("game_ai_speech", db)
        data = await provider.complete_json(system, user, temperature=0.85, max_tokens=900)
        speeches = data.get("speeches", []) if isinstance(data, dict) else []
    except Exception as exc:
        logger.warning("day speech generation failed: %s", exc)
        speeches = []

    by_name = {p["name"]: p for p in alive_ai}
    if speeches:
        for s in speeches:
            p = by_name.get(s.get("name", ""))
            text = (s.get("text") or "").strip()
            if p and text:
                p["public_claim"] = text
                game["feed"].append({
                    "type": "speech", "speaker": p["name"], "player_id": p["id"],
                    "round": game["round"], "text": text,
                    "text_native": (s.get("text_native") or "").strip(),
                })
    else:
        for p in alive_ai:
            fallback = "I didn't notice anything unusual last night."
            p["public_claim"] = fallback
            game["feed"].append({
                "type": "speech", "speaker": p["name"], "player_id": p["id"],
                "round": game["round"], "text": fallback,
                "text_native": "我昨晚没注意到什么异常。",
            })


# ─────────────────────────────────────────────────
# Question player (HUD + answer, ONE LLM call)
# ─────────────────────────────────────────────────

async def question_player(
    db: Session, game_id: str, user_id: str,
    target_player_id: str, content: str,
) -> dict:
    game = _get_game(game_id, user_id)
    if game["phase"] != "day_discussion":
        raise ValueError("Not in discussion phase")
    target = next(
        (p for p in game["players"] if p["id"] == target_player_id and not p["is_user"]),
        None,
    )
    if not target or not target["alive"]:
        raise ValueError("Invalid target")

    native = game["native_language"]
    target_lang = game["target_language"]

    system = (
        "你同时扮演两个角色：英语表达教练和狼人杀AI玩家。"
        f"用户（{native}母语）想质疑玩家 {target['name']}。"
        "返回严格JSON，包含hud和answer两个顶层键。"
        "\n\nhud对象的字段："
        "\n- main_expression: 用户质疑的英文表达，1句，不超过18个英文词"
        f"\n- meaning_native: {native}翻译"
        "\n- variants: 对象，4个键 natural/assertive/polite/deductive，各一句英文"
        f"\n- why_this_expression: 数组，2-3个对象，每个有point和explanation，都用{native}写"
        "\n- patterns_v2: 数组，1-3个对象，每个有pattern/example/add_to_crush(true)"
        "\n- vocabulary: 字符串数组，3-5个关键英文单词"
        f"\n- agents: 数组，3个对象：Logic Agent分析质疑逻辑、Language Coach点评表达、Game Coach给策略建议，result都用{native}写"
        f"\n\nanswer对象：{target['name']}的回应"
        f"\n- 性格：{target['personality']}"
        f"\n- 身份：{'狼人，必须隐藏身份巧妙辩解' if target['role'] == 'werewolf' else '村民，诚实回应'}"
        "\n- text: 1-2句英文"
        f"\n- text_native: {native}翻译"
    )
    user_msg = (
        f"用户的质疑内容（可能是中文）：{content}\n"
        f"目标玩家：{target['name']}\n"
        f"该玩家之前说过：{target.get('public_claim', '无')}"
    )
    try:
        provider = _provider_for("game_challenge_hud", db)
        data = await provider.complete_json(system, user_msg, temperature=0.8, max_tokens=1200)
    except Exception as exc:
        logger.warning("question_player LLM failed: %s", exc)
        data = {}

    hud = data.get("hud", {}) if isinstance(data, dict) else {}
    answer = data.get("answer", {}) if isinstance(data, dict) else {}

    game["feed"].append({
        "type": "user_question", "speaker": "You", "round": game["round"],
        "text": hud.get("main_expression", content), "text_native": content,
        "target": target["name"],
    })
    ans_text = (answer.get("text") or "").strip()
    if ans_text:
        game["feed"].append({
            "type": "speech", "speaker": target["name"], "player_id": target["id"],
            "round": game["round"], "text": ans_text,
            "text_native": (answer.get("text_native") or "").strip(),
        })

    target["suspicion"] = min(95, target["suspicion"] + random.randint(6, 14))

    for a in (hud.get("agents") or []):
        if "name" in a and "agent" not in a:
            a["agent"] = a.pop("name")

    hud["v2"] = True
    hud["detected_intent"] = "expression_learning"
    game["learning_turns"].append(hud)

    return {"hud": hud, "answer": answer, "state": _public_view(game)}


# ─────────────────────────────────────────────────
# Vote
# ─────────────────────────────────────────────────

async def cast_vote(
    db: Session, game_id: str, user_id: str,
    target_player_id: str, reason: str = "",
) -> dict:
    game = _get_game(game_id, user_id)
    if game["phase"] != "day_discussion":
        raise ValueError("Not votable now")
    target = next((p for p in game["players"] if p["id"] == target_player_id), None)
    if not target or not target["alive"]:
        raise ValueError("Invalid vote target")

    game["phase"] = "vote"
    tally: dict[str, int] = {}
    votes_log: list[dict] = []

    tally[target["id"]] = tally.get(target["id"], 0) + 1
    votes_log.append({"voter": "You", "target": target["name"], "reason": reason})

    for voter in _alive(game, exclude_user=True):
        candidates = [p for p in _alive(game) if p["id"] != voter["id"]]
        if not candidates:
            continue
        if voter["role"] == "werewolf":
            non_wolves = [c for c in candidates if c["role"] != "werewolf"]
            candidates = non_wolves or candidates
        weights = [max(1, c["suspicion"]) for c in candidates]
        choice = random.choices(candidates, weights=weights, k=1)[0]
        tally[choice["id"]] = tally.get(choice["id"], 0) + 1
        votes_log.append({"voter": voter["name"], "target": choice["name"], "reason": ""})

    eliminated_id = max(tally, key=tally.get)  # type: ignore[arg-type]
    eliminated = next(p for p in game["players"] if p["id"] == eliminated_id)
    eliminated["alive"] = False
    eliminated["revealed"] = game["reveal_on_death"]

    role_text = ""
    if game["reveal_on_death"]:
        role_text = f"身份揭示：{'狼人' if eliminated['role'] == 'werewolf' else '村民'}。"

    game["feed"].append({
        "type": "vote_result", "speaker": "AI Host", "round": game["round"],
        "text": f"{eliminated['name']} 被投票出局。{role_text}",
        "text_native": "", "votes": votes_log,
    })

    winner = _check_winner(game)
    if winner:
        game["winner"] = winner
        game["phase"] = "ended"
        game["feed"].append({
            "type": "host", "speaker": "AI Host", "round": game["round"],
            "text": "好人阵营胜利！" if winner == "villagers" else "狼人阵营胜利。",
            "text_native": "",
        })
    else:
        game["round"] += 1
        await _resolve_night(db, game)
        winner = _check_winner(game)
        if winner:
            game["winner"] = winner
            game["phase"] = "ended"
            game["feed"].append({
                "type": "host", "speaker": "AI Host", "round": game["round"],
                "text": "好人阵营胜利！" if winner == "villagers" else "狼人阵营胜利。",
                "text_native": "",
            })
        else:
            await _generate_day_speeches(db, game)
            await _detect_contradictions(db, game)
            game["phase"] = "day_discussion"

    return _public_view(game)


# ─────────────────────────────────────────────────
# Contradiction detection (after day speeches)
# ─────────────────────────────────────────────────

async def _detect_contradictions(db: Session, game: dict) -> None:
    if game["round"] < 2:
        return
    speeches = [
        e for e in game["feed"]
        if e["type"] == "speech" and e.get("round", 0) >= game["round"] - 1
    ]
    if len(speeches) < 3:
        return

    speech_text = "\n".join(f"- {s['speaker']}: \"{s['text']}\"" for s in speeches[-8:])
    system = (
        "你是狼人杀矛盾检测器。分析最近的玩家发言，找出逻辑矛盾或可疑之处。\n\n"
        "规则：\n"
        "- 只输出真正有意义的矛盾（前后说法不一致、互相矛盾等），没有就返回空数组\n"
        "- 每条矛盾用中文描述，让玩家能据此做出判断\n\n"
        '输出 JSON：{"contradictions":[{"players":["名字1","名字2"],"hint":"中文矛盾描述"}]}'
    )
    user_msg = f"最近发言：\n{speech_text}"
    try:
        provider = _provider_for("game_reasoning", db)
        data = await provider.complete_json(system, user_msg, temperature=0.6, max_tokens=500)
        items = data.get("contradictions", []) if isinstance(data, dict) else []
    except Exception as exc:
        logger.warning("contradiction detection failed: %s", exc)
        return

    for item in items[:2]:
        hint = item.get("hint", "")
        players_involved = item.get("players", [])
        if hint:
            game["feed"].append({
                "type": "contradiction", "speaker": "AI Host", "round": game["round"],
                "text": hint, "text_native": "",
                "players_involved": players_involved,
            })


# ─────────────────────────────────────────────────
# Get / Summary
# ─────────────────────────────────────────────────

def get_game(game_id: str, user_id: str) -> dict:
    return _public_view(_get_game(game_id, user_id))


async def summarize_game(db: Session, game_id: str, user_id: str) -> dict:
    game = _get_game(game_id, user_id)
    patterns: list[str] = []
    for turn in game["learning_turns"]:
        for p in (turn.get("patterns_v2") or turn.get("patterns") or []):
            pat = p.get("pattern") if isinstance(p, dict) else str(p)
            if pat and pat not in patterns:
                patterns.append(pat)

    vocab: list[str] = []
    for turn in game["learning_turns"]:
        for v in (turn.get("vocabulary") or []):
            if v and v not in vocab:
                vocab.append(v)

    expressions: list[str] = []
    for turn in game["learning_turns"]:
        expr = turn.get("main_expression", "")
        if expr:
            expressions.append(expr)

    return {
        "winner": game["winner"],
        "rounds": game["round"],
        "questions_asked": len(game["learning_turns"]),
        "patterns": patterns,
        "vocabulary": vocab,
        "expressions": expressions,
        "summary": (
            "好人阵营胜利！" if game["winner"] == "villagers"
            else "狼人阵营胜利。" if game["winner"] == "werewolves"
            else "游戏进行中"
        ),
    }


# ─────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────

def _get_game(game_id: str, user_id: str) -> dict:
    game = _GAMES.get(game_id)
    if not game or game["user_id"] != user_id:
        raise ValueError("Game not found")
    return game
