"""Conversation soft-delete and moderation helpers."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Conversation, ConversationMessage, ModerationEvent, utc_now
from app.services.moderation import moderate_text, moderate_text_with_llm


def user_visible_conversation(conversation: Conversation | None) -> bool:
    return conversation is not None and conversation.deleted_at is None


def soft_delete_conversation(conversation: Conversation, deleted_by: str = "user") -> None:
    conversation.deleted_at = utc_now()
    conversation.deleted_by = deleted_by


def block_conversation(conversation: Conversation, reason: str = "Blocked by admin") -> None:
    conversation.moderation_status = "blocked"
    conversation.moderation_reason = reason[:512]


def record_moderation_event(
    db: Session,
    *,
    user_id: str | None,
    content_type: str,
    content_id: str,
    result: dict,
) -> None:
    if not result.get("flagged"):
        return
    db.add(
        ModerationEvent(
            user_id=user_id,
            content_type=content_type,
            content_id=content_id,
            action=result.get("action", "flag"),
            reason=str(result.get("reason", ""))[:255],
            details=result.get("details") or {},
        )
    )


def flag_conversation_from_result(
    db: Session,
    conversation: Conversation,
    result: dict,
    *,
    message_id: str,
    user_id: str | None,
) -> None:
    if not result.get("flagged"):
        return
    if conversation.moderation_status != "blocked":
        conversation.moderation_status = "flagged"
    conversation.moderation_reason = str(result.get("reason", ""))[:512]
    record_moderation_event(
        db,
        user_id=user_id,
        content_type="conversation_message",
        content_id=message_id,
        result=result,
    )


async def scan_conversation(
    db: Session,
    conversation_id: str,
    *,
    use_llm: bool = False,
) -> dict:
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        return {"conversation_id": conversation_id, "found": False, "flagged_messages": 0}

    messages = list(
        db.scalars(
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.created_at.asc())
        )
    )
    flagged = 0
    for message in messages:
        if use_llm:
            result = await moderate_text_with_llm(message.content, "conversation_message", db)
        else:
            result = moderate_text(message.content, "conversation_message")
        if result.get("flagged"):
            flagged += 1
            flag_conversation_from_result(
                db,
                conversation,
                result,
                message_id=message.id,
                user_id=message.user_id or conversation.user_id,
            )

    if flagged == 0 and conversation.moderation_status == "flagged":
        conversation.moderation_status = "clean"
        conversation.moderation_reason = ""

    return {
        "conversation_id": conversation_id,
        "found": True,
        "flagged_messages": flagged,
        "moderation_status": conversation.moderation_status,
        "moderation_reason": conversation.moderation_reason,
    }


async def batch_scan_conversations(
    db: Session,
    conversation_ids: list[str],
    *,
    use_llm: bool = False,
) -> dict:
    scanned = 0
    flagged_conversations = 0
    flagged_messages = 0
    for cid in conversation_ids:
        result = await scan_conversation(db, cid, use_llm=use_llm)
        if not result.get("found"):
            continue
        scanned += 1
        if result.get("flagged_messages", 0) > 0:
            flagged_conversations += 1
            flagged_messages += int(result["flagged_messages"])
    return {
        "scanned": scanned,
        "flagged_conversations": flagged_conversations,
        "flagged_messages": flagged_messages,
    }
