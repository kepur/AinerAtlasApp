"""Roleplay Adventure (角色扮演) game engine.

Phases: lobby → intro → playing → chapter_end → summary
AI generates narrative, character dialogue, and choices.
Supports: choice-based, free-text input, and mixed modes.
"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models import GameSession
from app.services.game_engine import GameTypeEngine, register_engine
from app.services.llm import get_llm_provider_for_task
from app.services.runtime_config import resolve_default_llm_provider

logger = logging.getLogger(__name__)

_BUILTIN_STORIES = {
    "qingyun": {
        "title": "青云重生",
        "subtitle": "仙侠 · 师门恩怨",
        "description": "你在青云门修炼多年，一次意外让你重生回到入门之初。面对熟悉的师兄弟和未知的命运...",
        "setting": "古代仙侠世界，青云门。主角重生回到入门第一年。",
        "characters": [
            {"name": "小师妹", "name_en": "Junior Sister", "personality": "活泼天真，对主角有好感，但隐藏着秘密", "relationship": 60},
            {"name": "大师兄", "name_en": "Senior Brother", "personality": "严肃正直，武功高强，暗中保护门派", "relationship": 50},
            {"name": "师父", "name_en": "Master", "personality": "高深莫测，话少但每句都有深意", "relationship": 40},
        ],
        "chapters": [
            {"id": "ch1", "title": "重生之始", "title_en": "The Rebirth", "goal": "了解当前处境，与师门众人重新相处"},
            {"id": "ch2", "title": "后山重逢", "title_en": "Reunion at the Back Mountain", "goal": "与小师妹在后山偶遇，选择如何相处"},
            {"id": "ch3", "title": "暗流涌动", "title_en": "Undercurrents", "goal": "发现门派中的异常，做出关键选择"},
        ],
        "learning_focus": ["情绪表达", "保持距离", "委婉拒绝", "描述感受"],
        "max_turns_per_chapter": 8,
    },
    "cafe_encounter": {
        "title": "咖啡馆奇遇",
        "subtitle": "现代 · 日常社交",
        "description": "你在一家咖啡馆遇到一个有趣的陌生人。一段意想不到的对话即将展开...",
        "setting": "现代城市咖啡馆。一个安静的下午。",
        "characters": [
            {"name": "陌生人", "name_en": "Stranger", "personality": "神秘优雅，说话温和但意味深长", "relationship": 30},
            {"name": "咖啡师", "name_en": "Barista", "personality": "健谈热情，善于察言观色", "relationship": 50},
        ],
        "chapters": [
            {"id": "ch1", "title": "初次相遇", "title_en": "First Meeting", "goal": "与陌生人开始对话"},
            {"id": "ch2", "title": "深入了解", "title_en": "Getting to Know", "goal": "发现陌生人的真实身份"},
        ],
        "learning_focus": ["自我介绍", "提问技巧", "表达兴趣", "礼貌用语"],
        "max_turns_per_chapter": 8,
    },
}


def _provider_for(task_type: str, db: Session):
    return get_llm_provider_for_task(task_type, resolve_default_llm_provider(db), db)


class RoleplayEngine(GameTypeEngine):
    game_type = "roleplay"

    async def init_session(self, session: GameSession, config: dict) -> dict:
        story_id = config.get("story_id", "qingyun")
        story = _BUILTIN_STORIES.get(story_id)
        if not story and config.get("setting"):
            story = config
        if not story:
            story = _BUILTIN_STORIES["qingyun"]

        session.title = story.get("title", "角色扮演")
        session.phase = "lobby"

        characters = []
        for c in story.get("characters", []):
            characters.append({**c, "current_relationship": c.get("relationship", 50)})

        return {
            "story": {
                "setting": story["setting"],
                "characters": characters,
                "chapters": story.get("chapters", []),
                "learning_focus": story.get("learning_focus", []),
                "max_turns_per_chapter": story.get("max_turns_per_chapter", 8),
            },
            "current_chapter": 0,
            "chapter_turn": 0,
            "narrative_log": [],
            "relationship_changes": [],
            "total_turns": 0,
        }

    async def handle_turn(
        self, db: Session, session: GameSession, action_type: str,
        user_input: str, extra: dict,
    ) -> dict:
        state = dict(session.state)

        if action_type == "start":
            return await self._start_story(db, session, state)

        if action_type == "message":
            return await self._handle_message(db, session, state, user_input, extra)

        if action_type == "choice":
            return await self._handle_message(db, session, state, user_input, extra)

        if action_type == "next_chapter":
            return await self._next_chapter(db, session, state)

        raise ValueError(f"Unknown action: {action_type}")

    async def _start_story(self, db: Session, session: GameSession, state: dict) -> dict:
        session.phase = "intro"
        story = state["story"]
        chapters = story.get("chapters", [])
        ch = chapters[0] if chapters else {"title": "开始", "title_en": "Start", "goal": "开始冒险"}

        char_desc = ", ".join(c["name"] for c in story.get("characters", []))

        feed = [
            {
                "type": "narrator",
                "text": f"故事开始了。{story['setting']}",
                "text_en": f"The story begins. {story['setting']}",
            },
            {
                "type": "chapter_start",
                "chapter": ch.get("title", ""),
                "chapter_en": ch.get("title_en", ""),
                "goal": ch.get("goal", ""),
            },
        ]

        intro = await self._generate_narrative(db, session, state, "story_opening", "")
        if intro:
            feed.extend(intro.get("feed_items", []))

        session.phase = "playing"
        return {
            "state": state,
            "feed_items": feed,
            "ai_response": {"phase": "playing", "chapter": 0},
            "hud": {},
        }

    async def _handle_message(
        self, db: Session, session: GameSession, state: dict,
        user_input: str, extra: dict,
    ) -> dict:
        session.phase = "playing"
        state["chapter_turn"] = state.get("chapter_turn", 0) + 1
        state["total_turns"] = state.get("total_turns", 0) + 1

        result = await self._generate_narrative(db, session, state, "user_action", user_input)
        feed = result.get("feed_items", [])

        for rc in result.get("relationship_changes", []):
            state.setdefault("relationship_changes", []).append(rc)
            for char in state["story"].get("characters", []):
                if char["name"] == rc.get("character"):
                    char["current_relationship"] = max(0, min(100,
                        char.get("current_relationship", 50) + rc.get("delta", 0)
                    ))

        chapters = state["story"].get("chapters", [])
        max_turns = state["story"].get("max_turns_per_chapter", 8)
        chapter_idx = state.get("current_chapter", 0)

        if state["chapter_turn"] >= max_turns:
            if chapter_idx < len(chapters) - 1:
                session.phase = "chapter_end"
                feed.append({
                    "type": "chapter_end",
                    "text": "本章结束。准备好进入下一章了吗？",
                    "text_en": "Chapter complete. Ready for the next chapter?",
                })
            else:
                session.phase = "summary"
                state["completed"] = True
                feed.append({
                    "type": "story_end",
                    "text": "故事结束了。来看看你的学习收获吧！",
                    "text_en": "The story has ended. Let's see what you've learned!",
                })
                return {
                    "state": state,
                    "feed_items": feed,
                    "ai_response": result.get("ai_response", {}),
                    "hud": result.get("hud", {}),
                    "ended": True,
                    "score": 80,
                }

        hud = result.get("hud", {})

        return {
            "state": state,
            "feed_items": feed,
            "ai_response": result.get("ai_response", {}),
            "hud": hud,
        }

    async def _next_chapter(self, db: Session, session: GameSession, state: dict) -> dict:
        state["current_chapter"] = state.get("current_chapter", 0) + 1
        state["chapter_turn"] = 0
        session.phase = "playing"

        chapters = state["story"].get("chapters", [])
        ch_idx = state["current_chapter"]
        ch = chapters[ch_idx] if ch_idx < len(chapters) else {"title": "新章节", "title_en": "New Chapter"}

        feed = [
            {
                "type": "chapter_start",
                "chapter": ch.get("title", ""),
                "chapter_en": ch.get("title_en", ""),
                "goal": ch.get("goal", ""),
            },
        ]

        intro = await self._generate_narrative(db, session, state, "chapter_opening", "")
        if intro:
            feed.extend(intro.get("feed_items", []))

        return {
            "state": state,
            "feed_items": feed,
            "ai_response": {"chapter": ch_idx},
            "hud": {},
        }

    async def _generate_narrative(
        self, db: Session, session: GameSession, state: dict,
        trigger: str, user_input: str,
    ) -> dict:
        story = state["story"]
        chapters = story.get("chapters", [])
        ch_idx = state.get("current_chapter", 0)
        ch = chapters[ch_idx] if ch_idx < len(chapters) else {}

        char_lines = []
        for c in story.get("characters", []):
            char_lines.append(f"- {c['name']}({c.get('name_en','')}): {c['personality']}, 好感度={c.get('current_relationship', 50)}")

        recent = state.get("narrative_log", [])[-6:]
        recent_text = "\n".join(f"[{e.get('type','')}] {e.get('speaker','')}: {e.get('text','')}" for e in recent)

        native = session.native_language
        target = session.target_language

        system = (
            f"你是角色扮演游戏的AI叙述者和角色扮演者。\n\n"
            f"世界设定：{story['setting']}\n"
            f"当前章节：{ch.get('title', '')} - 目标：{ch.get('goal', '')}\n"
            f"角色：\n{''.join(char_lines)}\n\n"
            "规则：\n"
            "- narrator_text: 1-2句叙述推进剧情（中文）\n"
            "- narrator_text_en: 英文翻译\n"
            "- character_lines: 角色的对话（如果需要的话），每个角色最多1-2句\n"
            "- choices: 给玩家3-4个选择（中文+英文），如果适合自由输入则可以留空\n"
            "- relationship_changes: 如果用户行为影响了关系，给出变化\n\n"
            "返回JSON：\n"
            '{"narrator_text":"中文叙述","narrator_text_en":"English narration",'
            '"character_lines":[{"name":"角色名","text":"中文对话","text_en":"English dialogue","emotion":"情绪"}],'
            '"choices":[{"label":"中文选项 (English option)","action":"A/B/C/D"}],'
            '"relationship_changes":[{"character":"角色名","delta":-5,"reason":"原因"}],'
            '"input_mode":"choice/free/mixed"}'
        )

        if trigger == "story_opening":
            user_msg = "请生成故事开场白和第一段叙述。角色自然地出场。"
        elif trigger == "chapter_opening":
            user_msg = f"新章节开始：{ch.get('title', '')}。生成过渡叙述。\n\n最近剧情：\n{recent_text}"
        else:
            user_msg = f"玩家的行动/对话：{user_input}\n\n最近剧情：\n{recent_text}"

        try:
            provider = _provider_for("game_ai_speech", db)
            data = await provider.complete_json(system, user_msg, temperature=0.85, max_tokens=1200)
        except Exception as exc:
            logger.warning("roleplay narrative failed: %s", exc)
            data = {
                "narrator_text": "故事继续...",
                "narrator_text_en": "The story continues...",
                "character_lines": [],
                "choices": [],
            }

        feed = []

        narrator = (data.get("narrator_text") or "").strip()
        if narrator:
            item = {
                "type": "narrator",
                "text": narrator,
                "text_en": (data.get("narrator_text_en") or "").strip(),
            }
            feed.append(item)
            state.setdefault("narrative_log", []).append(item)

        for line in (data.get("character_lines") or []):
            name = line.get("name", "")
            text = (line.get("text") or "").strip()
            if name and text:
                item = {
                    "type": "character",
                    "speaker": name,
                    "text": text,
                    "text_en": (line.get("text_en") or "").strip(),
                    "emotion": line.get("emotion", ""),
                }
                feed.append(item)
                state.setdefault("narrative_log", []).append(item)

        choices = data.get("choices") or []
        input_mode = data.get("input_mode", "choice" if choices else "free")

        if choices:
            feed.append({
                "type": "choices",
                "choices": choices,
                "input_mode": input_mode,
            })

        hud = {}
        if user_input and trigger == "user_action":
            hud = await self._generate_hud(db, session, user_input)

        return {
            "feed_items": feed,
            "ai_response": {
                "input_mode": input_mode,
                "choices": choices,
            },
            "hud": hud,
            "relationship_changes": data.get("relationship_changes") or [],
        }

    async def _generate_hud(self, db: Session, session: GameSession, user_input: str) -> dict:
        native = session.native_language
        target = session.target_language

        system = (
            f"你是英语表达教练。用户在角色扮演游戏中说了一句话。"
            f"生成学习HUD帮助用户学习如何用{target}表达。\n\n"
            "返回JSON：\n"
            '{"main_expression":"用户意思的标准英文表达，1句不超18词",'
            f'"meaning_native":"{native}含义",'
            '"variants":{{"natural":"自然口语","dramatic":"戏剧化","formal":"正式","emotional":"带感情"}},'
            f'"why_this_expression":[{{"point":"要点","explanation":"{native}解释"}}],'
            '"patterns_v2":[{"pattern":"句型","example":"例句","add_to_crush":true}],'
            '"vocabulary":["词1","词2","词3"],'
            f'"agents":[{{"agent":"Story Coach","result":"{native}评价角色扮演表现"}},{{"agent":"Language Coach","result":"{native}点评表达"}},{{"agent":"Expression Guide","result":"{native}更多表达方式"}}]'
            "}"
        )
        user_msg = f"用户说：{user_input}"

        try:
            provider = _provider_for("game_challenge_hud", db)
            hud = await provider.complete_json(system, user_msg, temperature=0.7, max_tokens=900)
        except Exception as exc:
            logger.warning("roleplay HUD failed: %s", exc)
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
        patterns, vocab, expressions = [], [], []

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

        characters = state.get("story", {}).get("characters", [])
        rel_summary = [
            {"name": c["name"], "relationship": c.get("current_relationship", 50)}
            for c in characters
        ]

        return {
            "completed": state.get("completed", False),
            "chapters_played": state.get("current_chapter", 0) + 1,
            "total_turns": state.get("total_turns", 0),
            "score": session.score,
            "patterns": patterns,
            "vocabulary": vocab,
            "expressions": expressions,
            "relationships": rel_summary,
            "summary": "故事完结！" if state.get("completed") else "故事进行中",
        }

    def get_state_view(self, session: GameSession, user_id: str) -> dict:
        state = session.state or {}
        story = state.get("story", {})
        chapters = story.get("chapters", [])
        ch_idx = state.get("current_chapter", 0)
        current_ch = chapters[ch_idx] if ch_idx < len(chapters) else {}

        characters = []
        for c in story.get("characters", []):
            characters.append({
                "name": c["name"],
                "name_en": c.get("name_en", ""),
                "relationship": c.get("current_relationship", 50),
            })

        return {
            "current_chapter": ch_idx,
            "chapter_title": current_ch.get("title", ""),
            "chapter_title_en": current_ch.get("title_en", ""),
            "chapter_turn": state.get("chapter_turn", 0),
            "max_turns": story.get("max_turns_per_chapter", 8),
            "characters": characters,
            "total_chapters": len(chapters),
        }


register_engine(RoleplayEngine())
