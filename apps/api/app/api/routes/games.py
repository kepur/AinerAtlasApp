"""Unified games API — Story Game Forge."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, DBSession
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


class TurnRequest(BaseModel):
    action_type: str = "message"
    user_input: str = ""
    extra: dict | None = None


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

@router.get("/templates")
def list_templates(db: DBSession, game_type: str | None = None) -> list[dict]:
    return engine.list_templates(db, game_type)


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
    
    t = GameTemplate(
        slug=f"{payload.game_type}-{uuid.uuid4().hex[:8]}",
        game_type=payload.game_type,
        title=payload.title,
        description=payload.description,
        config=payload.config,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {
        "id": t.id,
        "slug": t.slug,
        "game_type": t.game_type,
        "title": t.title,
        "description": t.description,
        "config": t.config,
    }


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

@router.post("/admin/generate-story")
async def generate_story(payload: GenerateStoryRequest, current_user: CurrentUser, db: DBSession) -> dict:
    from app.services.llm import get_llm_provider_for_task
    from app.services.runtime_config import resolve_default_llm_provider
    import json
    
    provider = get_llm_provider_for_task("chat", resolve_default_llm_provider(db), db)
    prompt = f"""You are an expert game designer for language learning RPGs.
Generate a complete roleplay story setting based on this prompt: "{payload.prompt}"
Return ONLY a valid JSON object matching this schema exactly:
{{
  "title": "Short title",
  "subtitle": "Genre / Theme",
  "description": "2-3 sentences description of the story hook",
  "setting": "Description of the world setting",
  "characters": [
    {{
      "name": "Character Name",
      "name_en": "English Name",
      "personality": "Short description",
      "relationship": 50
    }}
  ],
  "chapters": [
    {{
      "id": "ch1",
      "title": "Chapter 1 Title",
      "title_en": "Chapter 1 English Title",
      "goal": "What the user needs to achieve"
    }}
  ],
  "learning_focus": ["Tag1", "Tag2"],
  "max_turns_per_chapter": 8
}}
"""
    try:
        data = await provider.complete_json(
            system_prompt="You are an expert game designer for language learning RPGs. Return ONLY valid JSON.",
            user_content=prompt
        )
        return data
    except Exception as e:
        logger.error(f"Failed to generate story: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI story output.")


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


@router.get("/sessions/{session_id}/summary")
async def get_summary(
    session_id: str, current_user: CurrentUser, db: DBSession,
) -> dict:
    try:
        return await engine.get_summary(db, session_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
