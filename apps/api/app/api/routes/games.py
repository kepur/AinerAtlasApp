"""Unified games API — Story Game Forge."""
from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.services import game_engine as engine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/games", tags=["games"])


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class CreateSessionRequest(BaseModel):
    game_type: str
    template_id: str | None = None
    config: dict | None = None


class CreateTemplateRequest(BaseModel):
    title: str
    description: str
    game_type: str
    config: dict


class GenerateStoryRequest(BaseModel):
    prompt: str
    game_type: str = "roleplay"
    length: str = "medium"  # short | medium | long
    num_chapters: int = 3
    num_endings: int = 2


class AssetRequest(BaseModel):
    kind: str = "cover"
    title: str = ""
    url: str
    era: str = "modern"
    gender: str = "neutral"
    age: str = "adult"
    scene: str = ""
    tags: list[str] = []
    sort_order: int = 100


class AssetUpdateRequest(BaseModel):
    kind: str | None = None
    title: str | None = None
    url: str | None = None
    era: str | None = None
    gender: str | None = None
    age: str | None = None
    scene: str | None = None
    tags: list[str] | None = None
    enabled: bool | None = None
    sort_order: int | None = None


class RomanceCharacterCreateRequest(BaseModel):
    slug: str
    name: str
    name_en: str = ""
    role: str = ""
    age: int = 24
    gender: str = "neutral"
    voice: str = ""
    avatar_url: str = ""
    cover_url: str = ""
    category: str = "恋爱社交"
    personality: str = ""
    chat_style: str = ""
    identity_background: str = ""
    initial_scene: str = ""
    prompt_override: str = ""
    tags: list[str] = []
    difficulty: str = "B1"
    target_language: str = "en"
    native_language: str = "zh"
    estimated_minutes: int = 12
    title: str | None = None
    subtitle: str | None = None
    description: str | None = None
    enabled: bool = True
    sort_order: int = 100


class RomanceCharacterUpdateRequest(BaseModel):
    name: str | None = None
    name_en: str | None = None
    role: str | None = None
    age: int | None = None
    gender: str | None = None
    voice: str | None = None
    avatar_url: str | None = None
    cover_url: str | None = None
    category: str | None = None
    personality: str | None = None
    chat_style: str | None = None
    identity_background: str | None = None
    initial_scene: str | None = None
    prompt_override: str | None = None
    tags: list[str] | None = None
    difficulty: str | None = None
    target_language: str | None = None
    native_language: str | None = None
    estimated_minutes: int | None = None
    title: str | None = None
    subtitle: str | None = None
    description: str | None = None
    enabled: bool | None = None
    sort_order: int | None = None


class TurnRequest(BaseModel):
    action_type: str = "message"
    user_input: str = ""
    extra: dict | None = None


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

@router.get("/templates")
def list_templates(db: DBSession, game_type: str | None = None, include_disabled: bool = False) -> list[dict]:
    return engine.list_templates(db, game_type, include_disabled)


@router.get("/templates/{template_id}")
def get_template(template_id: str, db: DBSession) -> dict:
    try:
        return engine.get_template(db, template_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/templates")
def create_template(payload: CreateTemplateRequest, current_user: CurrentUser, db: DBSession) -> dict:
    from app.models import GameTemplate
    import uuid

    cfg = payload.config or {}
    # Surface key presentation fields from the generated config onto the
    # template columns so the story hall shows covers, tags and difficulty.
    t = GameTemplate(
        slug=f"{payload.game_type}-{uuid.uuid4().hex[:8]}",
        game_type=payload.game_type,
        title=payload.title,
        subtitle=cfg.get("subtitle", ""),
        description=payload.description,
        cover_url=cfg.get("cover_url", ""),
        difficulty=cfg.get("difficulty", "B1"),
        target_language=cfg.get("target_language", "en"),
        native_language=cfg.get("native_language", "zh"),
        estimated_minutes=cfg.get("estimated_minutes", 10),
        learning_focus=cfg.get("learning_focus", []),
        tags=cfg.get("tags", []),
        config=cfg,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {
        "id": t.id,
        "slug": t.slug,
        "game_type": t.game_type,
        "title": t.title,
        "subtitle": t.subtitle,
        "description": t.description,
        "cover_url": t.cover_url,
        "config": t.config,
    }


class TemplateUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    cover_url: str | None = None
    enabled: bool | None = None
    sort_order: int | None = None
    difficulty: str | None = None


@router.patch("/templates/{template_id}")
def update_template(template_id: str, payload: TemplateUpdateRequest, current_user: AdminUser, db: DBSession) -> dict:
    from app.models import GameTemplate
    t = db.get(GameTemplate, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    for field in ("title", "description", "cover_url", "enabled", "sort_order", "difficulty"):
        val = getattr(payload, field)
        if val is not None:
            setattr(t, field, val)
    db.commit()
    db.refresh(t)
    return engine._template_dict(t)


@router.delete("/templates/{template_id}")
def delete_template(template_id: str, current_user: AdminUser, db: DBSession) -> dict:
    from app.models import GameTemplate, GameSession
    from sqlalchemy import update
    t = db.get(GameTemplate, template_id)
    if t:
        # Detach any sessions that reference this template to avoid FK violations.
        db.execute(
            update(GameSession).where(GameSession.template_id == template_id).values(template_id=None)
        )
        db.delete(t)
        db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Asset library
# ---------------------------------------------------------------------------

@router.get("/assets")
def list_assets(
    db: DBSession,
    kind: str | None = None, era: str | None = None,
    gender: str | None = None, enabled_only: bool = False,
) -> list[dict]:
    from app.services import game_assets
    return game_assets.list_assets(db, kind, era, gender, enabled_only)


@router.get("/assets/pick")
def pick_asset(
    db: DBSession, kind: str = "cover",
    era: str | None = None, gender: str | None = None,
) -> dict:
    from app.services import game_assets
    return {"url": game_assets.pick_asset(db, kind, era, gender)}


@router.get("/voices")
def list_voices() -> list[dict]:
    """Available TTS voice presets for binding to characters."""
    from app.services import game_assets
    return game_assets.list_voices()


@router.get("/learning-packs")
def list_learning_packs(
    game_type: str,
    db: DBSession,
    pack_type: str | None = None,
) -> list[dict]:
    from app.services import game_learning_pack_service as packs
    return packs.list_packs(db, game_type, pack_type)


@router.post("/assets")
def create_asset(payload: AssetRequest, current_user: AdminUser, db: DBSession) -> dict:
    from app.services import game_assets
    return game_assets.create_asset(db, payload.model_dump())


@router.patch("/assets/{asset_id}")
def update_asset(asset_id: str, payload: AssetUpdateRequest, current_user: AdminUser, db: DBSession) -> dict:
    from app.services import game_assets
    try:
        return game_assets.update_asset(db, asset_id, payload.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/assets/{asset_id}")
def delete_asset(asset_id: str, current_user: AdminUser, db: DBSession) -> dict:
    from app.services import game_assets
    game_assets.delete_asset(db, asset_id)
    return {"ok": True}


def _romance_character_from_template(t) -> dict:
    cfg = t.config or {}
    return {
        "id": f"tpl:{t.id}",
        "target_id": cfg.get("target_id") or t.slug,
        "template_id": t.id,
        "source": "template",
        "slug": t.slug,
        "name": cfg.get("name") or t.title,
        "name_en": cfg.get("name_en", ""),
        "age": cfg.get("age", 24),
        "role": cfg.get("role", ""),
        "gender": cfg.get("gender", "neutral"),
        "voice": cfg.get("voice", ""),
        "avatar_url": cfg.get("avatar_url") or t.cover_url,
        "cover_url": cfg.get("cover_url") or t.cover_url,
        "category": cfg.get("category", "恋爱社交"),
        "personality": cfg.get("personality", ""),
        "chat_style": cfg.get("chat_style", ""),
        "identity_background": cfg.get("identity_background", ""),
        "initial_scene": cfg.get("initial_scene", ""),
        "prompt_override": cfg.get("prompt_override", ""),
        "tags": cfg.get("tags") or t.tags or [],
        "difficulty": t.difficulty,
        "target_language": t.target_language,
        "native_language": t.native_language,
        "estimated_minutes": t.estimated_minutes,
        "enabled": t.enabled,
        "sort_order": t.sort_order,
        "title": t.title,
        "subtitle": t.subtitle,
        "description": t.description,
    }


@router.get("/romance-characters")
def list_romance_characters(db: DBSession, category: str | None = None, include_disabled: bool = False) -> list[dict]:
    from app.models import GameTemplate
    from app.services.romance_engine import list_builtin_targets
    from sqlalchemy import select

    rows = db.execute(
        select(GameTemplate).where(GameTemplate.game_type == "romance").order_by(
            GameTemplate.sort_order, GameTemplate.created_at.desc()
        )
    ).scalars().all()
    template_chars = [_romance_character_from_template(t) for t in rows if include_disabled or t.enabled]

    builtin_chars: list[dict] = []
    for item in list_builtin_targets():
        builtin_chars.append({
            "id": item["id"],
            "target_id": item["id"],
            "template_id": None,
            "source": "builtin",
            "slug": item["id"],
            **item,
            "enabled": True,
            "sort_order": 10,
            "title": item.get("name", ""),
            "subtitle": item.get("category", ""),
            "description": item.get("initial_scene", ""),
            "target_language": item.get("target_language", "en"),
            "native_language": item.get("native_language", "zh"),
            "estimated_minutes": item.get("estimated_minutes", 12),
            "difficulty": item.get("difficulty", "B1"),
        })

    merged = template_chars + builtin_chars
    deduped: list[dict] = []
    seen: set[str] = set()
    for item in merged:
        tid = item.get("target_id") or item.get("id")
        if not tid or tid in seen:
            continue
        seen.add(tid)
        deduped.append(item)

    if category and category != "全部":
        deduped = [
            c for c in deduped
            if c.get("category") == category or category in (c.get("tags") or [])
        ]
    return deduped


@router.post("/admin/romance-characters")
def create_romance_character(payload: RomanceCharacterCreateRequest, current_user: AdminUser, db: DBSession) -> dict:
    from app.models import GameTemplate

    cfg = {
        "target_id": payload.slug,
        "name": payload.name,
        "name_en": payload.name_en or payload.name,
        "age": payload.age,
        "role": payload.role,
        "gender": payload.gender,
        "voice": payload.voice,
        "avatar_url": payload.avatar_url,
        "cover_url": payload.cover_url,
        "category": payload.category,
        "personality": payload.personality,
        "chat_style": payload.chat_style,
        "identity_background": payload.identity_background,
        "initial_scene": payload.initial_scene,
        "prompt_override": payload.prompt_override,
        "tags": payload.tags,
        "target_language": payload.target_language,
        "native_language": payload.native_language,
        "estimated_minutes": payload.estimated_minutes,
        "difficulty": payload.difficulty,
    }
    t = GameTemplate(
        slug=payload.slug,
        game_type="romance",
        title=payload.title or payload.name,
        subtitle=payload.subtitle or payload.category,
        description=payload.description or payload.initial_scene,
        cover_url=payload.cover_url or payload.avatar_url,
        difficulty=payload.difficulty,
        target_language=payload.target_language,
        native_language=payload.native_language,
        estimated_minutes=payload.estimated_minutes,
        learning_focus=[],
        tags=payload.tags,
        config=cfg,
        enabled=payload.enabled,
        sort_order=payload.sort_order,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _romance_character_from_template(t)


@router.patch("/admin/romance-characters/{template_id}")
def update_romance_character(template_id: str, payload: RomanceCharacterUpdateRequest, current_user: AdminUser, db: DBSession) -> dict:
    from app.models import GameTemplate

    t = db.get(GameTemplate, template_id)
    if not t or t.game_type != "romance":
        raise HTTPException(status_code=404, detail="Romance character not found")
    cfg = dict(t.config or {})
    data = payload.model_dump(exclude_none=True)

    mapping = {
        "name", "name_en", "age", "role", "gender", "voice", "avatar_url", "cover_url",
        "category", "personality", "chat_style", "identity_background",
        "initial_scene", "prompt_override", "tags",
    }
    for key in mapping:
        if key in data:
            cfg[key] = data[key]
    if "tags" in data:
        t.tags = data["tags"]
    if "difficulty" in data:
        t.difficulty = data["difficulty"]
        cfg["difficulty"] = data["difficulty"]
    if "target_language" in data:
        t.target_language = data["target_language"]
        cfg["target_language"] = data["target_language"]
    if "native_language" in data:
        t.native_language = data["native_language"]
        cfg["native_language"] = data["native_language"]
    if "estimated_minutes" in data:
        t.estimated_minutes = data["estimated_minutes"]
        cfg["estimated_minutes"] = data["estimated_minutes"]
    if "title" in data:
        t.title = data["title"]
    if "subtitle" in data:
        t.subtitle = data["subtitle"]
    if "description" in data:
        t.description = data["description"]
    if "enabled" in data:
        t.enabled = data["enabled"]
    if "sort_order" in data:
        t.sort_order = data["sort_order"]
    t.cover_url = cfg.get("cover_url") or cfg.get("avatar_url") or t.cover_url
    t.config = cfg
    db.commit()
    db.refresh(t)
    return _romance_character_from_template(t)


@router.delete("/admin/romance-characters/{template_id}")
def delete_romance_character(template_id: str, current_user: AdminUser, db: DBSession) -> dict:
    from app.models import GameTemplate, GameSession
    from sqlalchemy import update
    t = db.get(GameTemplate, template_id)
    if t and t.game_type == "romance":
        db.execute(update(GameSession).where(GameSession.template_id == template_id).values(template_id=None))
        db.delete(t)
        db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

_LENGTH_SPEC = {
    "short": {"label": "短篇（轻松，约15-20分钟）", "turns": 5},
    "medium": {"label": "中篇（约25-35分钟）", "turns": 8},
    "long": {"label": "长篇（史诗，约45分钟以上）", "turns": 12},
}


@router.post("/generate-story")
async def generate_story_for_user(payload: GenerateStoryRequest, current_user: CurrentUser, db: DBSession) -> dict:
    """Generate a custom roleplay outline for the H5 story builder."""
    return await _generate_story_outline(payload, db)


@router.post("/admin/generate-story")
async def generate_story(payload: GenerateStoryRequest, current_user: AdminUser, db: DBSession) -> dict:
    return await _generate_story_outline(payload, db)


async def _generate_story_outline(payload: GenerateStoryRequest, db: DBSession) -> dict:
    from app.services.llm import get_llm_provider_for_task
    from app.services.runtime_config import resolve_default_llm_provider
    from app.services import game_assets

    spec = _LENGTH_SPEC.get(payload.length, _LENGTH_SPEC["medium"])
    chapters = max(1, min(8, payload.num_chapters))
    endings = max(1, min(5, payload.num_endings))

    provider = get_llm_provider_for_task("chat", resolve_default_llm_provider(db), db)
    prompt = f"""You are an expert game designer for language-learning interactive fiction.
Design a complete, branching roleplay story OUTLINE from this prompt: "{payload.prompt}"

This is a concise STRUCTURE generated once and stored; the actual dialogue is
generated live per turn during play. Keep each text field short (1-2 sentences).

Requirements:
- Scale: {spec['label']} → exactly {chapters} chapters, {spec['turns']} turns each.
- Exactly {endings} distinct endings reachable by different player choices.
- Each chapter offers meaningful choices so different answers lead to different results.

Return ONLY a valid JSON object with this schema:
{{
  "title": "Short title (中文)",
  "subtitle": "Genre / Theme",
  "description": "2-3 sentence hook (中文)",
  "setting": "World setting description (中文)",
  "era": "modern | ancient | cyberpunk | fantasy | other",
  "characters": [
    {{"name": "中文名", "name_en": "English Name", "gender": "male|female", "personality": "短描述", "relationship": 50}}
  ],
  "chapters": [
    {{"id": "ch1", "title": "中文标题", "title_en": "English Title", "goal": "本章目标",
      "branches": [{{"choice": "玩家可能的选择", "outcome": "导致的结果/走向"}}]}}
  ],
  "endings": [
    {{"id": "e1", "title": "结局标题", "condition": "触发条件(基于玩家选择/关系值)", "summary": "结局描述"}}
  ],
  "learning_focus": ["Tag1", "Tag2"],
  "max_turns_per_chapter": {spec['turns']}
}}
"""
    try:
        data = await provider.complete_json(
            system_prompt="You are an expert game designer for language learning RPGs. Return ONLY valid JSON.",
            user_content=prompt,
            max_tokens=2500,
        )
        if not isinstance(data, dict) or not data.get("title"):
            raise ValueError("empty story")
    except Exception as e:
        logger.error(f"Failed to generate story: {e}")
        raise HTTPException(status_code=500, detail="AI 生成失败，请重试或换一个设定。")

    # Assign visuals from the managed asset library (not the frontend).
    era = data.get("era") or game_assets.infer_era(f"{data.get('title','')} {data.get('description','')} {payload.prompt}")
    data["era"] = era
    data["cover_url"] = game_assets.pick_asset(db, "cover", era=era)
    for c in data.get("characters", []):
        gender = c.get("gender") or game_assets.infer_gender(f"{c.get('name','')} {c.get('personality','')}")
        c["gender"] = gender
        c["avatar_url"] = game_assets.pick_asset(db, "avatar", era=era, gender=gender)
        c["voice"] = c.get("voice") or game_assets.pick_voice(gender)
    data.setdefault("length", payload.length)
    return data


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

@router.post("/sessions")
async def create_session(
    payload: CreateSessionRequest, current_user: CurrentUser, db: DBSession,
) -> dict:
    try:
        return await engine.create_session(
            db, current_user.id, payload.game_type,
            payload.template_id, payload.config,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("create game session failed")
        raise HTTPException(status_code=503, detail=f"创建游戏失败：{exc}") from exc


@router.get("/sessions")
def list_sessions(
    current_user: CurrentUser, db: DBSession, status: str | None = None,
) -> list[dict]:
    return engine.list_sessions(db, current_user.id, status)


@router.get("/sessions/{session_id}")
def get_session(session_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return engine.get_session(db, session_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/turns")
async def send_turn(
    session_id: str, payload: TurnRequest,
    current_user: CurrentUser, db: DBSession,
) -> dict:
    try:
        return await engine.handle_turn(
            db, session_id, current_user.id,
            payload.action_type, payload.user_input, payload.extra,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("game turn failed")
        raise HTTPException(status_code=503, detail=f"游戏操作失败：{exc}") from exc


@router.post("/sessions/{session_id}/turns/stream")
async def send_turn_stream(
    session_id: str, payload: TurnRequest,
    current_user: CurrentUser, db: DBSession,
):
    """Streaming turn endpoint for roleplay games (SSE)."""
    from app.services import game_engine as eg
    from app.models import GameSession
    from sqlalchemy import select

    sess = db.scalar(
        select(GameSession).where(
            GameSession.id == session_id,
            GameSession.user_id == current_user.id,
        )
    )
    if not sess or sess.status != "active":
        raise HTTPException(status_code=400, detail="Game session not found or not active")

    # Any engine that implements handle_turn_stream can stream token-by-token;
    # others fall back to a single non-streaming complete event.
    eng = engine.get_engine(sess.game_type)
    if not hasattr(eng, "handle_turn_stream"):
        try:
            result = await engine.handle_turn(
                db, session_id, current_user.id,
                payload.action_type, payload.user_input, payload.extra,
            )
            async def single_event() -> AsyncGenerator[str, None]:
                yield f"event: complete\ndata: {json.dumps(result, ensure_ascii=False, default=str)}\n\n"
            return StreamingResponse(single_event(), media_type="text/event-stream")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            logger.exception("game turn failed")
            raise HTTPException(status_code=503, detail=f"游戏操作失败：{exc}") from exc

    async def sse_generator() -> AsyncGenerator[str, None]:
        try:
            async for event in eng.handle_turn_stream(
                db, sess, payload.action_type, payload.user_input, payload.extra or {},
            ):
                if event["type"] == "partial_feed":
                    yield f"event: feed\ndata: {json.dumps(event['data'], ensure_ascii=False, default=str)}\n\n"
                elif event["type"] == "complete":
                    from sqlalchemy.orm.attributes import flag_modified
                    from app.models import GameTurn
                    from app.models import new_id

                    data = event["data"]

                    # Persist the turn + session state
                    sess.turn_count += 1
                    turn = GameTurn(
                        id=new_id(),
                        session_id=sess.id,
                        turn_number=sess.turn_count,
                        actor="user",
                        action_type=payload.action_type,
                        user_input=payload.user_input,
                        ai_response=data.get("ai_response", {}),
                        hud=data.get("hud", {}),
                        feed_items=data.get("feed_items", []),
                        phase_after=sess.phase,
                    )
                    db.add(turn)

                    sess.state = data.get("state", sess.state)
                    flag_modified(sess, "state")
                    if data.get("ended"):
                        sess.status = "ended"
                        sess.ended_at = datetime.now(UTC)
                        sess.score = data.get("score", sess.score)

                    db.commit()
                    db.refresh(turn)

                    try:
                        view = eng.get_state_view(sess, current_user.id)
                    except Exception:  # noqa: BLE001
                        view = {}

                    final = {
                        "turn": {
                            "id": turn.id,
                            "turn_number": turn.turn_number,
                            "actor": turn.actor,
                            "action_type": turn.action_type,
                            "user_input": turn.user_input,
                            "ai_response": turn.ai_response,
                            "hud": turn.hud,
                            "feed_items": turn.feed_items,
                            "phase_after": turn.phase_after,
                        },
                        "session": {
                            "id": sess.id,
                            "game_type": sess.game_type,
                            "title": sess.title,
                            "phase": sess.phase,
                            "turn_count": sess.turn_count,
                            "score": sess.score,
                            "status": sess.status,
                            "view": view,
                        },
                    }
                    yield f"event: complete\ndata: {json.dumps(final, ensure_ascii=False, default=str)}\n\n"
        except Exception as exc:
            logger.exception("streaming turn failed")
            yield f"event: error\ndata: {json.dumps({'detail': str(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


@router.get("/sessions/{session_id}/summary")
async def get_summary(
    session_id: str, current_user: CurrentUser, db: DBSession,
) -> dict:
    try:
        return await engine.get_summary(db, session_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
