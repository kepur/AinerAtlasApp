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
        "cover_url": "https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?auto=format&fit=crop&q=80&w=600",
        "characters": [
            {"name": "小师妹", "name_en": "Junior Sister", "gender": "female", "avatar_url": "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=150", "personality": "活泼天真，对主角有好感，但隐藏着秘密", "relationship": 60},
            {"name": "大师兄", "name_en": "Senior Brother", "gender": "male", "avatar_url": "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=150", "personality": "严肃正直，武功高强，暗中保护门派", "relationship": 50},
            {"name": "师父", "name_en": "Master", "gender": "male", "avatar_url": "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=150", "personality": "高深莫测，话少但每句都有深意", "relationship": 40},
        ],
        "chapters": [
            {"id": "ch1", "title": "重生之始", "title_en": "The Rebirth", "goal": "了解当前处境，与师门众人重新相处"},
            {"id": "ch2", "title": "后山重逢", "title_en": "Reunion at the Back Mountain", "goal": "与小师妹在后山偶遇，选择如何相处"},
            {"id": "ch3", "title": "暗流涌动", "title_en": "Undercurrents", "goal": "发现门派中的异常，做出关键选择"},
        ],
        "learning_focus": ["情绪表达", "保持距离", "委婉拒绝", "描述感受"],
        "max_turns_per_chapter": 8,
        "opening": {
            "feed_items": [
                {"type": "narrator",
                 "text": "你睁开眼，发现自己回到了青云门入门第一年的清晨。木床、青衫、窗外此起彼伏的练剑声——你真的重生了。",
                 "text_en": "You open your eyes, back to the first morning of your first year at Qingyun Sect. The wooden bed, the blue robe, the sound of sword practice outside — you have truly been reborn."},
                {"type": "character", "speaker": "小师妹", "emotion": "开心",
                 "text": "师兄！你终于醒了！今天师父要亲自考校新弟子的功课呢，快起来呀！",
                 "text_en": "Senior Brother! You're finally awake! Master will personally test the new disciples today — get up quickly!"},
                {"type": "character", "speaker": "大师兄", "emotion": "严肃",
                 "text": "师弟，今日早课不可缺席，师父已在正堂等候。",
                 "text_en": "Junior Brother, you must not miss morning class today. Master is already waiting in the main hall."},
                {"type": "choices", "input_mode": "mixed", "choices": [
                    {"label": "向小师妹微笑，询问近况 (Smile at Junior Sister and ask how she's been)", "action": "A"},
                    {"label": "迅速起身整理衣冠 (Quickly get up and tidy your robes)", "action": "B"},
                    {"label": "环顾四周，确认自己真的重生了 (Look around to confirm you are truly reborn)", "action": "C"},
                ]},
            ],
        },
    },
    "cafe_encounter": {
        "title": "咖啡馆奇遇",
        "subtitle": "现代 · 日常社交",
        "description": "你在一家咖啡馆遇到一个有趣的陌生人。一段意想不到的对话即将展开...",
        "setting": "现代城市咖啡馆。一个安静的下午。",
        "cover_url": "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=600",
        "characters": [
            {"name": "陌生人", "name_en": "Stranger", "gender": "female", "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", "personality": "神秘优雅，说话温和但意味深长", "relationship": 30},
            {"name": "咖啡师", "name_en": "Barista", "gender": "male", "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150", "personality": "健谈热情，善于察言观色", "relationship": 50},
        ],
        "chapters": [
            {"id": "ch1", "title": "初次相遇", "title_en": "First Meeting", "goal": "与陌生人开始对话"},
            {"id": "ch2", "title": "深入了解", "title_en": "Getting to Know", "goal": "发现陌生人的真实身份"},
        ],
        "learning_focus": ["自我介绍", "提问技巧", "表达兴趣", "礼貌用语"],
        "max_turns_per_chapter": 8,
        "opening": {
            "feed_items": [
                {"type": "narrator",
                 "text": "午后的咖啡馆很安静，阳光斜照在木桌上。你端着咖啡，注意到窗边坐着一位正在看书的陌生人。",
                 "text_en": "The café is quiet in the afternoon, sunlight slanting across the wooden tables. Coffee in hand, you notice a stranger reading by the window."},
                {"type": "character", "speaker": "陌生人", "emotion": "温和",
                 "text": "(抬头微笑) Oh, hi. I don't think I've seen you here before — is this seat taken?",
                 "text_en": "(looks up with a smile) Oh, hi. I don't think I've seen you here before — is this seat taken?"},
                {"type": "choices", "input_mode": "mixed", "choices": [
                    {"label": "微笑回应并坐下 (Smile back and take the seat)", "action": "A"},
                    {"label": "问对方在看什么书 (Ask what they're reading)", "action": "B"},
                    {"label": "礼貌地先点头致意 (Give a polite nod first)", "action": "C"},
                ]},
            ],
        },
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
                "endings": story.get("endings", []),
                "learning_focus": story.get("learning_focus", []),
                "max_turns_per_chapter": story.get("max_turns_per_chapter", 8),
                "cover_url": story.get("cover_url", ""),
                "opening": story.get("opening"),
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

    async def handle_turn_stream(
        self, db: Session, session: GameSession, action_type: str,
        user_input: str, extra: dict,
    ):
        """Streaming version of handle_turn. Yields streaming events.

        Yields dicts:
            {"type": "text", "text": str} — partial narrative text
            {"type": "complete", "data": dict} — final result (same shape as handle_turn return)
        """
        state = dict(session.state)

        if action_type == "start":
            result = await self._start_story(db, session, state)
            yield {"type": "complete", "data": result}
            return

        if action_type in ("message", "choice"):
            session.phase = "playing"
            state["chapter_turn"] = state.get("chapter_turn", 0) + 1
            state["total_turns"] = state.get("total_turns", 0) + 1

            # Stream narrative text
            async for event in self._handle_message_stream(db, session, state, user_input, extra):
                yield event
            return

        if action_type == "next_chapter":
            result = await self._next_chapter(db, session, state)
            yield {"type": "complete", "data": result}
            return

        raise ValueError(f"Unknown action: {action_type}")

    async def _handle_message_stream(
        self, db: Session, session: GameSession, state: dict,
        user_input: str, extra: dict,
    ):
        """Streaming message handler. Yields text/completion events."""
        feed: list = []
        if user_input:
            feed.append({"type": "user_action", "text": user_input})

        # Let the user input bubble show immediately (user_input is always provided for message/choice)
        if feed:
            yield {"type": "partial_feed", "data": {"feed_items": [feed[-1]]}}

        # Stream narrative
        async for event in self._generate_narrative_stream(db, session, state, "user_action", user_input):
            if event["type"] == "text":
                # Yield narrative text for immediate display
                text_item = {"type": "narrator", "text": event["text"]}
                yield {"type": "partial_feed", "data": {"feed_items": [text_item]}}
            elif event["type"] == "complete":
                result = event["data"]
                feed.extend(result.get("feed_items", []))

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
                        yield {"type": "complete", "data": {
                            "state": state,
                            "feed_items": feed,
                            "ai_response": result.get("ai_response", {}),
                            "hud": result.get("hud", {}),
                            "ended": True,
                            "score": 80,
                        }}
                        return

                hud = result.get("hud", {})

                yield {"type": "complete", "data": {
                    "state": state,
                    "feed_items": feed,
                    "ai_response": result.get("ai_response", {}),
                    "hud": hud,
                }}

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

        # Prefer a pre-authored opening (instant entry, no LLM round-trip). Only
        # call the model when a story has no cached opening (e.g. older templates).
        opening = story.get("opening")
        if opening and opening.get("feed_items"):
            feed.extend(opening["feed_items"])
            for item in opening["feed_items"]:
                if item.get("type") in ("narrator", "character"):
                    state.setdefault("narrative_log", []).append(item)
        else:
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
        feed: list = []
        if user_input:
            feed.append({"type": "user_action", "text": user_input})
        feed.extend(result.get("feed_items", []))

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

        # Authored branches/endings steer "different answers → different results".
        branch_lines = []
        for b in (ch.get("branches") or []):
            branch_lines.append(f"  · 若玩家{b.get('choice','')} → {b.get('outcome','')}")
        ending_lines = []
        for e in (story.get("endings") or []):
            ending_lines.append(f"  · {e.get('title','')}（条件：{e.get('condition','')}）：{e.get('summary','')}")

        recent = state.get("narrative_log", [])[-6:]
        recent_text = "\n".join(f"[{e.get('type','')}] {e.get('speaker','')}: {e.get('text','')}" for e in recent)

        native = session.native_language
        target = session.target_language

        branches_block = ("\n本章分支走向：\n" + "\n".join(branch_lines)) if branch_lines else ""
        endings_block = ("\n可能的结局（依玩家选择导向其一）：\n" + "\n".join(ending_lines)) if ending_lines else ""

        from app.services.game_prompts import get_game_prompt
        system = get_game_prompt(db, "roleplay.narrative",
            self._build_narrative_system_prompt(story, ch, char_lines, branches_block, endings_block))

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

        return await self._build_narrative_result(data, state, user_input, trigger, db, session)

    async def _generate_narrative_stream(
        self, db: Session, session: GameSession, state: dict,
        trigger: str, user_input: str,
    ):
        """Streaming version of _generate_narrative. Yields streaming text events.

        Yields:
            dict with keys:
            - {"type": "text", "text": str} — partial narrative text
            - {"type": "complete", "data": dict} — final structured result
        """
        story = state["story"]
        chapters = story.get("chapters", [])
        ch_idx = state.get("current_chapter", 0)
        ch = chapters[ch_idx] if ch_idx < len(chapters) else {}

        char_lines = []
        for c in story.get("characters", []):
            char_lines.append(f"- {c['name']}({c.get('name_en','')}): {c['personality']}, 好感度={c.get('current_relationship', 50)}")

        branch_lines = []
        for b in (ch.get("branches") or []):
            branch_lines.append(f"  · 若玩家{b.get('choice','')} → {b.get('outcome','')}")
        ending_lines = []
        for e in (story.get("endings") or []):
            ending_lines.append(f"  · {e.get('title','')}（条件：{e.get('condition','')}）：{e.get('summary','')}")

        recent = state.get("narrative_log", [])[-6:]
        recent_text = "\n".join(f"[{e.get('type','')}] {e.get('speaker','')}: {e.get('text','')}" for e in recent)

        branches_block = ("\n本章分支走向：\n" + "\n".join(branch_lines)) if branch_lines else ""
        endings_block = ("\n可能的结局（依玩家选择导向其一）：\n" + "\n".join(ending_lines)) if ending_lines else ""

        from app.services.game_prompts import get_game_prompt
        system = get_game_prompt(db, "roleplay.narrative",
            self._build_narrative_system_prompt(story, ch, char_lines, branches_block, endings_block))

        if trigger == "story_opening":
            user_msg = "请生成故事开场白和第一段叙述。角色自然地出场。"
        elif trigger == "chapter_opening":
            user_msg = f"新章节开始：{ch.get('title', '')}。生成过渡叙述。\n\n最近剧情：\n{recent_text}"
        else:
            user_msg = f"玩家的行动/对话：{user_input}\n\n最近剧情：\n{recent_text}"

        try:
            provider = _provider_for("game_ai_speech", db)
            stream = provider.complete_json_stream(system, user_msg, temperature=0.85, max_tokens=1200)

            import re
            buffer = ""
            last_yielded_text = ""
            # Tolerant extractor: pull the growing narrator_text value out of the
            # partial JSON before the whole object is valid, so text streams smoothly.
            narrator_re = re.compile(r'"narrator_text"\s*:\s*"((?:[^"\\]|\\.)*)', re.S)

            def _extract_narrator(buf: str) -> str:
                m = narrator_re.search(buf)
                if not m:
                    return ""
                raw = m.group(1)
                try:
                    return json.loads('"' + raw + '"')  # unescape \n, \" etc.
                except Exception:
                    return raw.replace('\\n', '\n').replace('\\"', '"')

            async for chunk in stream:
                if chunk == "___STREAM_JSON_DONE___":
                    # Don't break — let the (Fallback) generator finish so it can
                    # propagate `_stream_json_result` after the inner gen exhausts.
                    continue
                buffer += chunk
                ntext = _extract_narrator(buffer)
                if ntext and len(ntext) > len(last_yielded_text):
                    new_part = ntext[len(last_yielded_text):]
                    if new_part:
                        yield {"type": "text", "text": new_part}
                    last_yielded_text = ntext

            # Get the final parsed result; fall back to parsing the raw buffer.
            data = getattr(provider, "_stream_json_result", None)
            if not data:
                try:
                    data = json.loads(buffer)
                except Exception:
                    data = None
            if not data or "narrator_text" not in data:
                data = {
                    "narrator_text": "故事继续...",
                    "narrator_text_en": "The story continues...",
                    "character_lines": [],
                    "choices": [],
                }

        except Exception as exc:
            logger.warning("roleplay narrative stream failed: %s", exc)
            data = {
                "narrator_text": "故事继续...",
                "narrator_text_en": "The story continues...",
                "character_lines": [],
                "choices": [],
            }

        complete = await self._build_narrative_result(data, state, user_input, trigger, db, session)
        yield {"type": "complete", "data": complete}

    def _build_narrative_system_prompt(self, story: dict, ch: dict,
                                        char_lines: list, branches_block: str,
                                        endings_block: str) -> str:
        """Build the system prompt for narrative generation."""
        return (
            f"你是角色扮演游戏的AI叙述者和角色扮演者。\n\n"
            f"世界设定：{story['setting']}\n"
            f"当前章节：{ch.get('title', '')} - 目标：{ch.get('goal', '')}\n"
            f"角色：\n{''.join(char_lines)}\n"
            f"{branches_block}{endings_block}\n\n"
            "规则：\n"
            "- 根据玩家的选择/回答，朝对应的分支与结局推进，让不同选择导向不同结果\n"
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

    async def _build_narrative_result(self, data: dict, state: dict,
                                 user_input: str, trigger: str,
                                 db: Session, session: GameSession) -> dict:
        """Build the structured narrative result from LLM JSON data."""
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
            try:
                hud = await self._generate_hud(db, session, user_input)
            except Exception as exc:
                logger.warning("roleplay HUD failed: %s", exc)

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
                "avatar_url": c.get("avatar_url", ""),
                "gender": c.get("gender", ""),
                "voice": c.get("voice", ""),
            })

        return {
            "current_chapter": ch_idx,
            "chapter_title": current_ch.get("title", ""),
            "chapter_title_en": current_ch.get("title_en", ""),
            "chapter_turn": state.get("chapter_turn", 0),
            "max_turns": story.get("max_turns_per_chapter", 8),
            "characters": characters,
            "cover_url": story.get("cover_url", ""),
            "setting": story.get("setting", ""),
            "total_chapters": len(chapters),
        }


register_engine(RoleplayEngine())
