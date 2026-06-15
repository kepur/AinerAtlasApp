from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import VocabularyItem, utc_now


def mine_vocabulary_from_analysis(
    db: Session,
    user_id: str,
    target_language: str,
    topic: str,
    conversation_id: str,
    analysis: dict,
) -> list[str]:
    """Extract high-value vocabulary from dialogue analysis."""
    added: list[str] = []
    raw_items = analysis.get("vocabulary", [])

    for entry in raw_items:
        if isinstance(entry, dict):
            word = str(entry.get("word", "")).strip()
            meaning = str(entry.get("meaning", "")).strip()
            item_topic = str(entry.get("topic", topic)).strip() or topic
            priority = int(entry.get("priority", 3) or 3)
        else:
            word = str(entry).strip()
            meaning = ""
            item_topic = topic
            priority = 3

        if not word:
            continue

        existing = db.scalar(
            select(VocabularyItem).where(
                VocabularyItem.user_id == user_id,
                VocabularyItem.word == word,
                VocabularyItem.language_code == target_language,
            )
        )
        if existing:
            existing.last_seen_at = utc_now()
            existing.priority = min(5, existing.priority + 1)
            if meaning and not existing.meaning:
                existing.meaning = meaning
            if existing.mastery_status == "unseen":
                existing.mastery_status = "seen"
            continue

        examples: list[str] = []
        if isinstance(entry, dict):
            raw_ex = entry.get("examples", [])
            examples = [str(e) for e in raw_ex if e][:3]

        db.add(
            VocabularyItem(
                user_id=user_id,
                word=word,
                meaning=meaning,
                topic=item_topic,
                language_code=target_language,
                mastery_status="seen",
                mastery_score=20.0,
                examples=examples,
                priority=min(5, priority),
                source_conversation_id=conversation_id,
                last_seen_at=utc_now(),
            )
        )
        added.append(word)

    return added
