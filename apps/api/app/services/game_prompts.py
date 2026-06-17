"""Backend-manageable game prompts.

Each engine builds its system prompt in code (the default), but first looks for
an admin-editable override stored as a PromptTemplate named ``game.<key>``.
The override may use ``{placeholder}`` fields; if formatting fails for any
reason we safely fall back to the in-code default, so editing can never break a
game. Override templates are seeded once so they show up in the admin panel.
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PromptTemplate, new_id

logger = logging.getLogger(__name__)

# key -> human description (seeded so admins can discover & edit them)
GAME_PROMPT_KEYS = {
    "turtle_soup.judge": "海龟汤·裁判判定提问（YES/NO/IRRELEVANT）",
    "turtle_soup.hud": "海龟汤·学习HUD（自然表达/句型/多智能体）",
    "detective.interrogate": "AI侦探·嫌疑人审讯回答",
    "detective.hud": "AI侦探·学习HUD",
    "romance.turn": "恋爱社交·角色回应+关系+学习点",
    "roleplay.narrative": "角色扮演·叙事/角色对白/选择",
    "social_logic.answer": "狼人杀·被质疑玩家回应",
    "social_logic.hud": "狼人杀·学习HUD",
}


def get_game_prompt(db: Session, key: str, default: str, **fmt) -> str:
    """Return the admin override for ``key`` formatted with ``fmt``, else default.

    Safe: any lookup/format error falls back to the supplied default prompt.
    """
    try:
        row = db.execute(
            select(PromptTemplate).where(
                PromptTemplate.name == f"game.{key}",
                PromptTemplate.enabled.is_(True),
            )
        ).scalars().first()
        if row and row.content and row.content.strip():
            return row.content.format(**fmt) if fmt else row.content
    except Exception as exc:  # noqa: BLE001 — never let prompt editing break a game
        logger.warning("game prompt override failed for %s: %s", key, exc)
    return default


def seed_game_prompts(db: Session) -> int:
    """Insert placeholder rows for each game prompt key so admins can edit them.

    Content starts empty (meaning: use the engine's in-code default). Admins can
    fill it in to override. Idempotent by name.
    """
    existing = set(
        db.execute(
            select(PromptTemplate.name).where(PromptTemplate.name.like("game.%"))
        ).scalars().all()
    )
    added = 0
    for key, desc in GAME_PROMPT_KEYS.items():
        name = f"game.{key}"
        if name in existing:
            continue
        db.add(PromptTemplate(
            id=new_id(),
            name=name,
            task_type="game",
            version="v1.0",
            content="",  # empty = use in-code default; fill to override
            enabled=True,
        ))
        added += 1
    if added:
        db.commit()
    return added
