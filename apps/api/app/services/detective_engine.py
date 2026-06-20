"""Detective Case (AI侦探) game engine.

Phases: lobby → briefing → investigating → interrogation → deduction → summary
Player investigates a crime scene, interrogates suspects, collects clues, and submits deduction.
"""
from __future__ import annotations

import json
import logging
import re

from sqlalchemy.orm import Session

from app.models import GameSession, new_id
from app.services.game_engine import GameTypeEngine, register_engine
from app.services.llm import get_llm_provider_for_task
from app.services.runtime_config import resolve_default_llm_provider

logger = logging.getLogger(__name__)

_BUILTIN_CASES = {
    "cafe_lie": {
        "title": "咖啡馆的谎言",
        "subtitle": "推理 · 谋杀案",
        "description": "咖啡馆老板被杀，4名嫌疑人各有说辞。谁在说谎？",
        "scene": "昨晚9:00左右，魔咖馆老板在店内后门被发现死亡。死因：头部重击。凶器不在现场。当晚店内共有4人。",
        "scene_en": "Around 9 PM last night, the owner of Magic Café was found dead near the back door. Cause of death: blunt force trauma. The murder weapon is missing. Four people were in the shop that evening.",
        "suspects": [
            {
                "id": "anna", "name": "Anna", "name_en": "Anna",
                "role": "服务员",
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
                "personality": "紧张易怒，说话时经常眼神飘忽",
                "alibi": "一直在吧台工作，大概9点看到老板从办公室出来",
                "alibi_en": "Was working at the bar the whole time, saw the boss come out of office around 9",
                "secret": "她和老板有债务纠纷，老板欠她三个月工资",
                "is_culprit": False,
                "trust": 50,
            },
            {
                "id": "mark", "name": "Mark", "name_en": "Mark",
                "role": "合伙人",
                "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
                "personality": "镇定自若，逻辑清晰但过于冷静",
                "alibi": "在办公室处理账目，听到声响后出来查看",
                "alibi_en": "Was handling accounts in the office, came out after hearing a noise",
                "secret": "他发现老板在挪用合伙资金，正在准备起诉",
                "is_culprit": True,
                "trust": 60,
            },
            {
                "id": "leo", "name": "Leo", "name_en": "Leo",
                "role": "常客",
                "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
                "personality": "热心但神经质，说话前后矛盾",
                "alibi": "在角落喝咖啡看书，什么都没注意到",
                "alibi_en": "Was reading in the corner, didn't notice anything",
                "secret": "他其实是老板的前女友的弟弟，来监视老板",
                "is_culprit": False,
                "trust": 40,
            },
            {
                "id": "tom", "name": "Tom", "name_en": "Tom",
                "role": "外卖员",
                "avatar_url": "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&q=80&w=150",
                "personality": "匆忙急躁，极力想证明自己清白",
                "alibi": "8:50送完外卖就离开了，9:10才回来取忘记的头盔",
                "alibi_en": "Left after delivery at 8:50, came back at 9:10 for forgotten helmet",
                "secret": "他偷偷从后门溜进来拿外卖小费箱里的钱",
                "is_culprit": False,
                "trust": 35,
            },
        ],
        "clues": [
            {"id": "wet_umbrella", "title": "湿伞", "title_en": "Wet umbrella", "image_url": "https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?auto=format&fit=crop&q=80&w=300", "desc": "这把伞是湿的，但当天没有下雨。", "desc_en": "The umbrella is wet, but it didn't rain.", "points_to": "mark"},
            {"id": "three_cups", "title": "三个杯子", "title_en": "Three cups", "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=300", "desc": "桌上有三个杯子，但只有两人喝了咖啡。", "desc_en": "Three cups on the table, but only two people drank coffee.", "points_to": "leo"},
            {"id": "torn_note", "title": "撕碎的纸条", "title_en": "Torn note", "image_url": "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=300", "desc": "垃圾桶里有一张被撕碎的纸条。", "desc_en": "A torn note was found in the trash.", "points_to": "mark"},
            {"id": "back_key", "title": "后门钥匙", "title_en": "Back door key", "image_url": "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&q=80&w=300", "desc": "钥匙上的指纹不属于老板。", "desc_en": "The fingerprints on the key don't belong to the owner.", "points_to": "mark"},
            {"id": "cctv_gap", "title": "监控盲区", "title_en": "CCTV gap", "image_url": "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&q=80&w=300", "desc": "案发时间段，监控刚好有3分钟中断。", "desc_en": "CCTV had a 3-minute gap during the incident.", "points_to": "mark"},
            {"id": "blood_trail", "title": "血迹拖痕", "title_en": "Blood trail", "image_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=300", "desc": "地上有一小段血迹拖痕，通向储物间。", "desc_en": "A small blood trail leads to the storage room.", "points_to": "mark"},
        ],
        "culprit": "mark",
        "truth": "Mark发现老板挪用合伙资金后，在办公室与老板发生争执。他用办公室的文件夹砸了老板的头，然后把凶器藏在储物间。他利用自己对监控系统的了解，制造了3分钟的盲区。湿伞是他用来冲洗血迹的工具。",
        "truth_en": "Mark discovered the owner was embezzling partnership funds. They argued in the office. He struck the owner with a heavy binder, then hid the weapon in storage. He exploited his knowledge of the CCTV system to create a 3-minute gap. The wet umbrella was used to wash away blood.",
        "max_interrogations": 5,
    },
}


def _provider_for(task_type: str, db: Session):
    return get_llm_provider_for_task(task_type, resolve_default_llm_provider(db), db)


class DetectiveEngine(GameTypeEngine):
    game_type = "detective"

    async def init_session(self, session: GameSession, config: dict) -> dict:
        # Admin-published cases (full object in config) take priority over the
        # builtin lookup so they aren't shadowed by the default case_id.
        case = None
        if config.get("scene") and config.get("suspects"):
            case = config
        if not case:
            case = _BUILTIN_CASES.get(config.get("case_id", "cafe_lie"))
        if not case:
            case = _BUILTIN_CASES["cafe_lie"]

        session.title = case.get("title", "AI侦探")
        session.phase = "lobby"

        suspects = []
        for s in case["suspects"]:
            suspects.append({
                "id": s["id"], "name": s["name"], "name_en": s.get("name_en", s["name"]),
                "role": s["role"], "personality": s["personality"],
                "avatar_url": s.get("avatar_url", ""),
                "alibi": s["alibi"], "alibi_en": s.get("alibi_en", ""),
                "secret": s["secret"], "is_culprit": s["is_culprit"],
                "trust": s.get("trust", 50),
                "interrogated": False, "statements": [],
            })

        return {
            "case": {
                "scene": case["scene"],
                "scene_en": case.get("scene_en", ""),
                "culprit": case["culprit"],
                "truth": case["truth"],
                "truth_en": case.get("truth_en", ""),
                "max_interrogations": case.get("max_interrogations", 5),
            },
            "suspects": suspects,
            "clues": [
                {**c, "discovered": False}
                for c in case.get("clues", [])
            ],
            "interrogations_used": 0,
            "discovered_clue_ids": [],
            "deduction_attempts": 0,
        }

    async def handle_turn(
        self, db: Session, session: GameSession, action_type: str,
        user_input: str, extra: dict,
    ) -> dict:
        state = dict(session.state)

        if action_type == "start":
            return self._start_case(session, state)

        if action_type == "investigate":
            return self._investigate_clue(session, state, extra.get("clue_id", ""))

        if action_type in ("interrogate", "message"):
            return await self._interrogate(db, session, state, extra.get("suspect_id", ""), user_input)

        if action_type == "deduce":
            return await self._submit_deduction(db, session, state, user_input, extra)

        raise ValueError(f"Unknown action: {action_type}")

    def _start_case(self, session: GameSession, state: dict) -> dict:
        session.phase = "briefing"
        case = state["case"]
        suspects = state["suspects"]

        feed = [
            {
                "type": "narrator",
                "text": "你是一名侦探，被派来调查这起案件。",
                "text_en": "You are a detective assigned to investigate this case.",
            },
            {
                "type": "case_briefing",
                "text": case["scene"],
                "text_en": case.get("scene_en", ""),
            },
            {
                "type": "suspects_intro",
                "suspects": [
                    {"id": s["id"], "name": s["name"], "name_en": s.get("name_en", ""), "role": s["role"]}
                    for s in suspects
                ],
            },
        ]

        session.phase = "investigating"
        return {
            "state": state,
            "feed_items": feed,
            "ai_response": {"phase": "investigating"},
            "hud": {},
        }

    def _investigate_clue(self, session: GameSession, state: dict, clue_id: str) -> dict:
        clue = None
        for c in state.get("clues", []):
            if c["id"] == clue_id:
                clue = c
                break

        if not clue:
            raise ValueError("Clue not found")

        clue["discovered"] = True
        if clue_id not in state.get("discovered_clue_ids", []):
            state.setdefault("discovered_clue_ids", []).append(clue_id)

        feed = [
            {
                "type": "clue_discovered",
                "clue_id": clue["id"],
                "title": clue["title"],
                "title_en": clue.get("title_en", ""),
                "desc": clue["desc"],
                "desc_en": clue.get("desc_en", ""),
                "total_discovered": len(state.get("discovered_clue_ids", [])),
                "total_clues": len(state.get("clues", [])),
            },
        ]

        return {
            "state": state,
            "feed_items": feed,
            "ai_response": {"clue": clue["title"]},
            "hud": {},
        }

    def _find_suspect(self, state: dict, suspect_id: str) -> dict | None:
        for suspect in state.get("suspects", []):
            if suspect["id"] == suspect_id:
                return suspect
        return None

    def _interrogate_prompts(
        self, db: Session, session: GameSession, state: dict, suspect: dict, question: str
    ) -> tuple[str, str]:
        discovered = [c for c in state.get("clues", []) if c.get("discovered")]
        clue_text = "\n".join(f"- {c['title']}: {c['desc']}" for c in discovered)
        from app.services.game_prompts import get_game_prompt

        default_system = (
            f"你在扮演侦探案件中的嫌疑人 {suspect['name']}。\n\n"
            f"你的身份：{suspect['role']}\n"
            f"你的性格：{suspect['personality']}\n"
            f"你的不在场证明：{suspect['alibi']}\n"
            f"你的秘密：{suspect['secret']}\n"
            f"你是否是凶手：{'是' if suspect['is_culprit'] else '否'}\n\n"
            "规则：\n"
            "- 如果你是凶手：巧妙回避关键问题，偶尔说谎但要自圆其说\n"
            "- 如果你不是凶手：诚实回答，但可能对自己的秘密有所隐瞒\n"
            "- 回答用1-3句英文，体现你的性格\n"
            "- 附中文翻译\n\n"
            "返回JSON：\n"
            '{"answer":"英文回答","answer_native":"中文翻译",'
            '"emotion":"suspicious/nervous/calm/angry/defensive",'
            '"lie_detected":true/false,"trust_change":-5到5}'
        )
        system = get_game_prompt(db, "detective.interrogate", default_system)
        user_msg = (
            f"侦探的问题：{question}\n"
            f"已知线索：\n{clue_text if clue_text else '暂无'}\n"
            f"之前的陈述：{suspect.get('statements', [])[-3:]}"
        )
        return system, user_msg

    def _fallback_interrogate_data(self) -> dict:
        return {
            "answer": "I... I don't know what you're talking about.",
            "answer_native": "我……我不知道你在说什么。",
            "emotion": "nervous",
        }

    def _normalize_interrogate_data(self, data: dict | None) -> dict:
        payload = dict(data or self._fallback_interrogate_data())
        answer = (payload.get("answer") or "").strip()
        if not answer:
            payload["answer"] = self._fallback_interrogate_data()["answer"]
        if not (payload.get("answer_native") or "").strip():
            payload["answer_native"] = self._fallback_interrogate_data()["answer_native"]
        payload.setdefault("emotion", "calm")
        return payload

    def _finalize_interrogate(
        self,
        session: GameSession,
        state: dict,
        suspect: dict,
        question: str,
        data: dict,
        *,
        turn_id: str | None = None,
    ) -> tuple[list[dict], dict]:
        answer_text = (data.get("answer") or "").strip()
        suspect.setdefault("statements", []).append({
            "question": question,
            "answer": answer_text,
        })

        trust_delta = data.get("trust_change", 0)
        if isinstance(trust_delta, (int, float)):
            suspect["trust"] = max(0, min(100, suspect.get("trust", 50) + trust_delta))

        feed = [
            {
                "type": "user_question",
                "text": question,
                "target": suspect["name"],
                "suspect_id": suspect["id"],
                **({"turn_id": turn_id} if turn_id else {}),
            },
            {
                "type": "suspect_answer",
                "suspect_id": suspect["id"],
                "suspect_name": suspect["name"],
                "text": answer_text,
                "text_native": (data.get("answer_native") or "").strip(),
                "emotion": data.get("emotion", "calm"),
                **({"turn_id": turn_id} if turn_id else {}),
            },
        ]

        remaining = state["case"].get("max_interrogations", 5) - state["interrogations_used"]
        if remaining <= 0:
            session.phase = "deduction"
            feed.append({
                "type": "narrator",
                "text": "审问机会用完了。是时候提交你的推理了。",
                "text_en": "No more interrogation chances. Time to submit your deduction.",
            })
        else:
            session.phase = "investigating"

        return feed, data

    async def _interrogate(
        self, db: Session, session: GameSession, state: dict,
        suspect_id: str, question: str,
    ) -> dict:
        suspect = self._find_suspect(state, suspect_id)
        if not suspect:
            raise ValueError("Suspect not found")

        state["interrogations_used"] = state.get("interrogations_used", 0) + 1
        suspect["interrogated"] = True
        session.phase = "interrogation"

        system, user_msg = self._interrogate_prompts(db, session, state, suspect, question)

        try:
            provider = _provider_for("game_ai_answer", db)
            data = await provider.complete_json(system, user_msg, temperature=0.8, max_tokens=600)
        except Exception as exc:
            logger.warning("interrogation failed: %s", exc)
            data = self._fallback_interrogate_data()

        data = self._normalize_interrogate_data(data)
        feed, data = self._finalize_interrogate(session, state, suspect, question, data)
        answer_text = (data.get("answer") or "").strip()
        hud = await self._generate_hud(db, session, question, answer_text)

        return {
            "state": state,
            "feed_items": feed,
            "ai_response": data,
            "hud": hud,
        }

    async def handle_turn_stream(
        self,
        db: Session,
        session: GameSession,
        action_type: str,
        user_input: str,
        extra: dict,
    ):
        """Stream suspect replies token-by-token for interrogation turns."""
        if action_type not in ("interrogate", "message"):
            result = await self.handle_turn(db, session, action_type, user_input, extra or {})
            yield {"type": "complete", "data": result}
            return

        state = dict(session.state)
        suspect_id = (extra or {}).get("suspect_id", "")
        turn_id = (extra or {}).get("turn_id") or new_id()
        question = (user_input or "").strip()
        if not question:
            raise ValueError("Question is required")

        suspect = self._find_suspect(state, suspect_id)
        if not suspect:
            raise ValueError("Suspect not found")

        state["interrogations_used"] = state.get("interrogations_used", 0) + 1
        suspect["interrogated"] = True
        session.phase = "interrogation"

        yield {
            "type": "partial_feed",
            "data": {
                "feed_items": [
                    {
                        "type": "user_question",
                        "text": question,
                        "target": suspect["name"],
                        "suspect_id": suspect["id"],
                        "turn_id": turn_id,
                    },
                    {
                        "type": "suspect_answer",
                        "suspect_id": suspect["id"],
                        "suspect_name": suspect["name"],
                        "text": "",
                        "turn_id": turn_id,
                        "_thinking": True,
                    },
                ]
            },
        }

        system, user_msg = self._interrogate_prompts(db, session, state, suspect, question)
        parsed: dict | None = None
        last_text = ""

        try:
            provider = _provider_for("game_ai_answer", db)
            stream = provider.complete_json_stream(
                system, user_msg, temperature=0.8, max_tokens=600
            )
            answer_re = re.compile(r'"answer"\s*:\s*"((?:[^"\\]|\\.)*)', re.S)

            def _extract_answer(buf: str) -> str:
                match = answer_re.search(buf)
                if not match:
                    return ""
                raw = match.group(1)
                try:
                    return json.loads('"' + raw + '"')
                except Exception:  # noqa: BLE001
                    return raw.replace("\\n", "\n").replace('\\"', '"')

            buffer = ""
            async for chunk in stream:
                if chunk == "___STREAM_JSON_DONE___":
                    continue
                buffer += chunk
                answer_text = _extract_answer(buffer)
                if answer_text and len(answer_text) > len(last_text):
                    delta = answer_text[len(last_text):]
                    if delta:
                        yield {
                            "type": "partial_feed",
                            "data": {
                                "feed_items": [{
                                    "type": "suspect_answer",
                                    "suspect_id": suspect["id"],
                                    "suspect_name": suspect["name"],
                                    "text": delta,
                                    "turn_id": turn_id,
                                }]
                            },
                        }
                    last_text = answer_text

            parsed = getattr(provider, "_stream_json_result", None)
            if not parsed:
                try:
                    parsed = json.loads(buffer)
                except Exception:  # noqa: BLE001
                    parsed = None
        except Exception as exc:
            logger.warning("interrogation stream failed: %s", exc)
            parsed = None

        data = self._normalize_interrogate_data(parsed)
        feed, data = self._finalize_interrogate(
            session, state, suspect, question, data, turn_id=turn_id
        )
        answer_text = (data.get("answer") or "").strip()
        hud = await self._generate_hud(db, session, question, answer_text)

        yield {
            "type": "complete",
            "data": {
                "state": state,
                "feed_items": feed,
                "ai_response": data,
                "hud": hud,
            },
        }

    async def _submit_deduction(
        self, db: Session, session: GameSession, state: dict,
        user_input: str, extra: dict,
    ) -> dict:
        accused_id = extra.get("accused_id", "")
        case = state["case"]
        state["deduction_attempts"] = state.get("deduction_attempts", 0) + 1

        correct_culprit = accused_id == case["culprit"]

        system = (
            "你是侦探游戏裁判。评判玩家的推理是否合理。\n\n"
            f"真相：{case['truth']}\n"
            f"真凶：{case['culprit']}\n"
            f"玩家指控的嫌疑人ID：{accused_id}\n\n"
            "评判标准：\n"
            "- 指控对象是否正确\n"
            "- 推理逻辑是否合理\n"
            "- 是否引用了关键证据\n\n"
            '返回JSON：{"correct":true/false,"reasoning_score":0-100,'
            '"feedback":"中文评价","feedback_en":"English feedback"}'
        )
        user_msg = f"玩家的推理：{user_input}"

        try:
            provider = _provider_for("game_reasoning", db)
            data = await provider.complete_json(system, user_msg, temperature=0.3, max_tokens=500)
        except Exception as exc:
            logger.warning("deduction judge failed: %s", exc)
            data = {"correct": correct_culprit, "reasoning_score": 50 if correct_culprit else 20}

        session.phase = "summary"
        score = data.get("reasoning_score", 0)
        if correct_culprit:
            score = max(score, 60)

        session.score = score

        feed = [
            {"type": "user_deduction", "text": user_input, "accused": accused_id},
            {
                "type": "verdict",
                "correct": correct_culprit,
                "feedback": data.get("feedback", ""),
                "feedback_en": data.get("feedback_en", ""),
                "score": score,
            },
            {
                "type": "truth_reveal",
                "text": case["truth"],
                "text_en": case.get("truth_en", ""),
                "culprit": case["culprit"],
            },
        ]

        return {
            "state": state,
            "feed_items": feed,
            "ai_response": data,
            "hud": {},
            "ended": True,
            "score": score,
        }

    async def _generate_hud(
        self, db: Session, session: GameSession,
        question: str, answer: str,
    ) -> dict:
        native = session.native_language
        target = session.target_language

        system = (
            f"你是英语表达教练。用户在侦探游戏中审问嫌疑人。"
            f"生成学习HUD帮助用户学习审问相关的{target}表达。\n\n"
            "返回JSON：\n"
            '{"main_expression":"用户问题的标准英文表达，1句不超18词",'
            f'"meaning_native":"{native}翻译",'
            '"variants":{{"direct":"直接质问","subtle":"委婉探问","professional":"专业审问","confrontational":"对峙式"}},'
            f'"why_this_expression":[{{"point":"要点","explanation":"{native}解释"}}],'
            '"patterns_v2":[{"pattern":"句型","example":"例句","add_to_crush":true}],'
            '"vocabulary":["词1","词2","词3"],'
            f'"agents":[{{"agent":"Detective Coach","result":"{native}审问技巧点评"}},{{"agent":"Language Coach","result":"{native}表达点评"}},{{"agent":"Logic Coach","result":"{native}推理逻辑建议"}}]'
            "}"
        )
        user_msg = f"审问问题：{question}\n嫌疑人回答：{answer}"

        try:
            provider = _provider_for("game_challenge_hud", db)
            from app.services.game_prompts import get_game_prompt
            system = get_game_prompt(db, "detective.hud", system)
            hud = await provider.complete_json(system, user_msg, temperature=0.7, max_tokens=900)
        except Exception as exc:
            logger.warning("detective HUD failed: %s", exc)
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
        case = state.get("case", {})
        patterns, vocab, expressions = [], [], []
        top_lines: list[dict] = []

        for turn in session.turns:
            hud = turn.hud or {}
            expr = hud.get("main_expression", "")
            if expr:
                expressions.append(expr)
                if len(top_lines) < 5:
                    top_lines.append({"en": expr, "zh": hud.get("meaning_native", "")})
            for p in (hud.get("patterns_v2") or []):
                pat = p.get("pattern") if isinstance(p, dict) else str(p)
                if pat and pat not in patterns:
                    patterns.append(pat)
            for v in (hud.get("vocabulary") or []):
                if v and v not in vocab:
                    vocab.append(v)

        duration_seconds = 0
        if session.started_at and session.ended_at:
            duration_seconds = int((session.ended_at - session.started_at).total_seconds())

        return {
            "solved": session.status == "ended" and session.score >= 60,
            "title": session.title,
            "truth": case.get("truth", ""),
            "truth_en": case.get("truth_en", ""),
            "score": session.score,
            "accuracy": session.score,
            "interrogations_used": state.get("interrogations_used", 0),
            "clues_found": len(state.get("discovered_clue_ids", [])),
            "total_clues": len(state.get("clues", [])),
            "deduction_attempts": state.get("deduction_attempts", 0),
            "duration_seconds": duration_seconds,
            "top_lines": top_lines,
            "patterns": patterns,
            "vocabulary": vocab,
            "expressions": expressions,
            "summary": f"案件已结案，得分 {session.score}" if session.status == "ended" else "调查进行中",
        }

    def get_state_view(self, session: GameSession, user_id: str) -> dict:
        state = session.state or {}
        case = state.get("case", {})

        suspects_view = []
        for s in state.get("suspects", []):
            suspects_view.append({
                "id": s["id"],
                "name": s["name"],
                "name_en": s.get("name_en", ""),
                "role": s["role"],
                "avatar_url": s.get("avatar_url", ""),
                "voice": s.get("voice", ""),
                "trust": s.get("trust", 50),
                "interrogated": s.get("interrogated", False),
                "statement_count": len(s.get("statements", [])),
            })

        clues_view = []
        all_clues_view = []
        for c in state.get("clues", []):
            discovered = c.get("discovered", False)
            # All clues are listed so the board can show a 关键搜证 grid; the
            # description stays locked until the clue is investigated.
            all_clues_view.append({
                "id": c["id"],
                "title": c["title"],
                "title_en": c.get("title_en", ""),
                "image_url": c.get("image_url", ""),
                "discovered": discovered,
                "desc": c["desc"] if discovered else "",
                "desc_en": c.get("desc_en", "") if discovered else "",
            })
            if discovered:
                clues_view.append({
                    "id": c["id"],
                    "title": c["title"],
                    "title_en": c.get("title_en", ""),
                    "desc": c["desc"],
                    "desc_en": c.get("desc_en", ""),
                })

        return {
            "scene": case.get("scene", ""),
            "scene_en": case.get("scene_en", ""),
            "suspects": suspects_view,
            "discovered_clues": clues_view,
            "all_clues": all_clues_view,
            "total_clues": len(state.get("clues", [])),
            "interrogations_used": state.get("interrogations_used", 0),
            "max_interrogations": case.get("max_interrogations", 5),
        }


register_engine(DetectiveEngine())
