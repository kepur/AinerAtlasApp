"""Background learning analysis for circle messages — POST returns immediately."""

from __future__ import annotations

from loguru import logger

from app.db.session import SessionLocal
from app.models import CircleMessage, CircleRoom
from app.schemas import CircleMessageRead
from app.services.circle_hub import circle_hub
from app.services.circle_moderator import moderate_message
from app.services.llm import LLMUnavailableError


def _ai_host_enabled(room: CircleRoom) -> bool:
    if room.room_type != "dm":
        return True
    return bool((room.summary or {}).get("ai_host"))


async def analyze_circle_message_background(message_id: str, room_id: str) -> None:
    with SessionLocal() as db:
        message = db.get(CircleMessage, message_id)
        room = db.get(CircleRoom, room_id)
        if not message or not room:
            return

        try:
            effective_type = (
                "language_circle"
                if room.room_type == "dm" and _ai_host_enabled(room)
                else room.room_type
            )
            analysis = await moderate_message(
                message.content,
                message.content_language,
                room.title,
                room_type=effective_type,
                user_id=message.user_id,
                db=db,
            )
        except LLMUnavailableError as exc:
            logger.warning("Circle message analysis failed: {}", exc.message)
            message.analysis = {"analysis_status": "failed", "error": exc.message}
            db.commit()
            db.refresh(message)
            await _broadcast_updated(room_id, message)
            return
        except Exception:
            logger.exception("Circle message analysis failed")
            message.analysis = {"analysis_status": "failed", "error": "分析失败，请稍后重试"}
            db.commit()
            db.refresh(message)
            await _broadcast_updated(room_id, message)
            return

        message.translated_content = analysis.get("translated_content", "")
        message.analysis = {k: v for k, v in analysis.items() if k != "analysis_status"}

        host_msg: CircleMessage | None = None
        if _ai_host_enabled(room) and analysis.get("counter_question"):
            host_msg = CircleMessage(
                room_id=room_id,
                user_id=None,
                role="assistant",
                content=analysis["counter_question"],
                content_language="zh",
                translated_content=analysis.get("host_note", ""),
                analysis={"type": "host", "on_topic": analysis.get("on_topic", True)},
            )
            db.add(host_msg)

        db.commit()
        db.refresh(message)
        if host_msg:
            db.refresh(host_msg)

        await _broadcast_updated(room_id, message)
        if host_msg:
            await circle_hub.broadcast(
                room_id,
                {
                    "type": "message",
                    "message": CircleMessageRead.model_validate(host_msg).model_dump(mode="json"),
                },
            )


async def _broadcast_updated(room_id: str, message: CircleMessage) -> None:
    await circle_hub.broadcast(
        room_id,
        {
            "type": "message_updated",
            "message": CircleMessageRead.model_validate(message).model_dump(mode="json"),
        },
    )
