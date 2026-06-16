"""Turtle Soup (海龟汤) — Situation Puzzle game engine.

Phases: lobby → story_reveal → questioning → solve → summary
The AI acts as Rule Judge: answers YES / NO / IRRELEVANT to user questions.
Clues are tracked; when enough clues found, user can attempt to solve.
"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models import GameSession
from app.services.game_engine import GameTypeEngine, register_engine
from app.services.llm import get_llm_provider_for_task
from app.services.runtime_config import resolve_default_llm_provider

logger = logging.getLogger(__name__)

# Built-in puzzles (can also come from GameTemplate.config)
_BUILTIN_CASES = {
    "passenger": {
        "title": "消失的乘客",
        "surface": "一个男人上了火车，在旅途中神秘消失。没人看到他下车，也没有人知道他去了哪里。发生了什么？",
        "surface_en": "A man boarded a train and mysteriously vanished during the journey. Nobody saw him get off. What happened?",
        "truth": "男人是一个间谍，他在火车穿过隧道时跳了下去，在隧道出口被同伙接应。火车员工以为他还在火车上，其实他从未到达终点站。",
        "truth_en": "The man was a spy. He jumped off during a tunnel passage and was picked up by his accomplices at the tunnel exit. The train crew assumed he was still aboard.",
        "clues": [
            {"keyword": "tunnel", "hint": "火车经过了一个隧道", "hint_en": "The train passed through a tunnel"},
            {"keyword": "spy", "hint": "男人的职业不是普通人", "hint_en": "The man's profession was not ordinary"},
            {"keyword": "jump", "hint": "男人是主动离开火车的", "hint_en": "The man left the train deliberately"},
            {"keyword": "accomplice", "hint": "有人在外面等他", "hint_en": "Someone was waiting for him outside"},
            {"keyword": "destination", "hint": "他从未到达目的地", "hint_en": "He never reached the destination"},
            {"keyword": "dark", "hint": "消失发生在看不见的时候", "hint_en": "The disappearance happened when visibility was zero"},
        ],
        "max_questions": 15,
    },
    "turtle_soup_classic": {
        "title": "经典海龟汤",
        "surface": "一个男人走进餐厅，点了一碗海龟汤，喝了一口后突然崩溃自杀。为什么？",
        "surface_en": "A man walked into a restaurant, ordered turtle soup, took one sip, and then killed himself. Why?",
        "truth": "男人曾经和妻子在海上遇难，在一个荒岛上，他妻子生病死了。他吃了一种汤活了下来，别人告诉他这是海龟汤。今天他第一次在餐厅喝到真正的海龟汤，发现味道不一样，才意识到当年喝的其实是妻子的肉。",
        "truth_en": "The man and his wife were shipwrecked. His wife died on the island. He survived by eating 'turtle soup' — which was actually made from his wife's flesh. When he tasted real turtle soup at the restaurant, he realized the truth.",
        "clues": [
            {"keyword": "shipwreck", "hint": "男人曾经历过海难", "hint_en": "The man survived a shipwreck"},
            {"keyword": "wife", "hint": "他的妻子与此事有关", "hint_en": "His wife was involved"},
            {"keyword": "island", "hint": "他们曾困在一个岛上", "hint_en": "They were stranded on an island"},
            {"keyword": "taste", "hint": "汤的味道是关键线索", "hint_en": "The taste of the soup is a crucial clue"},
            {"keyword": "real", "hint": "他之前喝的不是真正的海龟汤", "hint_en": "What he drank before was not real turtle soup"},
            {"keyword": "death", "hint": "有人在岛上死去了", "hint_en": "Someone died on the island"},
        ],
        "max_questions": 15,
    },
}


def _provider_for(task_type: str, db: Session):
    return get_llm_provider_for_task(task_type, resolve_default_llm_provider(db), db)


class TurtleSoupEngine(GameTypeEngine):
    game_type = "turtle_soup"

    async def init_session(self, session: GameSession, config: dict) -> dict:
        case_id = config.get("case_id", "passenger")
        case = _BUILTIN_CASES.get(case_id)
        if not case and config.get("surface"):
            case = config
        if not case:
            case = _BUILTIN_CASES["passenger"]

        session.title = case.get("title", "海龟汤")
        session.phase = "lobby"

        return {
            "case": {
                "surface": case["surface"],
                "surface_en": case.get("surface_en", ""),
                "truth": case["truth"],
                "truth_en": case.get("truth_en", ""),
                "clues": case.get("clues", []),
                "max_questions": case.get("max_questions", 15),
            },
            "found_clues": [],
            "questions_asked": 0,
            "question_log": [],
            "solved": False,
        }

    async def handle_turn(
        self, db: Session, session: GameSession, action_type: str,
        user_input: str, extra: dict,
    ) -> dict:
        state = dict(session.state)

        if action_type == "start":
            return self._start_game(session, state)

        if action_type in ("question", "message"):
            return await self._handle_question(db, session, state, user_input)

        if action_type == "solve":
            return await self._handle_solve(db, session, state, user_input)

        raise ValueError(f"Unknown action: {action_type}")

    def _start_game(self, session: GameSession, state: dict) -> dict:
        session.phase = "story_reveal"
        case = state["case"]
        feed = [
            {
                "type": "narrator",
                "text": "欢迎来到海龟汤！仔细阅读汤面故事，然后开始提问。",
                "text_en": "Welcome to Turtle Soup! Read the surface story carefully, then start asking questions.",
            },
            {
                "type": "story",
                "text": case["surface"],
                "text_en": case.get("surface_en", ""),
            },
        ]
        return {
            "state": state,
            "feed_items": feed,
            "ai_response": {"phase": "story_reveal"},
            "hud": {},
        }

    async def _handle_question(
        self, db: Session, session: GameSession, state: dict, user_input: str,
    ) -> dict:
        session.phase = "questioning"
        case = state["case"]
        state["questions_asked"] = state.get("questions_asked", 0) + 1

        system = (
            "你是海龟汤游戏的裁判。玩家会根据汤面故事提出是非问题，你根据汤底真相判断。\n\n"
            f"汤面：{case['surface']}\n\n"
            f"汤底（真相）：{case['truth']}\n\n"
            "规则：\n"
            "- 回答只能是 YES、NO 或 IRRELEVANT\n"
            "- 如果问题触及了关键线索，在 clue_hint 中给出模糊提示\n"
            "- 不要直接透露答案\n\n"
            "返回 JSON：\n"
            '{"answer":"YES/NO/IRRELEVANT",'
            '"clue_found":true/false,'
            '"clue_hint":"如果发现线索，给一个模糊的中文提示",'
            '"clue_hint_en":"English hint",'
            '"comment":"简短评价这个问题的质量（中文）",'
            '"comment_en":"Brief comment on question quality in English"}'
        )
        user_msg = (
            f"玩家的问题（可能是中文或英文）：{user_input}\n\n"
            f"已发现的线索数：{len(state.get('found_clues', []))}/{len(case.get('clues', []))}"
        )

        try:
            provider = _provider_for("game_ai_answer", db)
            data = await provider.complete_json(system, user_msg, temperature=0.5, max_tokens=500)
        except Exception as exc:
            logger.warning("turtle soup judge failed: %s", exc)
            data = {"answer": "IRRELEVANT", "comment": "系统暂时无法判断", "comment_en": "System cannot judge right now"}

        answer = (data.get("answer") or "IRRELEVANT").upper()
        if answer not in ("YES", "NO", "IRRELEVANT"):
            answer = "IRRELEVANT"

        if data.get("clue_found"):
            hint = data.get("clue_hint", "新线索")
            if hint not in [c.get("hint", "") for c in state.get("found_clues", [])]:
                state.setdefault("found_clues", []).append({
                    "hint": hint,
                    "hint_en": data.get("clue_hint_en", "New clue"),
                    "from_question": user_input,
                })

        state.setdefault("question_log", []).append({
            "question": user_input,
            "answer": answer,
            "comment": data.get("comment", ""),
        })

        feed = [
            {"type": "user_question", "text": user_input},
            {
                "type": "judge_answer",
                "answer": answer,
                "comment": data.get("comment", ""),
                "comment_en": data.get("comment_en", ""),
            },
        ]

        if data.get("clue_found"):
            feed.append({
                "type": "clue_found",
                "text": data.get("clue_hint", ""),
                "text_en": data.get("clue_hint_en", ""),
                "total_found": len(state.get("found_clues", [])),
                "total_clues": len(case.get("clues", [])),
            })

        hud = await self._generate_hud(db, session, user_input, answer, data)

        return {
            "state": state,
            "feed_items": feed,
            "ai_response": {"answer": answer, "clue_found": data.get("clue_found", False)},
            "hud": hud,
        }

    async def _handle_solve(
        self, db: Session, session: GameSession, state: dict, user_input: str,
    ) -> dict:
        case = state["case"]

        system = (
            "你是海龟汤裁判。玩家尝试猜测汤底真相。判断是否正确。\n\n"
            f"真相：{case['truth']}\n\n"
            "评判标准：\n"
            "- 如果玩家的推理包含了核心真相的关键要素（70%以上），判为 CORRECT\n"
            "- 如果部分正确但缺少关键信息，判为 PARTIAL\n"
            "- 如果完全错误，判为 WRONG\n\n"
            '返回 JSON：{"verdict":"CORRECT/PARTIAL/WRONG","explanation":"中文解释","explanation_en":"English explanation","score":0-100}'
        )
        user_msg = f"玩家的猜测：{user_input}"

        try:
            provider = _provider_for("game_reasoning", db)
            data = await provider.complete_json(system, user_msg, temperature=0.3, max_tokens=600)
        except Exception as exc:
            logger.warning("turtle soup solve judge failed: %s", exc)
            data = {"verdict": "WRONG", "explanation": "系统判断失败", "score": 0}

        verdict = (data.get("verdict") or "WRONG").upper()
        ended = verdict in ("CORRECT", "PARTIAL")

        if ended:
            session.phase = "solve"
            state["solved"] = True
            session.score = data.get("score", 80 if verdict == "CORRECT" else 50)
        else:
            session.phase = "questioning"

        feed = [
            {"type": "user_solve", "text": user_input},
            {
                "type": "verdict",
                "verdict": verdict,
                "explanation": data.get("explanation", ""),
                "explanation_en": data.get("explanation_en", ""),
            },
        ]

        if ended:
            feed.append({
                "type": "truth_reveal",
                "text": case["truth"],
                "text_en": case.get("truth_en", ""),
            })

        return {
            "state": state,
            "feed_items": feed,
            "ai_response": data,
            "hud": {},
            "ended": ended,
            "score": session.score,
        }

    async def _generate_hud(
        self, db: Session, session: GameSession,
        user_input: str, answer: str, judge_data: dict,
    ) -> dict:
        native = session.native_language
        target = session.target_language

        system = (
            f"你是英语表达教练。用户在海龟汤游戏中用中文或英文提了一个问题。"
            f"生成学习HUD帮助用户学习如何用{target}更好地提问。\n\n"
            "返回JSON：\n"
            '{"main_expression":"用户问题的标准英文表达，1句不超18词",'
            f'"meaning_native":"{native}翻译",'
            '"variants":{{"natural":"自然口语","formal":"正式提问","detective":"侦探式提问","advanced":"高级表达"}},'
            f'"why_this_expression":[{{"point":"要点","explanation":"{native}解释"}}],'
            '"patterns_v2":[{"pattern":"句型","example":"例句","add_to_crush":true}],'
            '"vocabulary":["关键词1","关键词2","关键词3"],'
            f'"agents":[{{"agent":"Question Coach","result":"{native}评价提问技巧"}},{{"agent":"Language Coach","result":"{native}点评表达"}},{{"agent":"Game Coach","result":"{native}给策略建议"}}]'
            "}"
        )
        user_msg = f"用户的提问：{user_input}\n裁判回答：{answer}\n裁判评价：{judge_data.get('comment', '')}"

        try:
            provider = _provider_for("game_challenge_hud", db)
            hud = await provider.complete_json(system, user_msg, temperature=0.7, max_tokens=900)
        except Exception as exc:
            logger.warning("turtle soup HUD failed: %s", exc)
            hud = {}

        for a in (hud.get("agents") or []):
            if "name" in a and "agent" not in a:
                a["agent"] = a.pop("name")

        if "main_expression" not in hud:
            hud["main_expression"] = hud.pop("main_reply_target", hud.pop("expression", ""))
        if "meaning_native" not in hud:
            hud["meaning_native"] = hud.pop("main_reply_native", hud.pop("meaning", ""))

        hud["v2"] = True
        hud["detected_intent"] = "expression_learning"
        return hud

    async def get_summary(self, db: Session, session: GameSession) -> dict:
        state = session.state or {}
        patterns = []
        vocab = []
        expressions = []

        for turn in session.turns:
            hud = turn.hud or {}
            expr = hud.get("main_expression", "")
            if expr:
                expressions.append(expr)
            for p in (hud.get("patterns_v2") or []):
                pat = p.get("pattern") if isinstance(p, dict) else str(p)
                if pat and pat not in patterns:
                    patterns.append(pat)
            for v in (hud.get("vocabulary") or []):
                if v and v not in vocab:
                    vocab.append(v)

        return {
            "solved": state.get("solved", False),
            "questions_asked": state.get("questions_asked", 0),
            "clues_found": len(state.get("found_clues", [])),
            "total_clues": len(state.get("case", {}).get("clues", [])),
            "score": session.score,
            "patterns": patterns,
            "vocabulary": vocab,
            "expressions": expressions,
            "summary": "恭喜破案！" if state.get("solved") else "游戏进行中",
        }

    def get_state_view(self, session: GameSession, user_id: str) -> dict:
        state = session.state or {}
        case = state.get("case", {})
        return {
            "surface": case.get("surface", ""),
            "surface_en": case.get("surface_en", ""),
            "found_clues": state.get("found_clues", []),
            "questions_asked": state.get("questions_asked", 0),
            "max_questions": case.get("max_questions", 15),
            "solved": state.get("solved", False),
        }


register_engine(TurtleSoupEngine())
