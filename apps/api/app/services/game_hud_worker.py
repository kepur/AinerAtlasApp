"""Background learning analysis for game turns — the turn returns immediately.

The dialogue (judge verdict, suspect answer, narrative beat) is what the player
is waiting for; the grammar breakdown is not. Engines therefore persist a turn
with ``hud = {"analysis_status": "pending"}`` and hand the analysis to this
worker, which writes the finished HUD back onto the same ``GameTurn`` row.

Two delivery paths, same writer:
- the SSE turn endpoint awaits :func:`run_turn_hud` after flushing the reply,
  so a connected client gets an ``event: hud`` on the open stream;
- ``BackgroundTasks`` runs it for non-streaming callers, and the client picks
  the result up from ``GET /sessions/{id}/turns/{turn_id}/hud``.
"""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import GameSession, GameTurn
from app.services.learning_hud import STATUS_FAILED, HudRequest, generate_hud

logger = logging.getLogger(__name__)


def hud_request_for_turn(
    session: GameSession, turn: GameTurn
) -> HudRequest | None:
    """Ask the game's engine how to analyse this turn, if at all."""
    from app.services.game_engine import get_engine

    try:
        engine = get_engine(session.game_type)
    except ValueError:
        return None

    builder = getattr(engine, "build_hud_request", None)
    if not builder:
        return None
    try:
        return builder(session, turn.action_type, turn.user_input, turn.ai_response or {})
    except Exception:  # noqa: BLE001
        logger.exception("build_hud_request failed for %s", session.game_type)
        return None


async def _run_analysis(db: Session, session: GameSession, turn: GameTurn) -> dict | None:
    """Produce the HUD payload, preferring an engine's own analyzer.

    An engine may implement ``analyze_turn_hud`` when it has a richer,
    game-specific pipeline (romance reuses the chat_v2 analysis). Otherwise it
    describes the turn via ``build_hud_request`` and the shared coach prompt
    does the work.
    """
    from app.services.game_engine import get_engine

    try:
        engine = get_engine(session.game_type)
    except ValueError:
        return None

    custom = getattr(engine, "analyze_turn_hud", None)
    if custom:
        return await custom(db, session, turn)

    request = hud_request_for_turn(session, turn)
    if not request:
        return None
    return await generate_hud(
        db,
        target_language=session.target_language,
        native_language=session.native_language,
        request=request,
    )


async def analyze_turn(db: Session, session: GameSession, turn: GameTurn) -> dict:
    """Generate and persist the HUD for ``turn``. Returns the stored payload."""
    hud = await _run_analysis(db, session, turn)
    if hud is None:
        # Nothing to teach from this turn (a "start" action, a menu choice).
        turn.hud = {}
        db.commit()
        return {}

    # Engines may attach live game state (relationship score, clue counts) to
    # the pending placeholder; keep it when the analysis lands.
    carried = {
        k: v for k, v in (turn.hud or {}).items()
        if k != "analysis_status" and k not in hud
    }
    turn.hud = {**carried, **hud}
    db.commit()
    db.refresh(turn)
    return turn.hud


async def run_turn_hud(turn_id: str) -> dict:
    """Entry point for BackgroundTasks — opens its own session."""
    with SessionLocal() as db:
        turn = db.get(GameTurn, turn_id)
        if not turn:
            return {}
        session = db.get(GameSession, turn.session_id)
        if not session:
            return {}
        try:
            return await analyze_turn(db, session, turn)
        except Exception:  # noqa: BLE001 — background work must never crash the worker
            logger.exception("background HUD analysis failed for turn %s", turn_id)
            try:
                turn.hud = {"analysis_status": STATUS_FAILED}
                db.commit()
            except Exception:  # noqa: BLE001
                db.rollback()
            return {"analysis_status": STATUS_FAILED}
