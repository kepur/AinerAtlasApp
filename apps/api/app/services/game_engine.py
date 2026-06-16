"""Unified game engine dispatcher.

Routes actions to the correct game-type engine and handles DB persistence
for GameSession / GameTurn.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import GameSession, GameTemplate, GameTurn, new_id

logger = logging.getLogger(__name__)

_ENGINES: dict[str, "GameTypeEngine"] = {}

_engines_loaded = False


def _ensure_engines_loaded() -> None:
    global _engines_loaded
    if _engines_loaded:
        return
    _engines_loaded = True
    import app.services.turtle_soup_engine  # noqa: F401
    import app.services.roleplay_engine  # noqa: F401
    import app.services.detective_engine  # noqa: F401


class GameTypeEngine:
    """Base interface that each game type implements."""

    game_type: str = ""

    async def init_session(self, session: GameSession, config: dict) -> dict:
        raise NotImplementedError

    async def handle_turn(
        self, db: Session, session: GameSession, action_type: str,
        user_input: str, extra: dict,
    ) -> dict:
        raise NotImplementedError

    async def get_summary(self, db: Session, session: GameSession) -> dict:
        raise NotImplementedError

    def get_state_view(self, session: GameSession, user_id: str) -> dict:
        raise NotImplementedError


def register_engine(engine: GameTypeEngine) -> None:
    _ENGINES[engine.game_type] = engine


def get_engine(game_type: str) -> GameTypeEngine:
    _ensure_engines_loaded()
    eng = _ENGINES.get(game_type)
    if not eng:
        raise ValueError(f"Unknown game type: {game_type}")
    return eng


# ---------------------------------------------------------------------------
# Template operations
# ---------------------------------------------------------------------------

def list_templates(db: Session, game_type: str | None = None) -> list[dict]:
    q = select(GameTemplate).where(GameTemplate.enabled.is_(True))
    if game_type:
        q = q.where(GameTemplate.game_type == game_type)
    q = q.order_by(GameTemplate.sort_order, GameTemplate.created_at.desc())
    rows = db.execute(q).scalars().all()
    return [_template_dict(t) for t in rows]


def get_template(db: Session, template_id: str) -> dict:
    t = db.get(GameTemplate, template_id)
    if not t:
        q = select(GameTemplate).where(GameTemplate.slug == template_id)
        t = db.execute(q).scalars().first()
    if not t:
        raise ValueError("Template not found")
    return _template_dict(t)


def _template_dict(t: GameTemplate) -> dict:
    return {
        "id": t.id,
        "slug": t.slug,
        "game_type": t.game_type,
        "title": t.title,
        "subtitle": t.subtitle,
        "description": t.description,
        "cover_url": t.cover_url,
        "difficulty": t.difficulty,
        "target_language": t.target_language,
        "native_language": t.native_language,
        "estimated_minutes": t.estimated_minutes,
        "learning_focus": t.learning_focus,
        "tags": t.tags,
        "config": t.config,
        "play_count": t.play_count,
    }


# ---------------------------------------------------------------------------
# Session lifecycle
# ---------------------------------------------------------------------------

async def create_session(
    db: Session, user_id: str, game_type: str,
    template_id: str | None = None, config: dict | None = None,
) -> dict:
    cfg = config or {}

    template = None
    if template_id:
        template = db.get(GameTemplate, template_id)
        if not template:
            q = select(GameTemplate).where(GameTemplate.slug == template_id)
            template = db.execute(q).scalars().first()
        if template:
            cfg = {**template.config, **cfg}

    engine = get_engine(game_type)

    sess = GameSession(
        id=new_id(),
        user_id=user_id,
        template_id=template.id if template else None,
        game_type=game_type,
        title=cfg.get("title", template.title if template else game_type),
        target_language=cfg.get("target_language", template.target_language if template else "en"),
        native_language=cfg.get("native_language", template.native_language if template else "zh"),
        difficulty=cfg.get("difficulty", template.difficulty if template else "B1"),
        phase="lobby",
        state={},
    )

    init_state = await engine.init_session(sess, cfg)
    sess.state = init_state
    sess.started_at = datetime.now(UTC)

    db.add(sess)
    db.commit()
    db.refresh(sess)

    if template:
        template.play_count += 1
        db.commit()

    return _session_dict(sess, user_id)


def list_sessions(db: Session, user_id: str, status: str | None = None) -> list[dict]:
    q = select(GameSession).where(GameSession.user_id == user_id)
    if status:
        q = q.where(GameSession.status == status)
    q = q.order_by(GameSession.updated_at.desc()).limit(20)
    rows = db.execute(q).scalars().all()
    return [_session_dict(s, user_id, include_turns=False) for s in rows]


def get_session(db: Session, session_id: str, user_id: str) -> dict:
    sess = _load_session(db, session_id, user_id)
    return _session_dict(sess, user_id, include_turns=True)


async def handle_turn(
    db: Session, session_id: str, user_id: str,
    action_type: str, user_input: str, extra: dict | None = None,
) -> dict:
    sess = _load_session(db, session_id, user_id)
    if sess.status != "active":
        raise ValueError("Game is not active")

    engine = get_engine(sess.game_type)
    result = await engine.handle_turn(db, sess, action_type, user_input, extra or {})

    sess.turn_count += 1
    turn = GameTurn(
        id=new_id(),
        session_id=sess.id,
        turn_number=sess.turn_count,
        actor="user",
        action_type=action_type,
        user_input=user_input,
        ai_response=result.get("ai_response", {}),
        hud=result.get("hud", {}),
        feed_items=result.get("feed_items", []),
        phase_after=sess.phase,
    )
    db.add(turn)

    sess.state = result.get("state", sess.state)
    if result.get("ended"):
        sess.status = "ended"
        sess.ended_at = datetime.now(UTC)
        sess.score = result.get("score", sess.score)

    db.commit()
    db.refresh(turn)

    return {
        "turn": _turn_dict(turn),
        "session": _session_dict(sess, user_id, include_turns=False),
    }


async def get_summary(db: Session, session_id: str, user_id: str) -> dict:
    sess = _load_session(db, session_id, user_id)
    engine = get_engine(sess.game_type)
    return await engine.get_summary(db, sess)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_session(db: Session, session_id: str, user_id: str) -> GameSession:
    sess = db.get(GameSession, session_id)
    if not sess or sess.user_id != user_id:
        raise ValueError("Session not found")
    return sess


def _session_dict(sess: GameSession, user_id: str, include_turns: bool = False) -> dict:
    d = {
        "id": sess.id,
        "game_type": sess.game_type,
        "template_id": sess.template_id,
        "title": sess.title,
        "target_language": sess.target_language,
        "native_language": sess.native_language,
        "difficulty": sess.difficulty,
        "phase": sess.phase,
        "turn_count": sess.turn_count,
        "score": sess.score,
        "status": sess.status,
        "created_at": sess.created_at.isoformat() if sess.created_at else None,
        "updated_at": sess.updated_at.isoformat() if sess.updated_at else None,
    }

    try:
        engine = get_engine(sess.game_type)
        d["view"] = engine.get_state_view(sess, user_id)
    except (ValueError, NotImplementedError):
        d["view"] = {}

    if include_turns:
        d["turns"] = [_turn_dict(t) for t in sess.turns]

    return d


def _turn_dict(t: GameTurn) -> dict:
    return {
        "id": t.id,
        "turn_number": t.turn_number,
        "actor": t.actor,
        "action_type": t.action_type,
        "user_input": t.user_input,
        "ai_response": t.ai_response,
        "hud": t.hud,
        "feed_items": t.feed_items,
        "phase_after": t.phase_after,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }
