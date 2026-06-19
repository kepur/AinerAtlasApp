"""Match scoring algorithm based on interests, languages, values, and AI analysis."""

from app.models import UserMatchProfile, UserProfile, UserValueProfile


def _analysis_bonus(
    user_details: dict | None,
    target_details: dict | None,
) -> tuple[float, list[str]]:
    if not user_details or not target_details:
        return 0.0, []

    score = 0.0
    reasons: list[str] = []

    user_tags = set(user_details.get("match_tags") or [])
    target_tags = set(target_details.get("match_tags") or [])
    tag_overlap = user_tags & target_tags
    if tag_overlap:
        score += 20
        reasons.append(f"AI 标签契合: {', '.join(sorted(tag_overlap))}")

    user_type = str(user_details.get("personality_type") or "").strip()
    target_type = str(target_details.get("personality_type") or "").strip()
    if user_type and target_type and user_type == target_type:
        score += 15
        reasons.append(f"性格类型相近: {user_type}")

    user_style = str((user_details.get("details") or {}).get("communication_style") or user_details.get("communication_style") or "")
    target_style = str((target_details.get("details") or {}).get("communication_style") or target_details.get("communication_style") or "")
    if user_style and target_style and user_style == target_style:
        score += 10
        reasons.append(f"沟通风格相似: {user_style}")

    return min(30.0, score), reasons


def compute_match_score(
    user_profile: UserProfile | None,
    user_match: UserMatchProfile | None,
    user_values: UserValueProfile | None,
    target_profile: UserProfile | None,
    target_match: UserMatchProfile | None,
    target_values: UserValueProfile | None,
    *,
    user_analysis: dict | None = None,
    target_analysis: dict | None = None,
) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    if user_profile and target_profile:
        user_langs = set(user_profile.target_languages or [])
        target_langs = set(target_profile.target_languages or [])
        lang_overlap = user_langs & target_langs
        if lang_overlap:
            score += 30
            reasons.append(f"共同目标语言: {', '.join(sorted(lang_overlap))}")

        user_topics = set(user_profile.favorite_topics or [])
        target_topics = set(target_profile.favorite_topics or [])
        topic_overlap = user_topics & target_topics
        if topic_overlap:
            score += 25
            reasons.append(f"共同兴趣: {', '.join(sorted(topic_overlap))}")

    if user_match and target_match:
        user_interests = set(user_match.interests or [])
        target_interests = set(target_match.interests or [])
        interest_overlap = user_interests & target_interests
        if interest_overlap:
            score += 20
            reasons.append(f"匹配标签: {', '.join(sorted(interest_overlap))}")

        user_tags = set(user_match.tags or [])
        target_tags = set(target_match.tags or [])
        tag_overlap = user_tags & target_tags
        if tag_overlap:
            score += 10
            reasons.append(f"思想标签: {', '.join(sorted(tag_overlap))}")

    if user_values and target_values:
        user_vals = set(user_values.emotional_values or [])
        target_vals = set(target_values.emotional_values or [])
        value_overlap = user_vals & target_vals
        if value_overlap:
            score += 15
            reasons.append(f"价值观契合: {', '.join(sorted(value_overlap))}")

    bonus, bonus_reasons = _analysis_bonus(user_analysis, target_analysis)
    score += bonus
    reasons.extend(bonus_reasons)

    return min(100.0, score), reasons


def compute_profile_completeness(
    match_profile: UserMatchProfile | None,
    value_profile: UserValueProfile | None,
) -> float:
    score = 0.0
    if match_profile:
        if match_profile.bio:
            score += 15
        if match_profile.interests:
            score += 20
        if match_profile.target_languages:
            score += 15
        if match_profile.values:
            score += 15
        if match_profile.lifestyle:
            score += 10
        if match_profile.tags:
            score += 10
    if value_profile:
        if value_profile.emotional_values:
            score += 10
        if value_profile.lifestyle_prefs:
            score += 10
        if value_profile.relationship_goals:
            score += 5
    return min(100.0, score)


from sqlalchemy.orm import Session
from app.services.llm import get_fast_llm_provider


async def generate_icebreaker(
    db: Session,
    reasons: list[str],
    target_username: str,
    user_analysis: dict | None = None,
    target_analysis: dict | None = None,
) -> str:
    provider = get_fast_llm_provider(db, "auto")
    
    prompt = f"Write a friendly, casual, one-sentence icebreaker in Chinese to say hi to {target_username}."
    if reasons:
        prompt += f" You share these traits/interests: {', '.join(reasons)}."
    if user_analysis and target_analysis:
        prompt += (
            f" Your persona: {user_analysis.get('summary', '')}. "
            f" Their persona: {target_analysis.get('summary', '')}. "
            "Make it sound very natural, conversational, and implicitly reference your shared connection."
        )
    
    try:
        result = await provider.thought_dialogue(
            user_input=prompt,
            profile=None,
            native_language="zh",
            target_language="en",
            mode="roleplay",
            topic="icebreaker",
        )
        return result.main_reply_native or f"你好 {target_username}！想一起聊聊吗？"
    except Exception:
        if reasons:
            return f"你好 {target_username}！我们{reasons[0]}，要不要一起聊聊？"
        return f"你好 {target_username}！我在 AinerSpeak 看到你的资料，想一起练习表达吗？"
