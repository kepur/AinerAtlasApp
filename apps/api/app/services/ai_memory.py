from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import UserAIMemory


def load_user_memory_summary(db: Session, user_id: str, limit: int = 12) -> str:
    """Build a compact memory summary for LLM prompt injection."""
    rows = list(
        db.scalars(
            select(UserAIMemory)
            .where(UserAIMemory.user_id == user_id)
            .order_by(UserAIMemory.confidence.desc(), UserAIMemory.created_at.desc())
            .limit(limit)
        )
    )
    if not rows:
        return ""

    lines = []
    for row in rows:
        lines.append(f"- [{row.memory_type}] {row.content}")
    return "User long-term memory:\n" + "\n".join(lines)


def upsert_memory(
    db: Session,
    user_id: str,
    memory_type: str,
    content: str,
    *,
    source: str = "system",
    confidence: float = 0.7,
) -> UserAIMemory:
    existing = db.scalar(
        select(UserAIMemory).where(
            UserAIMemory.user_id == user_id,
            UserAIMemory.memory_type == memory_type,
        )
    )
    if existing:
        existing.content = content
        existing.source = source
        existing.confidence = confidence
        return existing

    memory = UserAIMemory(
        user_id=user_id,
        memory_type=memory_type,
        content=content,
        source=source,
        confidence=confidence,
    )
    db.add(memory)
    return memory


def update_memory_from_dialogue(
    db: Session,
    user_id: str,
    topic: str,
    analysis: dict,
) -> None:
    """Refresh lightweight dialogue-derived memories after each turn."""
    patterns = analysis.get("patterns", [])[:5]
    vocabulary = analysis.get("vocabulary", [])[:5]
    mistakes = analysis.get("mistakes") or []

    if topic:
        upsert_memory(
            db,
            user_id,
            "recent_topics",
            f"Recently discussed: {topic}.",
            source="dialogue",
            confidence=0.75,
        )

    if patterns:
        upsert_memory(
            db,
            user_id,
            "frequent_patterns",
            f"Common expression patterns: {', '.join(str(p) for p in patterns)}.",
            source="dialogue",
            confidence=0.7,
        )

    if vocabulary:
        upsert_memory(
            db,
            user_id,
            "topic_vocabulary",
            f"Topic vocabulary: {', '.join(str(v) for v in vocabulary)}.",
            source="dialogue",
            confidence=0.65,
        )

    if mistakes:
        mistake_lines = []
        for mistake in mistakes[:5]:
            if isinstance(mistake, dict):
                original = mistake.get("original", "")
                corrected = mistake.get("corrected", "")
                if original and corrected:
                    mistake_lines.append(f"{original} -> {corrected}")
        if mistake_lines:
            upsert_memory(
                db,
                user_id,
                "common_mistakes",
                "Recurring mistakes: " + "; ".join(mistake_lines) + ".",
                source="dialogue",
                confidence=0.8,
            )
