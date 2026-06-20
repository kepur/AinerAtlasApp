"""Freeze / publish helpers for circle discussions."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CircleMessage, CircleRoom, Thought, Topic, utc_now
from app.services.circle_moderator import generate_room_summary
from app.services.freeze_helpers import ensure_expression_versions
from app.services.llm import require_llm_provider
from app.services.runtime_config import resolve_default_llm_provider


def _room_transcript(db: Session, room_id: str) -> str:
    messages = list(
        db.scalars(
            select(CircleMessage)
            .where(CircleMessage.room_id == room_id)
            .order_by(CircleMessage.created_at.asc())
        )
    )
    return "\n".join(f"{m.role}: {m.content}" for m in messages if m.content)


async def ensure_room_summary(db: Session, room: CircleRoom) -> dict[str, Any]:
    if room.summary:
        return room.summary
    messages = list(
        db.scalars(
            select(CircleMessage)
            .where(CircleMessage.room_id == room.id)
            .order_by(CircleMessage.created_at.asc())
        )
    )
    msg_dicts = [{"role": m.role, "content": m.content} for m in messages]
    summary = await generate_room_summary(msg_dicts, room.title, room_type=room.room_type, db=db)
    room.summary = summary
    return summary


async def freeze_circle_room(db: Session, room: CircleRoom, user_id: str) -> Thought:
    summary = await ensure_room_summary(db, room)
    transcript = _room_transcript(db, room.id)
    provider = require_llm_provider(resolve_default_llm_provider(db), db=db)
    result = await provider.generate_expression_asset(transcript, "en", room.title)
    versions = ensure_expression_versions(result, source_text=transcript, title=room.title)
    result.expression_versions = versions

    thoughts = list(
        db.scalars(
            select(Thought).where(Thought.user_id == user_id).order_by(Thought.created_at.desc()).limit(50)
        )
    )
    existing = next(
        (t for t in thoughts if (t.freeze_payload or {}).get("room_id") == room.id),
        None,
    )

    narrative = str(summary.get("summary") or room.title)
    freeze_payload: dict[str, Any] = {
        "source": "circle_discussion",
        "room_id": room.id,
        "topic_id": room.topic_id,
        "summary": summary,
        "keywords": result.keywords or result.vocabulary or summary.get("keywords", []),
        "core_patterns": result.core_patterns or result.patterns or summary.get("patterns", []),
        "expression_versions": versions,
        "golden_quote": versions.get("golden_quote", result.suggested_expression),
        "main_points": summary.get("main_points", []),
        "consensus": summary.get("consensus", []),
        "disagreements": summary.get("disagreements", []),
    }

    if existing:
        existing.title = room.title
        existing.summary = narrative
        existing.final_content_native = transcript
        existing.final_content_target = versions.get("advanced", "") or result.main_reply_target
        existing.freeze_payload = freeze_payload
        existing.status = "frozen"
        existing.frozen_at = utc_now()
        existing.version += 1
        thought = existing
    else:
        thought = Thought(
            user_id=user_id,
            title=room.title,
            summary=narrative,
            final_content_native=transcript,
            final_content_target=versions.get("advanced", "") or result.main_reply_target,
            freeze_payload=freeze_payload,
            status="frozen",
            frozen_at=utc_now(),
        )
        db.add(thought)

    db.flush()
    return thought


async def publish_circle_topic(
    db: Session,
    room: CircleRoom,
    user_id: str,
    *,
    title: str | None = None,
    background: str | None = None,
    thought_id: str | None = None,
) -> Topic:
    summary = await ensure_room_summary(db, room)
    publish_title = (title or room.title).strip() or room.title

    if room.topic_id:
        topic = db.get(Topic, room.topic_id)
        if topic:
            topic.status = "published"
            if background:
                topic.background = background
            if thought_id:
                topic.thought_id = thought_id
            db.flush()
            return topic

    main_points = summary.get("main_points") or []
    pro_views = summary.get("pro_views") or []
    con_views = summary.get("con_views") or []
    bg = background or str(summary.get("summary") or "")
    if main_points and not bg:
        bg = "\n".join(str(p) for p in main_points[:6])

    topic = Topic(
        creator_id=user_id,
        thought_id=thought_id,
        title=publish_title,
        background=bg,
        pro_view=str(pro_views[0]) if pro_views else "",
        con_view=str(con_views[0]) if con_views else "",
        tags=(summary.get("keywords") or [])[:5],
        status="published",
    )
    db.add(topic)
    db.flush()
    room.topic_id = topic.id
    return topic
