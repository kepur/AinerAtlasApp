from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, DBSession
from app.services import social_logic_engine as engine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/games/social-logic", tags=["social-logic"])


class CreateGameRequest(BaseModel):
    difficulty: str = "easy"
    target_language: str = "en"
    native_language: str = "zh"


class QuestionRequest(BaseModel):
    target_player_id: str
    content: str


class VoteRequest(BaseModel):
    target_player_id: str
    reason: str = ""


@router.post("")
async def create_game(payload: CreateGameRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return await engine.create_game(
            db, current_user.id, payload.difficulty,
            payload.target_language, payload.native_language,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("create social-logic game failed")
        raise HTTPException(status_code=503, detail=f"创建游戏失败：{exc}") from exc


@router.get("/{game_id}")
def get_game(game_id: str, current_user: CurrentUser) -> dict:
    try:
        return engine.get_game(game_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{game_id}/question")
async def question(game_id: str, payload: QuestionRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return await engine.question_player(
            db, game_id, current_user.id, payload.target_player_id, payload.content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("social-logic question failed")
        raise HTTPException(status_code=503, detail=f"提问失败：{exc}") from exc


@router.post("/{game_id}/vote")
async def vote(game_id: str, payload: VoteRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return await engine.cast_vote(
            db, game_id, current_user.id, payload.target_player_id, payload.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("social-logic vote failed")
        raise HTTPException(status_code=503, detail=f"投票失败：{exc}") from exc


@router.get("/{game_id}/summary")
async def summary(game_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return await engine.summarize_game(db, game_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
