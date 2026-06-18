"""Admin data management — CRUD and batch purge for user-facing content."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select, update

from app.api.deps import AdminUser, DBSession
from app.models import (
    Conversation,
    ConversationActivityLog,
    ConversationMessage,
    ExpressionAsset,
    GameSession,
    GameTemplate,
    ModerationEvent,
    Report,
    Thought,
    Topic,
    UsageLog,
    User,
)
from app.services.audit import write_audit_log
from app.services.conversation_moderation import (
    batch_scan_conversations,
    block_conversation,
    scan_conversation,
    soft_delete_conversation,
)
from app.services.conversation_activity import log_conversation_activity
from app.services.user_data_purge import (
    delete_conversations_by_ids,
    delete_expression_assets_by_ids,
    delete_game_sessions_by_ids,
    delete_thoughts_by_ids,
)

router = APIRouter(prefix="/admin/data", tags=["admin-data"])

CONFIRM_ALL = "DELETE_ALL"
DEFAULT_LIMIT = 50
MAX_LIMIT = 200


class BatchDeleteRequest(BaseModel):
    ids: list[str] = Field(default_factory=list, min_length=1)


class ConversationScanRequest(BaseModel):
    ids: list[str] = Field(default_factory=list)
    use_llm: bool = False
    limit: int = Field(default=100, ge=1, le=500)


class ConversationBlockRequest(BaseModel):
    ids: list[str] = Field(default_factory=list, min_length=1)
    reason: str = "Blocked by admin for policy violation"


class PurgeAllRequest(BaseModel):
    confirm: str


def _paginate(limit: int, offset: int) -> tuple[int, int]:
    return min(max(limit, 1), MAX_LIMIT), max(offset, 0)


def _audit(db, admin: AdminUser, action: str, resource_type: str, resource_id: str = "", details: dict | None = None) -> None:
    write_audit_log(db, admin, action=action, resource_type=resource_type, resource_id=resource_id, details=details)


def _user_brief(db, user_id: str | None) -> dict | None:
    if not user_id:
        return None
    user = db.get(User, user_id)
    if not user:
        return {"id": user_id, "email": "?", "username": "?"}
    return {"id": user.id, "email": user.email, "username": user.username}


def _user_topics_brief(db: DBSession, user_id: str, limit: int = 5) -> list[dict]:
    topics = list(
        db.scalars(
            select(Topic)
            .where(Topic.creator_id == user_id)
            .order_by(Topic.created_at.desc())
            .limit(limit)
        )
    )
    return [{"id": t.id, "title": t.title, "status": t.status} for t in topics]


def _user_ids_by_username(db: DBSession, username: str) -> list[str]:
    pattern = f"%{username.strip()}%"
    return list(
        db.scalars(
            select(User.id).where(
                or_(User.username.ilike(pattern), User.email.ilike(pattern))
            )
        )
    )


def _user_ids_by_topic_title(db: DBSession, topic_q: str) -> list[str]:
    pattern = f"%{topic_q.strip()}%"
    return list(
        db.scalars(
            select(Topic.creator_id)
            .where(Topic.title.ilike(pattern))
            .distinct()
        )
    )


@router.get("/stats")
def data_stats(_: AdminUser, db: DBSession) -> dict:
    return {
        "conversations": db.scalar(select(func.count(Conversation.id))) or 0,
        "messages": db.scalar(select(func.count(ConversationMessage.id))) or 0,
        "thoughts": db.scalar(select(func.count(Thought.id))) or 0,
        "game_sessions": db.scalar(select(func.count(GameSession.id))) or 0,
        "game_templates": db.scalar(select(func.count(GameTemplate.id))) or 0,
        "expression_assets": db.scalar(select(func.count(ExpressionAsset.id))) or 0,
        "reports": db.scalar(select(func.count(Report.id))) or 0,
        "usage_logs": db.scalar(select(func.count(UsageLog.id))) or 0,
        "moderation_events": db.scalar(select(func.count(ModerationEvent.id))) or 0,
    }


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

def _conversation_preview(db: DBSession, conversation_id: str) -> str:
    last = db.scalar(
        select(ConversationMessage.content)
        .where(ConversationMessage.conversation_id == conversation_id)
        .order_by(ConversationMessage.created_at.desc())
        .limit(1)
    )
    if not last:
        return ""
    return last[:120]


def _serialize_conversation_item(db: DBSession, conversation: Conversation, msg_counts: dict[str, int]) -> dict:
    return {
        "id": conversation.id,
        "user_id": conversation.user_id,
        "user": _user_brief(db, conversation.user_id),
        "title": conversation.title,
        "mode": conversation.mode,
        "status": conversation.status,
        "message_count": msg_counts.get(conversation.id, 0),
        "last_message_preview": _conversation_preview(db, conversation.id),
        "moderation_status": conversation.moderation_status,
        "moderation_reason": conversation.moderation_reason,
        "deleted_at": conversation.deleted_at.isoformat() if conversation.deleted_at else None,
        "deleted_by": conversation.deleted_by or None,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat(),
    }


@router.get("/conversations")
def list_conversations(
    _: AdminUser,
    db: DBSession,
    user_id: str | None = None,
    q: str | None = None,
    moderation_status: str | None = None,
    include_deleted: bool = False,
    sensitive_only: bool = False,
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
) -> dict:
    lim, off = _paginate(limit, offset)
    stmt = select(Conversation)
    if user_id:
        stmt = stmt.where(Conversation.user_id == user_id)
    if not include_deleted:
        stmt = stmt.where(Conversation.deleted_at.is_(None))
    if moderation_status:
        stmt = stmt.where(Conversation.moderation_status == moderation_status.strip())
    if sensitive_only:
        stmt = stmt.where(Conversation.moderation_status.in_(["flagged", "blocked"]))
    if q:
        needle = q.strip()
        if needle:
            qpat = f"%{needle}%"
            msg_match = (
                select(ConversationMessage.conversation_id)
                .where(ConversationMessage.content.ilike(qpat))
                .distinct()
            )
            stmt = stmt.where(or_(Conversation.title.ilike(qpat), Conversation.id.in_(msg_match)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(Conversation.updated_at.desc()).offset(off).limit(lim)))
    msg_counts: dict[str, int] = {}
    if rows:
        ids = [r.id for r in rows]
        for cid, cnt in db.execute(
            select(ConversationMessage.conversation_id, func.count(ConversationMessage.id))
            .where(ConversationMessage.conversation_id.in_(ids))
            .group_by(ConversationMessage.conversation_id)
        ):
            msg_counts[cid] = cnt
    return {
        "items": [_serialize_conversation_item(db, c, msg_counts) for c in rows],
        "total": total,
        "limit": lim,
        "offset": off,
    }


@router.get("/conversations/{conversation_id}")
def get_conversation_detail(conversation_id: str, _: AdminUser, db: DBSession) -> dict:
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = list(
        db.scalars(
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.created_at.asc())
        )
    )
    msg_counts = {conversation.id: len(messages)}
    item = _serialize_conversation_item(db, conversation, msg_counts)
    item["messages"] = [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "content_language": m.content_language,
            "translated_content": m.translated_content,
            "user_id": m.user_id,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]
    activities = list(
        db.scalars(
            select(ConversationActivityLog)
            .where(ConversationActivityLog.conversation_id == conversation_id)
            .order_by(ConversationActivityLog.created_at.desc())
            .limit(100)
        )
    )
    item["activity"] = [
        {
            "id": a.id,
            "user_id": a.user_id,
            "message_id": a.message_id,
            "action": a.action,
            "details": a.details,
            "created_at": a.created_at.isoformat(),
        }
        for a in activities
    ]
    return item


@router.get("/conversation-activity")
def list_conversation_activity(
    _: AdminUser,
    db: DBSession,
    conversation_id: str | None = None,
    user_id: str | None = None,
    action: str | None = None,
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
) -> dict:
    lim, off = _paginate(limit, offset)
    stmt = select(ConversationActivityLog)
    if conversation_id:
        stmt = stmt.where(ConversationActivityLog.conversation_id == conversation_id)
    if user_id:
        stmt = stmt.where(ConversationActivityLog.user_id == user_id)
    if action:
        stmt = stmt.where(ConversationActivityLog.action == action.strip())
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(ConversationActivityLog.created_at.desc()).offset(off).limit(lim)))
    return {
        "items": [
            {
                "id": row.id,
                "user_id": row.user_id,
                "conversation_id": row.conversation_id,
                "message_id": row.message_id,
                "action": row.action,
                "details": row.details,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ],
        "total": total,
        "limit": lim,
        "offset": off,
    }


@router.post("/conversations/batch-scan")
async def batch_scan_conversations_admin(payload: ConversationScanRequest, admin: AdminUser, db: DBSession) -> dict:
    ids = payload.ids
    if not ids:
        ids = list(
            db.scalars(
                select(Conversation.id)
                .order_by(Conversation.updated_at.desc())
                .limit(payload.limit)
            )
        )
    result = await batch_scan_conversations(db, ids, use_llm=payload.use_llm)
    for cid in ids:
        if db.get(Conversation, cid):
            log_conversation_activity(
                db,
                user_id=admin.id,
                conversation_id=cid,
                action="admin_scanned",
                details={"use_llm": payload.use_llm, "batch": True},
            )
    _audit(
        db,
        admin,
        "batch_scan_conversations",
        "conversation",
        ",".join(ids[:5]),
        {**result, "use_llm": payload.use_llm},
    )
    db.commit()
    return result


@router.post("/conversations/{conversation_id}/scan")
async def scan_conversation_admin(
    conversation_id: str,
    admin: AdminUser,
    db: DBSession,
    use_llm: bool = False,
) -> dict:
    result = await scan_conversation(db, conversation_id, use_llm=use_llm)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail="Conversation not found")
    _audit(db, admin, "scan_conversation", "conversation", conversation_id, result)
    db.commit()
    return result


@router.post("/conversations/batch-block")
def batch_block_conversations(payload: ConversationBlockRequest, admin: AdminUser, db: DBSession) -> dict:
    blocked = 0
    for cid in payload.ids:
        conversation = db.get(Conversation, cid)
        if not conversation:
            continue
        block_conversation(conversation, payload.reason)
        log_conversation_activity(
            db,
            user_id=admin.id,
            conversation_id=cid,
            action="admin_blocked",
            details={"reason": payload.reason},
        )
        db.add(
            ModerationEvent(
                user_id=conversation.user_id,
                content_type="conversation",
                content_id=cid,
                action="block",
                reason=payload.reason[:255],
                details={"source": "admin_batch_block"},
            )
        )
        blocked += 1
    _audit(
        db,
        admin,
        "batch_block_conversations",
        "conversation",
        ",".join(payload.ids[:5]),
        {"blocked": blocked, "reason": payload.reason},
    )
    db.commit()
    return {"blocked": blocked}


@router.post("/conversations/{conversation_id}/soft-delete")
def soft_delete_conversation_admin(conversation_id: str, admin: AdminUser, db: DBSession) -> dict:
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    soft_delete_conversation(conversation, deleted_by="admin")
    log_conversation_activity(
        db,
        user_id=admin.id,
        conversation_id=conversation_id,
        action="admin_soft_deleted",
        details={"owner_user_id": conversation.user_id, "title": conversation.title},
    )
    _audit(db, admin, "soft_delete_conversation", "conversation", conversation_id)
    db.commit()
    return {"deleted": True, "id": conversation_id, "soft": True}


@router.post("/conversations/batch-soft-delete")
def batch_soft_delete_conversations(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    count = 0
    for cid in payload.ids:
        conversation = db.get(Conversation, cid)
        if not conversation:
            continue
        soft_delete_conversation(conversation, deleted_by="admin")
        log_conversation_activity(
            db,
            user_id=admin.id,
            conversation_id=cid,
            action="admin_soft_deleted",
            details={"owner_user_id": conversation.user_id, "title": conversation.title},
        )
        count += 1
    _audit(db, admin, "batch_soft_delete_conversations", "conversation", ",".join(payload.ids[:5]), {"count": count})
    db.commit()
    return {"deleted": count, "soft": True}


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, admin: AdminUser, db: DBSession) -> dict:
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    owner_id = conversation.user_id
    log_conversation_activity(
        db,
        user_id=admin.id,
        conversation_id=conversation_id,
        action="admin_hard_deleted",
        details={"owner_user_id": owner_id, "title": conversation.title},
    )
    delete_conversations_by_ids(db, [conversation_id])
    _audit(db, admin, "delete_conversation", "conversation", conversation_id)
    db.commit()
    return {"deleted": True, "id": conversation_id}


@router.post("/conversations/batch-delete")
def batch_delete_conversations(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    count = delete_conversations_by_ids(db, payload.ids)
    _audit(db, admin, "batch_delete_conversations", "conversation", ",".join(payload.ids[:5]), {"count": count})
    db.commit()
    return {"deleted": count}


@router.delete("/conversations/user/{user_id}")
def purge_conversations_by_user(user_id: str, admin: AdminUser, db: DBSession) -> dict:
    ids = list(db.scalars(select(Conversation.id).where(Conversation.user_id == user_id)))
    count = delete_conversations_by_ids(db, ids)
    _audit(db, admin, "purge_conversations_by_user", "user", user_id, {"count": count})
    db.commit()
    return {"deleted": count, "user_id": user_id}


@router.post("/conversations/purge-all")
def purge_all_conversations(payload: PurgeAllRequest, admin: AdminUser, db: DBSession) -> dict:
    if payload.confirm != CONFIRM_ALL:
        raise HTTPException(status_code=400, detail=f"confirm must be {CONFIRM_ALL}")
    conv_ids = list(db.scalars(select(Conversation.id)))
    count = delete_conversations_by_ids(db, conv_ids)
    _audit(db, admin, "purge_all_conversations", "conversation", "*", {"count": count})
    db.commit()
    return {"deleted": count}


# ---------------------------------------------------------------------------
# Thoughts
# ---------------------------------------------------------------------------

@router.get("/thoughts")
def list_thoughts(
    _: AdminUser, db: DBSession,
    user_id: str | None = None, q: str | None = None,
    limit: int = DEFAULT_LIMIT, offset: int = 0,
) -> dict:
    lim, off = _paginate(limit, offset)
    stmt = select(Thought)
    if user_id:
        stmt = stmt.where(Thought.user_id == user_id)
    if q:
        stmt = stmt.where(Thought.title.ilike(f"%{q.strip()}%"))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(Thought.updated_at.desc()).offset(off).limit(lim)))
    return {
        "items": [{
            "id": t.id, "user_id": t.user_id, "user": _user_brief(db, t.user_id),
            "title": t.title, "status": t.status, "conversation_id": t.conversation_id,
            "created_at": t.created_at.isoformat(), "updated_at": t.updated_at.isoformat(),
        } for t in rows],
        "total": total, "limit": lim, "offset": off,
    }




@router.delete("/thoughts/{thought_id}")
def delete_thought(thought_id: str, admin: AdminUser, db: DBSession) -> dict:
    if not db.get(Thought, thought_id):
        raise HTTPException(status_code=404, detail="Thought not found")
    count = delete_thoughts_by_ids(db, [thought_id])
    _audit(db, admin, "delete_thought", "thought", thought_id)
    db.commit()
    return {"deleted": count}


@router.post("/thoughts/batch-delete")
def batch_delete_thoughts(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    count = delete_thoughts_by_ids(db, payload.ids)
    _audit(db, admin, "batch_delete_thoughts", "thought", ",".join(payload.ids[:5]), {"count": count})
    db.commit()
    return {"deleted": count}


@router.delete("/thoughts/user/{user_id}")
def purge_thoughts_by_user(user_id: str, admin: AdminUser, db: DBSession) -> dict:
    ids = list(db.scalars(select(Thought.id).where(Thought.user_id == user_id)))
    count = delete_thoughts_by_ids(db, ids)
    _audit(db, admin, "purge_thoughts_by_user", "user", user_id, {"count": count})
    db.commit()
    return {"deleted": count, "user_id": user_id}


@router.post("/thoughts/purge-all")
def purge_all_thoughts(payload: PurgeAllRequest, admin: AdminUser, db: DBSession) -> dict:
    if payload.confirm != CONFIRM_ALL:
        raise HTTPException(status_code=400, detail=f"confirm must be {CONFIRM_ALL}")
    ids = list(db.scalars(select(Thought.id)))
    count = delete_thoughts_by_ids(db, ids)
    _audit(db, admin, "purge_all_thoughts", "thought", "*", {"count": count})
    db.commit()
    return {"deleted": count}


# ---------------------------------------------------------------------------
# Game sessions
# ---------------------------------------------------------------------------

@router.get("/game-sessions")
def list_game_sessions(
    _: AdminUser, db: DBSession,
    user_id: str | None = None, game_type: str | None = None,
    limit: int = DEFAULT_LIMIT, offset: int = 0,
) -> dict:
    lim, off = _paginate(limit, offset)
    stmt = select(GameSession)
    if user_id:
        stmt = stmt.where(GameSession.user_id == user_id)
    if game_type:
        stmt = stmt.where(GameSession.game_type == game_type)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(GameSession.updated_at.desc()).offset(off).limit(lim)))
    return {
        "items": [{
            "id": s.id, "user_id": s.user_id, "user": _user_brief(db, s.user_id),
            "game_type": s.game_type, "title": s.title, "status": s.status,
            "phase": s.phase, "turn_count": s.turn_count, "score": s.score,
            "created_at": s.created_at.isoformat(), "updated_at": s.updated_at.isoformat(),
        } for s in rows],
        "total": total, "limit": lim, "offset": off,
    }


@router.delete("/game-sessions/{session_id}")
def delete_game_session(session_id: str, admin: AdminUser, db: DBSession) -> dict:
    if not db.get(GameSession, session_id):
        raise HTTPException(status_code=404, detail="Game session not found")
    delete_game_sessions_by_ids(db, [session_id])
    _audit(db, admin, "delete_game_session", "game_session", session_id)
    db.commit()
    return {"deleted": True}


@router.post("/game-sessions/batch-delete")
def batch_delete_game_sessions(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    count = delete_game_sessions_by_ids(db, payload.ids)
    _audit(db, admin, "batch_delete_game_sessions", "game_session", ",".join(payload.ids[:5]), {"count": count})
    db.commit()
    return {"deleted": count}


@router.delete("/game-sessions/user/{user_id}")
def purge_game_sessions_by_user(user_id: str, admin: AdminUser, db: DBSession) -> dict:
    ids = list(db.scalars(select(GameSession.id).where(GameSession.user_id == user_id)))
    count = delete_game_sessions_by_ids(db, ids)
    _audit(db, admin, "purge_game_sessions_by_user", "user", user_id, {"count": count})
    db.commit()
    return {"deleted": count, "user_id": user_id}


@router.post("/game-sessions/purge-all")
def purge_all_game_sessions(payload: PurgeAllRequest, admin: AdminUser, db: DBSession) -> dict:
    if payload.confirm != CONFIRM_ALL:
        raise HTTPException(status_code=400, detail=f"confirm must be {CONFIRM_ALL}")
    sess_ids = list(db.scalars(select(GameSession.id)))
    count = delete_game_sessions_by_ids(db, sess_ids)
    _audit(db, admin, "purge_all_game_sessions", "game_session", "*", {"count": count})
    db.commit()
    return {"deleted": count}


# ---------------------------------------------------------------------------
# Expression assets
# ---------------------------------------------------------------------------

@router.get("/expression-assets")
def list_expression_assets(
    _: AdminUser,
    db: DBSession,
    user_id: str | None = None,
    username: str | None = None,
    q: str | None = None,
    topic_q: str | None = None,
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
) -> dict:
    lim, off = _paginate(limit, offset)
    stmt = select(ExpressionAsset)
    if user_id:
        stmt = stmt.where(ExpressionAsset.user_id == user_id)
    if username and username.strip():
        user_ids = _user_ids_by_username(db, username)
        if not user_ids:
            return {"items": [], "total": 0, "limit": lim, "offset": off}
        stmt = stmt.where(ExpressionAsset.user_id.in_(user_ids))
    if topic_q and topic_q.strip():
        creator_ids = _user_ids_by_topic_title(db, topic_q)
        if not creator_ids:
            return {"items": [], "total": 0, "limit": lim, "offset": off}
        stmt = stmt.where(ExpressionAsset.user_id.in_(creator_ids))
    if q:
        stmt = stmt.where(
            or_(
                ExpressionAsset.title.ilike(f"%{q.strip()}%"),
                ExpressionAsset.source_text.ilike(f"%{q.strip()}%"),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(ExpressionAsset.updated_at.desc()).offset(off).limit(lim)))

    user_topics_cache: dict[str, list[dict]] = {}
    items = []
    for a in rows:
        if a.user_id not in user_topics_cache:
            user_topics_cache[a.user_id] = _user_topics_brief(db, a.user_id)
        items.append(
            {
                "id": a.id,
                "user_id": a.user_id,
                "user": _user_brief(db, a.user_id),
                "title": a.title,
                "target_language": a.target_language,
                "keywords": a.keywords or [],
                "current_version": a.current_version,
                "user_topics": user_topics_cache[a.user_id],
                "created_at": a.created_at.isoformat(),
                "updated_at": a.updated_at.isoformat(),
            }
        )
    return {
        "items": items,
        "total": total,
        "limit": lim,
        "offset": off,
    }



@router.delete("/expression-assets/{asset_id}")
def delete_expression_asset(asset_id: str, admin: AdminUser, db: DBSession) -> dict:
    if not db.get(ExpressionAsset, asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")
    count = delete_expression_assets_by_ids(db, [asset_id])
    _audit(db, admin, "delete_expression_asset", "expression_asset", asset_id)
    db.commit()
    return {"deleted": count}


@router.post("/expression-assets/batch-delete")
def batch_delete_expression_assets(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    count = delete_expression_assets_by_ids(db, payload.ids)
    _audit(db, admin, "batch_delete_expression_assets", "expression_asset", ",".join(payload.ids[:5]), {"count": count})
    db.commit()
    return {"deleted": count}


@router.delete("/expression-assets/user/{user_id}")
def purge_expression_assets_by_user(user_id: str, admin: AdminUser, db: DBSession) -> dict:
    ids = list(db.scalars(select(ExpressionAsset.id).where(ExpressionAsset.user_id == user_id)))
    count = delete_expression_assets_by_ids(db, ids)
    _audit(db, admin, "purge_expression_assets_by_user", "user", user_id, {"count": count})
    db.commit()
    return {"deleted": count, "user_id": user_id}


# ---------------------------------------------------------------------------
# Game templates
# ---------------------------------------------------------------------------

@router.get("/game-templates")
def list_game_templates_admin(
    _: AdminUser, db: DBSession,
    game_type: str | None = None, limit: int = DEFAULT_LIMIT, offset: int = 0,
) -> dict:
    lim, off = _paginate(limit, offset)
    stmt = select(GameTemplate)
    if game_type:
        stmt = stmt.where(GameTemplate.game_type == game_type)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(GameTemplate.sort_order, GameTemplate.created_at.desc()).offset(off).limit(lim)))
    return {
        "items": [{
            "id": t.id, "slug": t.slug, "game_type": t.game_type, "title": t.title,
            "enabled": t.enabled, "play_count": t.play_count,
            "created_at": t.created_at.isoformat(),
        } for t in rows],
        "total": total, "limit": lim, "offset": off,
    }


@router.delete("/game-templates/{template_id}")
def delete_game_template_admin(template_id: str, admin: AdminUser, db: DBSession) -> dict:
    if not db.get(GameTemplate, template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    db.execute(update(GameSession).where(GameSession.template_id == template_id).values(template_id=None))
    db.execute(delete(GameTemplate).where(GameTemplate.id == template_id))
    _audit(db, admin, "delete_game_template", "game_template", template_id)
    db.commit()
    return {"deleted": True}


@router.post("/game-templates/batch-delete")
def batch_delete_game_templates(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    for tid in payload.ids:
        db.execute(update(GameSession).where(GameSession.template_id == tid).values(template_id=None))
    result = db.execute(delete(GameTemplate).where(GameTemplate.id.in_(payload.ids)))
    _audit(db, admin, "batch_delete_game_templates", "game_template", ",".join(payload.ids[:5]), {"count": result.rowcount})
    db.commit()
    return {"deleted": result.rowcount}


# ---------------------------------------------------------------------------
# Game learning packs (curated patterns / vocabulary)
# ---------------------------------------------------------------------------

class LearningPackRequest(BaseModel):
    game_type: str
    pack_type: str = "pattern"
    label: str = ""
    content: str
    example: str = ""
    difficulty: str = "B1"
    enabled: bool = True
    sort_order: int = 100


class LearningPackUpdateRequest(BaseModel):
    label: str | None = None
    content: str | None = None
    example: str | None = None
    difficulty: str | None = None
    enabled: bool | None = None
    sort_order: int | None = None
    pack_type: str | None = None


@router.get("/game-learning-packs")
def list_learning_packs_admin(
    _: AdminUser, db: DBSession,
    game_type: str | None = None, limit: int = DEFAULT_LIMIT, offset: int = 0,
) -> dict:
    from app.models import GameLearningPack
    lim, off = _paginate(limit, offset)
    stmt = select(GameLearningPack)
    if game_type:
        stmt = stmt.where(GameLearningPack.game_type == game_type)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(GameLearningPack.sort_order).offset(off).limit(lim)))
    return {
        "items": [{
            "id": r.id, "game_type": r.game_type, "pack_type": r.pack_type,
            "label": r.label, "content": r.content, "example": r.example,
            "difficulty": r.difficulty, "enabled": r.enabled, "sort_order": r.sort_order,
        } for r in rows],
        "total": total, "limit": lim, "offset": off,
    }


@router.post("/game-learning-packs")
def create_learning_pack_admin(payload: LearningPackRequest, admin: AdminUser, db: DBSession) -> dict:
    from app.services import game_learning_pack_service as packs
    row = packs.create_pack(db, payload.model_dump())
    _audit(db, admin, "create_learning_pack", "game_learning_pack", row["id"])
    return row


@router.patch("/game-learning-packs/{pack_id}")
def update_learning_pack_admin(
    pack_id: str, payload: LearningPackUpdateRequest, admin: AdminUser, db: DBSession,
) -> dict:
    from app.services import game_learning_pack_service as packs
    try:
        row = packs.update_pack(db, pack_id, payload.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    _audit(db, admin, "update_learning_pack", "game_learning_pack", pack_id)
    return row


@router.delete("/game-learning-packs/{pack_id}")
def delete_learning_pack_admin(pack_id: str, admin: AdminUser, db: DBSession) -> dict:
    from app.services import game_learning_pack_service as packs
    try:
        packs.delete_pack(db, pack_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    _audit(db, admin, "delete_learning_pack", "game_learning_pack", pack_id)
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

@router.get("/reports")
def list_reports_admin(
    _: AdminUser, db: DBSession,
    status: str | None = None, limit: int = DEFAULT_LIMIT, offset: int = 0,
) -> dict:
    lim, off = _paginate(limit, offset)
    stmt = select(Report)
    if status:
        stmt = stmt.where(Report.status == status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(Report.created_at.desc()).offset(off).limit(lim)))
    return {
        "items": [{
            "id": r.id, "reporter_id": r.reporter_id, "reporter": _user_brief(db, r.reporter_id),
            "target_type": r.target_type, "target_id": r.target_id,
            "reason": r.reason, "status": r.status, "created_at": r.created_at.isoformat(),
        } for r in rows],
        "total": total, "limit": lim, "offset": off,
    }


@router.delete("/reports/{report_id}")
def delete_report(report_id: str, admin: AdminUser, db: DBSession) -> dict:
    r = db.get(Report, report_id)
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(r)
    _audit(db, admin, "delete_report", "report", report_id)
    db.commit()
    return {"deleted": True}


@router.post("/reports/batch-delete")
def batch_delete_reports(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    result = db.execute(delete(Report).where(Report.id.in_(payload.ids)))
    _audit(db, admin, "batch_delete_reports", "report", ",".join(payload.ids[:5]), {"count": result.rowcount})
    db.commit()
    return {"deleted": result.rowcount}


@router.delete("/reports/user/{user_id}")
def purge_reports_by_user(user_id: str, admin: AdminUser, db: DBSession) -> dict:
    """Delete all reports filed by a given user (reporter_id)."""
    result = db.execute(delete(Report).where(Report.reporter_id == user_id))
    _audit(db, admin, "purge_reports_by_user", "user", user_id, {"count": result.rowcount})
    db.commit()
    return {"deleted": result.rowcount, "user_id": user_id}


# ---------------------------------------------------------------------------
# Usage logs & moderation
# ---------------------------------------------------------------------------

@router.post("/usage-logs/batch-delete")
def batch_delete_usage_logs(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    result = db.execute(delete(UsageLog).where(UsageLog.id.in_(payload.ids)))
    _audit(db, admin, "batch_delete_usage_logs", "usage_log", ",".join(payload.ids[:5]), {"count": result.rowcount})
    db.commit()
    return {"deleted": result.rowcount}


@router.post("/usage-logs/purge-all")
def purge_all_usage_logs(payload: PurgeAllRequest, admin: AdminUser, db: DBSession) -> dict:
    if payload.confirm != CONFIRM_ALL:
        raise HTTPException(status_code=400, detail=f"confirm must be {CONFIRM_ALL}")
    result = db.execute(delete(UsageLog))
    _audit(db, admin, "purge_all_usage_logs", "usage_log", "*", {"count": result.rowcount})
    db.commit()
    return {"deleted": result.rowcount}


@router.post("/moderation-events/batch-delete")
def batch_delete_moderation_events(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    result = db.execute(delete(ModerationEvent).where(ModerationEvent.id.in_(payload.ids)))
    _audit(db, admin, "batch_delete_moderation_events", "moderation_event", ",".join(payload.ids[:5]), {"count": result.rowcount})
    db.commit()
    return {"deleted": result.rowcount}


@router.post("/moderation-events/purge-all")
def purge_all_moderation_events(payload: PurgeAllRequest, admin: AdminUser, db: DBSession) -> dict:
    if payload.confirm != CONFIRM_ALL:
        raise HTTPException(status_code=400, detail=f"confirm must be {CONFIRM_ALL}")
    result = db.execute(delete(ModerationEvent))
    _audit(db, admin, "purge_all_moderation_events", "moderation_event", "*", {"count": result.rowcount})
    db.commit()
    return {"deleted": result.rowcount}
