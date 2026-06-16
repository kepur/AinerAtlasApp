"""Game visual asset library — covers/backgrounds/avatars with taxonomy.

Seeded once from a built-in catalogue, then fully admin-manageable. The AI
story generator and the frontend pick art from here instead of hardcoding URLs.
"""
from __future__ import annotations

import random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import GameAsset, new_id

# kind, era, gender, age, url
_SEED: list[dict] = [
    # ---- Covers / backgrounds ----
    {"kind": "cover", "era": "ancient", "title": "古风山门", "url": "https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "ancient", "title": "古镇庭院", "url": "https://images.unsplash.com/photo-1542640244-7e672d6cb466?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "ancient", "title": "宫墙红影", "url": "https://images.unsplash.com/photo-1522869062366-21804f32a67e?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "modern", "title": "都市夜景", "url": "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "modern", "title": "咖啡馆", "url": "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "modern", "title": "雨夜街道", "url": "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "cyberpunk", "title": "霓虹都市", "url": "https://images.unsplash.com/photo-1515630278258-407f66498911?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "cyberpunk", "title": "数据中心", "url": "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "fantasy", "title": "奇幻森林", "url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "fantasy", "title": "魔法城堡", "url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "other", "title": "通用封面 A", "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600"},
    {"kind": "cover", "era": "other", "title": "通用封面 B", "url": "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=600"},
    # ---- Avatars ----
    {"kind": "avatar", "era": "modern", "gender": "male", "title": "现代男 A", "url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150"},
    {"kind": "avatar", "era": "modern", "gender": "male", "title": "现代男 B", "url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"},
    {"kind": "avatar", "era": "modern", "gender": "male", "title": "现代男 C", "url": "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&q=80&w=150"},
    {"kind": "avatar", "era": "modern", "gender": "female", "title": "现代女 A", "url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150"},
    {"kind": "avatar", "era": "modern", "gender": "female", "title": "现代女 B", "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"},
    {"kind": "avatar", "era": "modern", "gender": "female", "title": "现代女 C", "url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150"},
    {"kind": "avatar", "era": "ancient", "gender": "male", "title": "古风男 A", "url": "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=150"},
    {"kind": "avatar", "era": "ancient", "gender": "male", "title": "古风男 B", "url": "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=150"},
    {"kind": "avatar", "era": "ancient", "gender": "female", "title": "古风女 A", "url": "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=150"},
    {"kind": "avatar", "era": "ancient", "gender": "female", "title": "古风女 B", "url": "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=150"},
]


def seed_assets(db: Session) -> int:
    """Insert the built-in catalogue once (idempotent by url)."""
    existing = set(db.execute(select(GameAsset.url)).scalars().all())
    added = 0
    for item in _SEED:
        if item["url"] in existing:
            continue
        db.add(GameAsset(
            id=new_id(),
            kind=item["kind"],
            title=item.get("title", ""),
            url=item["url"],
            era=item.get("era", "modern"),
            gender=item.get("gender", "neutral"),
            age=item.get("age", "adult"),
            scene=item.get("scene", ""),
            tags=item.get("tags", []),
        ))
        added += 1
    if added:
        db.commit()
    return added


def asset_dict(a: GameAsset) -> dict:
    return {
        "id": a.id, "kind": a.kind, "title": a.title, "url": a.url,
        "era": a.era, "gender": a.gender, "age": a.age, "scene": a.scene,
        "tags": a.tags, "enabled": a.enabled, "sort_order": a.sort_order,
    }


def list_assets(
    db: Session, kind: str | None = None, era: str | None = None,
    gender: str | None = None, enabled_only: bool = False,
) -> list[dict]:
    q = select(GameAsset)
    if kind:
        q = q.where(GameAsset.kind == kind)
    if era:
        q = q.where(GameAsset.era == era)
    if gender:
        q = q.where(GameAsset.gender == gender)
    if enabled_only:
        q = q.where(GameAsset.enabled.is_(True))
    q = q.order_by(GameAsset.kind, GameAsset.era, GameAsset.sort_order)
    return [asset_dict(a) for a in db.execute(q).scalars().all()]


def pick_asset(
    db: Session, kind: str, era: str | None = None, gender: str | None = None,
) -> str:
    """Pick a random matching asset URL, gracefully widening the filter."""
    for attempt in (
        {"kind": kind, "era": era, "gender": gender},
        {"kind": kind, "era": era},
        {"kind": kind},
    ):
        q = select(GameAsset).where(GameAsset.enabled.is_(True))
        for col, val in attempt.items():
            if val:
                q = q.where(getattr(GameAsset, col) == val)
        rows = db.execute(q).scalars().all()
        if rows:
            return random.choice(rows).url
    return ""


def create_asset(db: Session, data: dict) -> dict:
    a = GameAsset(
        id=new_id(),
        kind=data.get("kind", "cover"),
        title=data.get("title", ""),
        url=data.get("url", ""),
        era=data.get("era", "modern"),
        gender=data.get("gender", "neutral"),
        age=data.get("age", "adult"),
        scene=data.get("scene", ""),
        tags=data.get("tags", []),
        sort_order=data.get("sort_order", 100),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return asset_dict(a)


def update_asset(db: Session, asset_id: str, data: dict) -> dict:
    a = db.get(GameAsset, asset_id)
    if not a:
        raise ValueError("Asset not found")
    for field in ("kind", "title", "url", "era", "gender", "age", "scene", "tags", "enabled", "sort_order"):
        if field in data and data[field] is not None:
            setattr(a, field, data[field])
    db.commit()
    db.refresh(a)
    return asset_dict(a)


def delete_asset(db: Session, asset_id: str) -> None:
    a = db.get(GameAsset, asset_id)
    if a:
        db.delete(a)
        db.commit()


def infer_era(text: str) -> str:
    low = (text or "").lower()
    if any(k in low for k in ["修仙", "仙侠", "古代", "武侠", "仙尊", "师尊", "宫廷", "江湖"]):
        return "ancient"
    if any(k in low for k in ["赛博", "未来", "科幻", "cyber", "机甲", "黑客"]):
        return "cyberpunk"
    if any(k in low for k in ["魔法", "奇幻", "玄幻", "fantasy", "精灵", "龙"]):
        return "fantasy"
    if any(k in low for k in ["都市", "现代", "职场", "校园", "咖啡"]):
        return "modern"
    return "other"


def infer_gender(text: str) -> str:
    low = (text or "").lower()
    if any(k in low for k in ["女", "她", "姐", "妹", "girl", "woman", "female", "ms", "mrs"]):
        return "female"
    if any(k in low for k in ["男", "他", "哥", "弟", "师兄", "师尊", "boy", "man", "male", "mr"]):
        return "male"
    return "neutral"
