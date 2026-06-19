"""AI host for matched user conversations."""

from app.services.runtime_config import resolve_default_llm_provider
from app.services.llm import get_llm_provider


async def host_intro(
    user_a: str,
    user_b: str,
    reasons: list[str],
    user_a_analysis: dict | None = None,
    user_b_analysis: dict | None = None,
    db=None,
) -> str:
    provider = get_llm_provider(resolve_default_llm_provider(db), db=db)
    reason_text = ", ".join(reasons) if reasons else "共同学习兴趣"
    
    prompt = f"Introduce {user_a} and {user_b}. They share: {reason_text}. "
    if user_a_analysis:
        prompt += f"{user_a}'s persona: {user_a_analysis.get('summary', '')}. "
    if user_b_analysis:
        prompt += f"{user_b}'s persona: {user_b_analysis.get('summary', '')}. "
    prompt += "Act as a charming, enthusiastic party host in Chinese. Make them feel welcome and suggest a fun topic based on their personas."

    result = await provider.thought_dialogue(
        user_input=prompt,
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
