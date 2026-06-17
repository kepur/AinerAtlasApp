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
        "name": "Mia",
        "name_en": "Mia",
        "age": 25,
        "role": "咖啡店常客",
        "gender": "female",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
        "cover_url": "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=600",
        "personality": "轻松外向，说话温柔，喜欢旅行和摄影，容易害羞",
        "initial_scene": "咖啡店初次见面，你走近常去喝咖啡的店，发现她正坐在窗边看书...",
        "tags": ["恋爱社交", "轻松", "B1-B2"],
    },
    "leo": {
        "name": "Leo",
        "name_en": "Leo",
        "age": 32,
        "role": "欧洲客户",
        "gender": "male",
        "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
        "personality": "直接、谨慎、喜欢砍价，但私下里幽默且体贴",
        "initial_scene": "项目商务谈判后的酒会，你们恰好在吧台碰面...",
        "tags": ["恋爱社交", "正式", "B2-C1"],
    },
    "junior_sister": {
        "name": "小师妹",
        "name_en": "Junior Sister",
        "age": 19,
        "role": "青云宗弟子",
        "gender": "female",
        "avatar_url": "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=150",
        "personality": "温柔、善良、试探心意，一直暗恋你",
        "initial_scene": "后山重逢，你离开宗门多年后第一次回来，她正在那里练剑...",
        "tags": ["仙侠剧情", "情感", "B1"],
    }
}

def _provider_for(task_type: str, db: Session):
    return get_llm_provider_for_task(task_type, resolve_default_llm_provider(db), db)

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
            "speaker_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100" if target.get("id") == "mia" else "",
            "text": parsed.get("character_reply", "Haha, that's interesting..."),
            "text_zh": parsed.get("character_reply_zh", ""),
            "emotion": parsed.get("emotion", ""),
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
            "ai_response": parsed,
            "feed_items": new_feed,
            "phase_after": session.phase,
            "hud": {
                "relationship_score": new_score,
                "max_score": state["max_score"]
            }
        }

    async def get_summary(self, db: Session, session: GameSession) -> dict:
        return {
            "title": session.title,
            "final_score": session.state.get("relationship_score", 0),
            "final_phase": session.phase,
            "turns": session.state.get("total_turns", 0)
        }

    def get_state_view(self, session: GameSession, user_id: str) -> dict:
        return {
            "target": session.state.get("target"),
            "relationship_score": session.state.get("relationship_score", 0),
            "feed": session.state.get("feed", [])
        }

    def _build_prompt(self, state: dict, user_input: str, extra: dict) -> str:
        target = state.get("target", {})
        score = state.get("relationship_score", 0)
        
        return f"""You are playing the role of {target.get('name')} in a romance/social simulation game.
Setting: {target.get('initial_scene')}
Your personality: {target.get('personality')}
Current relationship score with the user: {score}/100.

The user says: "{user_input}"
Action intent (if chosen by user): {extra.get('action_type', 'normal')}

Respond IN JSON ONLY, using this exact schema:
{{
  "character_reply": "Your response in English",
  "character_reply_zh": "Your response translated to Chinese",
  "emotion": "Short description of your emotion (e.g. 开心, 害羞, 疑惑)",
  "relationship_change": integer (-5 to +5 based on how good the user's response was),
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
