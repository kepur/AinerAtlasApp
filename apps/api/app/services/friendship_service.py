"""User friend relationships — greet-to-friend after match, dissolve on delete."""

from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import CircleMember, CircleMessage, CircleRoom, MatchRequest, User, UserFriendship, UserMatchSettings, utc_now


def _pair_ids(user_a: str, user_b: str) -> tuple[str, str]:
    return (user_a, user_b) if user_a < user_b else (user_b, user_a)


def _match_type_for_users(db: Session, user_a: str, user_b: str) -> str:
    settings = db.scalar(
        select(UserMatchSettings).where(UserMatchSettings.user_id == user_a)
    )
    if settings and settings.match_mode == "soulmate":
        return "soulmate"
    req = db.scalar(
        select(MatchRequest).where(
            MatchRequest.status == "accepted",
            (
                ((MatchRequest.from_user_id == user_a) & (MatchRequest.to_user_id == user_b))
                | ((MatchRequest.from_user_id == user_b) & (MatchRequest.to_user_id == user_a))
            ),
        )
    )
    if req:
        return "language_partner"
    return "interest"


def _had_match_connection(db: Session, user_a: str, user_b: str) -> bool:
    req = db.scalar(
        select(MatchRequest).where(
            MatchRequest.status == "accepted",
            (
                ((MatchRequest.from_user_id == user_a) & (MatchRequest.to_user_id == user_b))
                | ((MatchRequest.from_user_id == user_b) & (MatchRequest.to_user_id == user_a))
            ),
        )
    )
    return req is not None


def are_friends(db: Session, user_a: str, user_b: str) -> bool:
    if user_a == user_b:
        return False
    low, high = _pair_ids(user_a, user_b)
    row = db.scalar(
        select(UserFriendship).where(
            UserFriendship.user_a_id == low,
            UserFriendship.user_b_id == high,
            UserFriendship.status == "active",
        )
    )
    return row is not None


def ensure_friendship_on_greet(
    db: Session,
    user_id: str,
    other_user_id: str,
    *,
    source: str = "match_chat",
    match_type: str | None = None,
) -> UserFriendship | None:
    """Create or refresh friendship when matched users send first chat greeting."""
    if not user_id or not other_user_id or user_id == other_user_id:
        return None
    if not _had_match_connection(db, user_id, other_user_id):
        return None

    low, high = _pair_ids(user_id, other_user_id)
    now = utc_now()
    row = db.scalar(
        select(UserFriendship).where(
            UserFriendship.user_a_id == low,
            UserFriendship.user_b_id == high,
        )
    )
    resolved_type = match_type or _match_type_for_users(db, user_id, other_user_id)

    if row:
        if row.status != "active":
            row.status = "active"
            row.dissolved_by_id = None
        row.last_interaction_at = now
        if not row.greeted_at:
            row.greeted_at = now
        row.match_type = resolved_type
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    row = UserFriendship(
        user_a_id=low,
        user_b_id=high,
        initiated_by_id=user_id,
        source=source,
        match_type=resolved_type,
        status="active",
        greeted_at=now,
        last_interaction_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def maybe_friendship_from_dm_message(db: Session, room_id: str, sender_id: str) -> None:
    """Establish or refresh friendship when matched users chat in DM."""
    room = db.get(CircleRoom, room_id)
    if not room or room.room_type != "dm":
        return
    member_ids = list(
        db.scalars(select(CircleMember.user_id).where(CircleMember.room_id == room_id))
    )
    others = [uid for uid in member_ids if uid != sender_id]
    if len(others) != 1:
        return
    other_id = others[0]
    if not _had_match_connection(db, sender_id, other_id):
        return
    ensure_friendship_on_greet(db, sender_id, other_id)


def remove_friendship(db: Session, user_id: str, friend_user_id: str) -> bool:
    low, high = _pair_ids(user_id, friend_user_id)
    row = db.scalar(
        select(UserFriendship).where(
            UserFriendship.user_a_id == low,
            UserFriendship.user_b_id == high,
            UserFriendship.status == "active",
        )
    )
    if not row:
        return False
    row.status = "dissolved"
    row.dissolved_by_id = user_id
    row.updated_at = utc_now()
    db.add(row)
    db.commit()
    return True


def list_active_friendships(db: Session, user_id: str) -> list[UserFriendship]:
    return list(
        db.scalars(
            select(UserFriendship).where(
                or_(UserFriendship.user_a_id == user_id, UserFriendship.user_b_id == user_id),
                UserFriendship.status == "active",
            ).order_by(UserFriendship.last_interaction_at.desc().nulls_last(), UserFriendship.created_at.desc())
        )
    )


def friendship_to_friend_item(db: Session, user_id: str, row: UserFriendship) -> dict | None:
    other_id = row.user_b_id if row.user_a_id == user_id else row.user_a_id
    other = db.get(User, other_id)
    if not other:
        return None
    last_message, last_time = "", ""
    from app.models import CircleMessage

    dm = _dm_room_for(db, user_id, other_id)
    if dm:
        last = db.scalar(
            select(CircleMessage)
            .where(CircleMessage.room_id == dm.id)
            .order_by(CircleMessage.created_at.desc())
            .limit(1)
        )
        if last:
            last_message = last.content[:60]
            last_time = last.created_at.strftime("%H:%M")
    return {
        "id": other_id,
        "user_id": other_id,
        "username": other.username or other.email.split("@")[0],
        "match_type": row.match_type or "language_partner",
        "friendship_id": row.id,
        "source": row.source,
        "last_message": last_message,
        "last_time": last_time,
        "unread": 0,
        "score": 0,
        "is_friend": True,
    }


def _dm_room_for(db: Session, user_a: str, user_b: str) -> CircleRoom | None:
    a_rooms = set(db.scalars(select(CircleMember.room_id).where(CircleMember.user_id == user_a)))
    if not a_rooms:
        return None
    rooms = db.scalars(
        select(CircleRoom).where(CircleRoom.id.in_(a_rooms), CircleRoom.room_type == "dm")
    )
    for room in rooms:
        member_ids = set(db.scalars(select(CircleMember.user_id).where(CircleMember.room_id == room.id)))
        if user_b in member_ids and len(member_ids) <= 2:
            return room
    return None
