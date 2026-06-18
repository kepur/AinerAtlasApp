"""Curated game learning packs (patterns / vocabulary)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import GameLearningPack, new_id

DEFAULT_SOCIAL_LOGIC_PATTERNS = [
    {"pattern": "Why were you...", "example": "Why were you near the gate last night?", "add_to_crush": True},
    {"pattern": "That doesn't add up.", "example": "That doesn't add up with what you said earlier.", "add_to_crush": True},
    {"pattern": "Can you explain why...?", "example": "Can you explain why your story changed?", "add_to_crush": True},
    {"pattern": "I suspect that...", "example": "I suspect that someone is lying.", "add_to_crush": True},
]


def list_packs(db: Session, game_type: str, pack_type: str | None = None) -> list[dict]:
    stmt = select(GameLearningPack).where(
        GameLearningPack.game_type == game_type,
        GameLearningPack.enabled.is_(True),
    )
    if pack_type:
        stmt = stmt.where(GameLearningPack.pack_type == pack_type)
    rows = list(db.scalars(stmt.order_by(GameLearningPack.sort_order, GameLearningPack.created_at)))
    return [_pack_dict(p) for p in rows]


def patterns_for_game(db: Session, game_type: str) -> list[dict]:
    packs = list_packs(db, game_type, pack_type="pattern")
    if packs:
        return [
            {"pattern": p["content"], "example": p.get("example") or "", "add_to_crush": True}
            for p in packs
        ]
    if game_type == "social_logic":
        return list(DEFAULT_SOCIAL_LOGIC_PATTERNS)
    return []


def create_pack(db: Session, payload: dict) -> dict:
    row = GameLearningPack(
        id=new_id(),
        game_type=payload["game_type"],
        pack_type=payload.get("pack_type", "pattern"),
        label=payload.get("label", ""),
        content=payload["content"],
        example=payload.get("example", ""),
        difficulty=payload.get("difficulty", "B1"),
        enabled=payload.get("enabled", True),
        sort_order=int(payload.get("sort_order", 100)),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _pack_dict(row)


def update_pack(db: Session, pack_id: str, payload: dict) -> dict:
    row = db.get(GameLearningPack, pack_id)
    if not row:
        raise ValueError("Pack not found")
    for key in ("label", "content", "example", "difficulty", "enabled", "sort_order", "pack_type"):
        if key in payload:
            setattr(row, key, payload[key])
    db.add(row)
    db.commit()
    db.refresh(row)
    return _pack_dict(row)


def delete_pack(db: Session, pack_id: str) -> None:
    row = db.get(GameLearningPack, pack_id)
    if not row:
        raise ValueError("Pack not found")
    db.delete(row)
    db.commit()


def _pack_dict(p: GameLearningPack) -> dict:
    return {
        "id": p.id,
        "game_type": p.game_type,
        "pack_type": p.pack_type,
        "label": p.label,
        "content": p.content,
        "example": p.example,
        "difficulty": p.difficulty,
        "enabled": p.enabled,
        "sort_order": p.sort_order,
    }
