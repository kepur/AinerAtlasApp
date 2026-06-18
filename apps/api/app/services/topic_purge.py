"""Cascade delete helpers for community topics and linked circle rooms."""

from __future__ import annotations

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models import CircleMember, CircleMessage, CircleRoom, Topic, TopicRecommendation, TopicVersion


def delete_circle_room(db: Session, circle_id: str) -> None:
    db.execute(delete(CircleMessage).where(CircleMessage.room_id == circle_id))
    db.execute(delete(CircleMember).where(CircleMember.room_id == circle_id))
    room = db.get(CircleRoom, circle_id)
    if room:
        db.delete(room)


def delete_circles_by_topic(db: Session, topic_id: str) -> int:
    room_ids = list(db.scalars(select(CircleRoom.id).where(CircleRoom.topic_id == topic_id)))
    for room_id in room_ids:
        delete_circle_room(db, room_id)
    return len(room_ids)


def delete_topic_by_id(db: Session, topic_id: str) -> bool:
    topic = db.get(Topic, topic_id)
    if not topic:
        return False

    delete_circles_by_topic(db, topic_id)
    db.execute(delete(TopicRecommendation).where(TopicRecommendation.topic_id == topic_id))
    db.execute(delete(TopicVersion).where(TopicVersion.topic_id == topic_id))
    db.execute(update(Topic).where(Topic.parent_topic_id == topic_id).values(parent_topic_id=None))
    db.execute(update(TopicVersion).where(TopicVersion.parent_topic_id == topic_id).values(parent_topic_id=None))
    db.delete(topic)
    return True
