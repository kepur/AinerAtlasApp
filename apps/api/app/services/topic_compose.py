"""AI-assisted topic drafting: extract fields + tag suggestions."""

from __future__ import annotations

from typing import Any

from loguru import logger
from sqlalchemy.orm import Session

from app.models import Thought
from app.services.llm import LLMUnavailableError, require_llm_provider
from app.services.runtime_config import resolve_llm_provider_for_task

_TOPIC_JSON_SCHEMA = (
    'Return JSON only: {"title":"一句话标题<=28字","background":"2-3句背景",'
    '"pro_view":"正方核心一句（可空）","con_view":"反方核心一句（可空）",'
    '"suggested_tags":["标签1","标签2",...最多6个中文或英文短标签]}'
)


def _fallback_tags(title: str, background: str = "") -> list[str]:
    text = f"{title} {background}".lower()
    pool = [
        "科技", "职场", "教育", "生活", "伦理", "AI", "辩论",
        "文化", "健康", "创业", "社会", "表达", "学习",
    ]
    hits = [t for t in pool if t.lower() in text or t in title]
    if hits:
        return hits[:5]
    return ["讨论", "观点", "表达"][:3]


def _normalize_draft(data: dict[str, Any], *, fallback_title: str = "") -> dict[str, Any]:
    title = str(data.get("title") or fallback_title or "新话题").strip()[:80]
    background = str(data.get("background") or "").strip()
    pro_view = str(data.get("pro_view") or "").strip()
    con_view = str(data.get("con_view") or "").strip()
    raw_tags = data.get("suggested_tags") or data.get("tags") or []
    tags: list[str] = []
    if isinstance(raw_tags, list):
        for item in raw_tags:
            if isinstance(item, str) and item.strip():
                tags.append(item.strip()[:24])
    if not tags:
        tags = _fallback_tags(title, background)
    return {
        "title": title,
        "background": background,
        "pro_view": pro_view,
        "con_view": con_view,
        "suggested_tags": tags[:6],
    }


async def analyze_topic_fields(
    db: Session,
    *,
    title: str = "",
    background: str = "",
    pro_view: str = "",
    con_view: str = "",
) -> dict[str, Any]:
    """Suggest tags (and lightly refine copy) from partial topic input."""
    title = title.strip()
    background = background.strip()
    pro_view = pro_view.strip()
    con_view = con_view.strip()

    if not title and not background:
        return {
            "title": "",
            "background": "",
            "pro_view": pro_view,
            "con_view": con_view,
            "suggested_tags": [],
        }

    try:
        provider = require_llm_provider(resolve_llm_provider_for_task("topic_generation", db), db=db)
        system = (
            "你是话题广场编辑。根据用户输入生成简洁辩论话题字段，并给出可选标签供用户点选。"
            + _TOPIC_JSON_SCHEMA
        )
        user = (
            f"标题: {title}\n背景: {background}\n正方: {pro_view}\n反方: {con_view}\n"
            "若某字段为空可合理补全；标签要短、可点击、适合分类筛选。"
        )
        data = await provider.complete_json(system, user, temperature=0.45, max_tokens=500)
        draft = _normalize_draft(data if isinstance(data, dict) else {}, fallback_title=title)
        if title:
            draft["title"] = title
        if background:
            draft["background"] = background
        if pro_view:
            draft["pro_view"] = pro_view
        if con_view:
            draft["con_view"] = con_view
        return draft
    except (LLMUnavailableError, Exception) as exc:  # noqa: BLE001
        logger.warning("Topic analyze fallback: {}", exc)
        return {
            "title": title,
            "background": background,
            "pro_view": pro_view,
            "con_view": con_view,
            "suggested_tags": _fallback_tags(title, background),
        }


def _thought_source_text(thought: Thought) -> str:
    freeze = thought.freeze_payload or {}
    parts = [
        thought.title or "",
        thought.summary or "",
        thought.final_content_native or "",
        str(freeze.get("golden_quote") or ""),
        "\n".join(str(x) for x in (freeze.get("main_points") or [])[:8]),
        "\n".join(str(x) for x in (freeze.get("arguments") or [])[:6]),
        "\n".join(str(x) for x in (freeze.get("values") or [])[:6]),
        "\n".join(str(x) for x in (freeze.get("consensus") or [])[:6]),
    ]
    return "\n".join(p.strip() for p in parts if p and str(p).strip())[:6000]


async def draft_topic_from_thought(db: Session, thought: Thought) -> dict[str, Any]:
    """Extract topic draft from a frozen thought / dialogue summary."""
    source = _thought_source_text(thought)
    freeze = thought.freeze_payload or {}
    hint_title = (thought.title or "").replace("收藏观点 - ", "").strip()

    try:
        provider = require_llm_provider(resolve_llm_provider_for_task("topic_generation", db), db=db)
        system = (
            "用户要把一段冻结的对话/思想发表为公开讨论话题。"
            "请提炼标题、背景、可选正反观点、推荐标签。"
            + _TOPIC_JSON_SCHEMA
        )
        user = f"原标题提示: {hint_title}\n\n内容:\n{source}"
        data = await provider.complete_json(system, user, temperature=0.5, max_tokens=650)
        draft = _normalize_draft(data if isinstance(data, dict) else {}, fallback_title=hint_title)
    except (LLMUnavailableError, Exception) as exc:  # noqa: BLE001
        logger.warning("Thought topic draft fallback: {}", exc)
        keywords = freeze.get("keywords") or freeze.get("core_patterns") or []
        draft = {
            "title": hint_title or "我的话题",
            "background": (thought.summary or source[:280]).strip(),
            "pro_view": str((freeze.get("arguments") or [""])[0] if freeze.get("arguments") else ""),
            "con_view": str((freeze.get("values") or [""])[0] if freeze.get("values") else ""),
            "suggested_tags": [str(k) for k in keywords[:5] if k] or _fallback_tags(hint_title),
        }

    draft["thought_id"] = thought.id
    return draft
