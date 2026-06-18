"""Content moderation — keyword scan with optional LLM confirmation."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

SENSITIVE_KEYWORDS = {
    # English
    "spam", "scam", "violence", "hate", "abuse", "illegal", "porn", "nude", "drug",
    # Chinese
    "色情", "裸聊", "约炮", "赌博", "毒品", "诈骗", "暴力", "仇恨", "辱骂", "反动",
    "恐怖主义", "自杀", "贩卖", "枪支", "洗钱",
}


def moderate_text(content: str, content_type: str = "message") -> dict:
    lowered = content.lower()
    hits = [kw for kw in SENSITIVE_KEYWORDS if kw in lowered or kw in content]
    if hits:
        return {
            "flagged": True,
            "action": "flag",
            "reason": f"Sensitive keywords detected: {', '.join(hits[:5])}",
            "details": {"keywords": hits[:10], "content_type": content_type},
        }
    return {"flagged": False, "action": "allow", "reason": "", "details": {}}


async def moderate_text_with_llm(content: str, content_type: str = "message", db=None) -> dict:
    """Keyword scan first; optional LLM pass when a provider is configured."""
    base = moderate_text(content, content_type)
    if not base["flagged"] or db is None:
        return base

    try:
        from app.services.llm import require_llm_provider

        llm = require_llm_provider(db)
        snippet = content[:1500]
        result = await llm.complete_json(
            system_prompt=(
                "You are a content safety reviewer. Return JSON only: "
                '{"flagged": boolean, "reason": string, "categories": string[]}. '
                "Flag hate, violence, sexual content involving minors, scams, illegal activity."
            ),
            user_content=f"Review this {content_type}:\n{snippet}",
        )
        if isinstance(result, dict) and result.get("flagged"):
            categories = result.get("categories") or []
            reason = str(result.get("reason") or base["reason"])
            return {
                "flagged": True,
                "action": "flag",
                "reason": reason[:500],
                "details": {
                    "keywords": base["details"].get("keywords", []),
                    "categories": categories,
                    "content_type": content_type,
                    "llm_reviewed": True,
                },
            }
    except Exception as exc:
        logger.warning("LLM moderation review failed, using keyword result: %s", exc)
    return base
