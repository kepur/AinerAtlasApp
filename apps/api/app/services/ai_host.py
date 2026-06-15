"""AI host for matched user conversations."""

from app.services.runtime_config import resolve_default_llm_provider
from app.services.llm import get_llm_provider


async def host_intro(
    user_a: str,
    user_b: str,
    reasons: list[str],
    db=None,
) -> str:
    provider = get_llm_provider(resolve_default_llm_provider(db), db=db)
    reason_text = ", ".join(reasons) if reasons else "共同学习兴趣"
    result = await provider.thought_dialogue(
        user_input=f"Introduce {user_a} and {user_b}. They share: {reason_text}",
        profile=None,
        native_language="zh",
        target_language="en",
        mode="host",
        topic="icebreaker",
    )
    return result.main_reply_native or f"欢迎 {user_a} 和 {user_b}！你们{reason_text}，先从自我介绍开始吧。"


async def host_summary(transcript: str, db=None) -> dict:
    provider = get_llm_provider(resolve_default_llm_provider(db), db=db)
    result = await provider.generate_expression_asset(transcript, "en", "AI Host Summary")
    return {
        "summary": result.main_reply_native,
        "corrections": [m.model_dump() for m in (result.mistakes or [])],
        "highlights": result.patterns or [],
    }
