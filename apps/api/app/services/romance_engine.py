"""Romance Social (恋爱社交) game engine.

Phases: icebreaker → flirting → dating → couple
Focuses on relationship building, emotional intelligence, and natural conversational flow.
"""
from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models import GameSession
from app.services.game_engine import GameTypeEngine, register_engine
from app.services.llm import get_llm_provider_for_task
from app.services.runtime_config import resolve_default_llm_provider

logger = logging.getLogger(__name__)

_BUILTIN_TARGETS = {
    "mia": {
        "id": "mia",
        "name": "Mia",
        "name_en": "Mia",
        "age": 25,
        "role": "咖啡店常客",
        "gender": "female",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
        "cover_url": "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=600",
        "personality": "轻松外向，说话温柔，喜欢旅行和摄影，容易害羞",
        "chat_style": "温柔、自然、带一点幽默，适合B1-B2学习者",
        "identity_background": "在咖啡店附近做自由摄影师，常来这里看书、修片和观察人群。",
        "initial_scene": "咖啡店初次见面，你走近常去喝咖啡的店，发现她正坐在窗边看书...",
        "prompt_override": "",
        "category": "恋爱社交",
        "tags": ["恋爱社交", "轻松", "B1-B2"],
    },
    "leo": {
        "id": "leo",
        "name": "Leo",
        "name_en": "Leo",
        "age": 32,
        "role": "欧洲客户",
        "gender": "male",
        "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
        "personality": "直接、谨慎、喜欢砍价，但私下里幽默且体贴",
        "chat_style": "偏正式、节奏快、讲结果导向，适合商务谈判训练",
        "identity_background": "跨境项目采购负责人，长期和亚洲团队沟通，重视价值和风险控制。",
        "initial_scene": "项目商务谈判后的酒会，你们恰好在吧台碰面...",
        "prompt_override": "",
        "category": "商务谈判",
        "tags": ["商务谈判", "正式", "B2-C1"],
    },
    "junior_sister": {
        "id": "junior_sister",
        "name": "小师妹",
        "name_en": "Junior Sister",
        "age": 19,
        "role": "青云宗弟子",
        "gender": "female",
        "avatar_url": "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=150",
        "personality": "温柔、善良、试探心意，一直暗恋你",
        "chat_style": "含蓄、细腻、古风表达，重情绪和关系边界",
        "identity_background": "青云宗内门弟子，自幼修行，与你有旧日同门羁绊。",
        "initial_scene": "后山重逢，你离开宗门多年后第一次回来，她正在那里练剑...",
        "prompt_override": "",
        "category": "旅游出差",
        "tags": ["旅游出差", "情感", "B1"],
    },
    "amy": {
        "id": "amy",
        "name": "Amy",
        "name_en": "Amy",
        "age": 28,
        "role": "移民顾问同伴",
        "gender": "female",
        "avatar_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=150",
        "cover_url": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=600",
        "personality": "理性耐心，擅长解释流程，也会照顾对方情绪",
        "chat_style": "清晰分步骤，偏实用，适合移民生活场景",
        "identity_background": "刚完成技术移民申请，熟悉材料、租房、求职和文化适应。",
        "initial_scene": "社区中心的新移民分享会后，你们在门口继续交流经历...",
        "prompt_override": "",
        "category": "移民生活",
        "tags": ["移民生活", "实用", "B1-B2"],
    }
}


def list_builtin_targets() -> list[dict[str, Any]]:
    return [dict(v) for v in _BUILTIN_TARGETS.values()]

def _provider_for(task_type: str, db: Session):
    return get_llm_provider_for_task(task_type, resolve_default_llm_provider(db), db)


# Each social category tracks a different progress dimension + conversational goal,
# so the same engine drives 恋爱 / 商务谈判 / 旅游 / 移民 with distinct framing.
_CATEGORY = {
    "恋爱社交": {
        "dimension": "好感度", "goal": "自然地建立浪漫好感，逐步拉近彼此关系",
        "phases": [(0, "暖场"), (20, "暧昧"), (50, "约会"), (80, "心动·情侣")],
    },
    "商务谈判": {
        "dimension": "成交意向", "goal": "建立专业信任、厘清需求、推进合作直至达成成交",
        "phases": [(0, "破冰"), (20, "需求挖掘"), (50, "议价磋商"), (80, "达成合作")],
    },
    "旅游出差": {
        "dimension": "熟络度", "goal": "自然交流、解决出行需求、结识当地朋友",
        "phases": [(0, "问询"), (20, "闲聊"), (50, "结伴"), (80, "深聊")],
    },
    "移民生活": {
        "dimension": "融入度", "goal": "融入当地生活、处理日常事务、建立本地社交",
        "phases": [(0, "寒暄"), (20, "求助"), (50, "交流"), (80, "熟识")],
    },
}


def _category_of(target: dict) -> dict:
    cat = target.get("category") or "恋爱社交"
    return _CATEGORY.get(cat, _CATEGORY["恋爱社交"])


def _phase_label(category_cfg: dict, score: int) -> str:
    label = category_cfg["phases"][0][1]
    for threshold, name in category_cfg["phases"]:
        if score >= threshold:
            label = name
    return label


class RomanceEngine(GameTypeEngine):
    game_type = "romance"

    async def init_session(self, session: GameSession, config: dict) -> dict:
        target_id = config.get("target_id", "mia")
        target = _BUILTIN_TARGETS.get(target_id)
        # Admin-published romance characters pass a full target object in config.
        if not target and config.get("personality") and config.get("name"):
            target = config
        if not target:
            target = _BUILTIN_TARGETS["mia"]

        session.title = f"与 {target['name']} 的约会"
        session.phase = "icebreaker" # icebreaker -> flirting -> dating -> couple

        return {
            "target": target,
            "relationship_score": 0,
            "max_score": 100,
            "total_turns": 0,
            "feed": [],
        }

    async def handle_turn(
        self, db: Session, session: GameSession, action_type: str,
        user_input: str, extra: dict,
    ) -> dict:
        state = dict(session.state)
        target = state.get("target", _BUILTIN_TARGETS["mia"])
        phase = session.phase

        state["total_turns"] = state.get("total_turns", 0) + 1

        from app.services.game_prompts import get_game_prompt
        prompt = get_game_prompt(db, "romance.turn", self._build_prompt(state, user_input, extra))
        provider = _provider_for("chat", db)
        
        try:
            parsed = await provider.complete_json(
                system_prompt="You are a romance social game engine. Generate the next turn state as JSON.",
                user_content=prompt
            )
        except Exception as e:
            logger.error(f"Failed to get or parse LLM JSON response: {e}")
            # Fallback
            parsed = {
                "character_reply": "Haha, that's interesting...",
                "character_reply_zh": "哈哈，真有趣...",
                "emotion": "开心",
                "relationship_change": 2,
                "learning_point": {"title": "保持对话", "desc": "你刚才的回应很好。"},
                "grammar_tips": []
            }

        return self._finalize(session, state, target, parsed, user_input)

    def _finalize(self, session: GameSession, state: dict, target: dict,
                  parsed: dict, user_input: str) -> dict:
        """Apply score/phase changes and build the turn's feed items.

        Shared by handle_turn (non-streaming) and handle_turn_stream so both
        paths produce an identical authoritative feed + HUD.
        """
        # Update relationship score
        old_score = state.get("relationship_score", 0)
        new_score = min(100, max(0, old_score + parsed.get("relationship_change", 0)))
        state["relationship_score"] = new_score

        # Advance phase based on score
        if new_score >= 80:
            session.phase = "couple"
        elif new_score >= 50:
            session.phase = "dating"
        elif new_score >= 20:
            session.phase = "flirting"

        # Construct Feed items (mapping to RomanceSocial UI)
        new_feed = []

        # The user's input bubble
        if user_input:
            new_feed.append({
                "type": "user_msg",
                "text": user_input,
                "created_at": datetime.now(UTC).isoformat(),
            })

        # The character's reply
        character_feed = {
            "type": "char_msg",
            "speaker": target["name"],
            "speaker_en": target["name_en"],
            "speaker_avatar": target.get("avatar_url", ""),
            "text": parsed.get("character_reply", "Haha, that's interesting..."),
            "text_zh": parsed.get("character_reply_zh", ""),
            "emotion": parsed.get("emotion", ""),
            "emotion_emoji": parsed.get("emotion_emoji", ""),
            "relationship_change": parsed.get("relationship_change", 0),
            "created_at": datetime.now(UTC).isoformat(),
            "learning_point": parsed.get("learning_point"),
        }
        new_feed.append(character_feed)

        # Grammar/Expression hints (for the top cards)
        hints = parsed.get("grammar_tips", [])
        for h in hints:
            new_feed.append({
                "type": "hint_card",
                "title": h.get("title", "自然表达"),
                "en": h.get("en", ""),
                "zh": h.get("zh", ""),
                "breakdown": h.get("breakdown", []),
            })

        state["feed"] = state.get("feed", []) + new_feed
        session.state = state

        return {
            "state": state,
            "ai_response": parsed,
            "feed_items": new_feed,
            "phase_after": session.phase,
            "hud": {
                "relationship_score": new_score,
                "max_score": state["max_score"]
            }
        }

    async def handle_turn_stream(
        self, db: Session, session: GameSession, action_type: str,
        user_input: str, extra: dict,
    ):
        """Streaming version: emit the character reply token-by-token.

        Yields:
            {"type": "partial_feed", "data": {"feed_items": [...]}} — live deltas
            {"type": "complete", "data": {...}} — authoritative turn result
        """
        state = dict(session.state)
        target = state.get("target", _BUILTIN_TARGETS["mia"])
        state["total_turns"] = state.get("total_turns", 0) + 1

        # Echo the user's bubble immediately so it never feels frozen.
        if user_input:
            yield {"type": "partial_feed", "data": {"feed_items": [{
                "type": "user_msg",
                "text": user_input,
                "created_at": datetime.now(UTC).isoformat(),
            }]}}

        from app.services.game_prompts import get_game_prompt
        prompt = get_game_prompt(db, "romance.turn", self._build_prompt(state, user_input, extra or {}))
        provider = _provider_for("chat", db)

        parsed: dict | None = None
        try:
            stream = provider.complete_json_stream(
                "You are a romance social game engine. Generate the next turn state as JSON.",
                prompt, temperature=0.8, max_tokens=900,
            )

            import re
            buffer = ""
            last_text = ""
            # Pull the growing character_reply value out of partial JSON so the
            # English reply streams character-by-character into one live bubble.
            reply_re = re.compile(r'"character_reply"\s*:\s*"((?:[^"\\]|\\.)*)', re.S)

            def _extract(buf: str) -> str:
                m = reply_re.search(buf)
                if not m:
                    return ""
                raw = m.group(1)
                try:
                    return json.loads('"' + raw + '"')
                except Exception:  # noqa: BLE001
                    return raw.replace('\\n', '\n').replace('\\"', '"')

            async for chunk in stream:
                if chunk == "___STREAM_JSON_DONE___":
                    continue
                buffer += chunk
                rtext = _extract(buffer)
                if rtext and len(rtext) > len(last_text):
                    delta = rtext[len(last_text):]
                    if delta:
                        yield {"type": "partial_feed", "data": {"feed_items": [{
                            "type": "char_msg",
                            "speaker": target["name"],
                            "speaker_en": target["name_en"],
                            "speaker_avatar": target.get("avatar_url", ""),
                            "text": delta,
                        }]}}
                    last_text = rtext

            parsed = getattr(provider, "_stream_json_result", None)
            if not parsed:
                try:
                    parsed = json.loads(buffer)
                except Exception:  # noqa: BLE001
                    parsed = None
        except Exception as e:  # noqa: BLE001
            logger.error(f"Romance streaming turn failed: {e}")
            parsed = None

        if not parsed or "character_reply" not in parsed:
            parsed = {
                "character_reply": "Haha, that's interesting...",
                "character_reply_zh": "哈哈，真有趣...",
                "emotion": "开心",
                "emotion_emoji": "😊",
                "relationship_change": 1,
                "learning_point": {"title": "保持对话", "desc": "你刚才的回应很好。"},
                "grammar_tips": [],
            }

        result = self._finalize(session, state, target, parsed, user_input)
        yield {"type": "complete", "data": result}

    async def get_summary(self, db: Session, session: GameSession) -> dict:
        return {
            "title": session.title,
            "final_score": session.state.get("relationship_score", 0),
            "final_phase": session.phase,
            "turns": session.state.get("total_turns", 0)
        }

    def get_state_view(self, session: GameSession, user_id: str) -> dict:
        target = session.state.get("target") or {}
        score = session.state.get("relationship_score", 0)
        cat_cfg = _category_of(target)
        return {
            "target": target,
            "relationship_score": score,
            "category": target.get("category", "恋爱社交"),
            "progress_dimension": cat_cfg["dimension"],
            "phase_label": _phase_label(cat_cfg, score),
            "phases": [name for _, name in cat_cfg["phases"]],
            "feed": session.state.get("feed", []),
        }

    def _build_prompt(self, state: dict, user_input: str, extra: dict) -> str:
        target = state.get("target", {})
        score = state.get("relationship_score", 0)
        cat_cfg = _category_of(target)

        return f"""You are playing the role of {target.get('name')} in a social-practice simulation game.
Category: {target.get('category', '恋爱社交')} — your goal in this conversation: {cat_cfg['goal']}.
Setting: {target.get('initial_scene')}
Your personality: {target.get('personality')}
Your chat style: {target.get('chat_style', '')}
Your identity/background: {target.get('identity_background', '')}
Current {cat_cfg['dimension']} with the user: {score}/100 (raise it only when the user communicates well toward the goal above).

The user says: "{user_input}"
Action intent (if chosen by user): {extra.get('action_type', 'normal')}
Prompt constraints from admin: {target.get('prompt_override', '')}

Respond IN JSON ONLY, using this exact schema:
{{
  "character_reply": "Your response in English",
  "character_reply_zh": "Your response translated to Chinese",
  "emotion": "中文情绪词（开心/害羞/疑惑/生气/感动/冷淡/心动 等）",
  "emotion_emoji": "一个最贴切的 emoji（如 😊 😳 🤔 💢 🥰 😐 💕）",
  "relationship_change": integer (-5 to +5 based on how well the user advanced the {cat_cfg['dimension']} goal),
  "learning_point": {{
    "title": "Short title of what they did well/poorly",
    "desc": "Brief explanation of conversational skill used"
  }},
  "grammar_tips": [
    {{
      "title": "自然表达 / Better Expression",
      "en": "A native way to say what they meant",
      "zh": "Chinese translation",
      "breakdown": [
        "Point 1 about tone",
        "Point 2 about word choice"
      ]
    }}
  ]
}}
Do NOT output any markdown blocks or extra text outside the JSON. Ensure the JSON is valid.
"""

register_engine(RomanceEngine())
