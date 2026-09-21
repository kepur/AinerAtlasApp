from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, DBSession
from app.services import social_logic_engine as engine
from app.services.learning_language import learning_language

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/games/social-logic", tags=["social-logic"])


class CreateGameRequest(BaseModel):
    difficulty: str = "easy"
    target_language: str = "en"
    native_language: str = "zh"


class QuestionRequest(BaseModel):
    target_player_id: str
    content: str


class HelpExpressRequest(BaseModel):
    content: str
    target_player_id: str | None = None


class VoteRequest(BaseModel):
    target_player_id: str
    reason: str = ""


@router.post("")
async def create_game(payload: CreateGameRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return await engine.create_game(
            db, current_user.id, payload.difficulty,
            learning_language(db, current_user.id,
                payload.target_language if "target_language" in payload.model_fields_set else None), payload.native_language,
        )
    except Exception as exc:
        logger.exception("create social-logic game failed")
        raise HTTPException(status_code=503, detail=f"创建游戏失败：{exc}") from exc


@router.post("/{game_id}/deal")
async def deal_cards(game_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return await engine.deal_cards(db, game_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("deal cards failed")
        raise HTTPException(status_code=503, detail=f"发牌失败：{exc}") from exc


@router.post("/{game_id}/start")
async def start_game(game_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return await engine.start_game(db, game_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("start game failed")
        raise HTTPException(status_code=503, detail=f"开始游戏失败：{exc}") from exc


@router.get("/{game_id}")
def get_game(game_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return engine.get_game(db, game_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{game_id}/question")
async def question(
    game_id: str, payload: QuestionRequest, current_user: CurrentUser, db: DBSession,
    background_tasks: BackgroundTasks,
) -> dict:
    try:
        result = await engine.question_player(
            db, game_id, current_user.id, payload.target_player_id, payload.content,
        )
        # The accused has already answered; analyse the challenge afterwards.
        turn_index = result.pop("hud_turn_index", None)
        if turn_index is not None:
            target_name = next(
                (p.get("name", "") for p in (result.get("state") or {}).get("players", [])
                 if p.get("id") == payload.target_player_id),
                "",
            )
            background_tasks.add_task(
                engine.run_question_hud,
                game_id, current_user.id, turn_index, payload.content, target_name,
            )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("social-logic question failed")
        raise HTTPException(status_code=503, detail=f"提问失败：{exc}") from exc


@router.post("/{game_id}/help-express")
async def help_express(
    game_id: str, payload: HelpExpressRequest, current_user: CurrentUser, db: DBSession,
) -> dict:
    try:
        return await engine.help_express(
            db, game_id, current_user.id, payload.content, payload.target_player_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("social-logic help-express failed")
        raise HTTPException(status_code=503, detail=f"表达生成失败：{exc}") from exc


@router.get("/{game_id}/learning-turns/{turn_index}")
async def get_learning_turn(
    game_id: str, turn_index: int, current_user: CurrentUser, db: DBSession,
) -> dict:
    """Catch-up for the async challenge HUD (see games.py `get_turn_hud`)."""
    try:
        game = engine._get_game(db, game_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    turns = game.get("learning_turns") or []
    if not 0 <= turn_index < len(turns):
        raise HTTPException(status_code=404, detail="Learning turn not found")
    return {"turn_index": turn_index, "hud": turns[turn_index]}


@router.post("/{game_id}/vote")
async def vote(game_id: str, payload: VoteRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return await engine.cast_vote(
            db, game_id, current_user.id, payload.target_player_id, payload.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("social-logic vote failed")
        raise HTTPException(status_code=503, detail=f"投票失败：{exc}") from exc


@router.get("/{game_id}/summary")
async def summary(game_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return await engine.summarize_game(db, game_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
