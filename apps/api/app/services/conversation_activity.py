"""Persistent audit trail for conversation lifecycle events."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models import ConversationActivityLog


def log_conversation_activity(
    db: Session,
    *,
    user_id: str,
    conversation_id: str,
    action: str,
    message_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> ConversationActivityLog:
    entry = ConversationActivityLog(
        user_id=user_id,
        conversation_id=conversation_id,
        message_id=message_id,
        action=action,
        details=details or {},
    )
    db.add(entry)
    return entry
