"""Build user analysis payloads and persist match/personality insights."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Conversation,
    ConversationMessage,
    MatchAnalysisReport,
    Topic,
    User,
    UserAIMemory,
    UserCommunicationProfile,
    UserMatchProfile,
    UserProfile,
    UserPersonalityTest,
    UserValueProfile,
)
from app.services.ai_memory import load_user_memory_summary, upsert_memory

logger = logging.getLogger(__name__)

ANALYSIS_JSON_HINT = (
    "Respond in pure JSON with keys: "
    "summary (2 paragraphs in Chinese), "
    "match_score (0-100 profile completeness), "
    "personality_type (short label e.g. 理性探索者/温暖表达者), "
    "mbti (4-letter MBTI e.g. INFP, or empty if uncertain), "
    "age_group (Chinese bucket e.g. 18-24, 25-34, inferred from birthday if given), "
    "hobbies (array of 3-6 hobby tags in Chinese), "
    "match_tags (array of 3-8 Chinese tags for matching: interests, values, social style), "
    "details (object with communication_style, social_preference, learning_style, "
    "reasoning_depth, emotional_maturity, knowledge_breadth, values_summary — numeric 0-100 where applicable)."
)


def build_user_analysis_payload(db: Session, user_id: str) -> str:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    match_profile = db.scalar(select(UserMatchProfile).where(UserMatchProfile.user_id == user_id))
    value_profile = db.scalar(select(UserValueProfile).where(UserValueProfile.user_id == user_id))

    lines: list[str] = ["=== 用户基础资料 ==="]
    if profile:
        lines.extend(
            [
                f"母语: {profile.native_language}, 目标语言: {profile.primary_target_language}, 等级: {profile.current_level}",
                f"学习目标: {', '.join(profile.learning_goals or []) or '未填'}",
                f"兴趣话题: {', '.join(profile.favorite_topics or []) or '未填'}",
                f"生日: {profile.birthday or '未填'}",
                f"性别: {profile.gender_identity or '未填'} {profile.gender_custom or ''}".strip(),
                f"性取向: {profile.sexual_orientation or '未填'}",
                f"能力分 — 语法:{profile.grammar_level_score} 词汇:{profile.vocabulary_level_score} 流利:{profile.fluency_score}",
            ]
        )
    else:
        lines.append("（无 UserProfile）")

    if match_profile:
        lines.extend(
            [
                "",
                "=== 匹配资料 ===",
                f"Bio: {match_profile.bio or '未填'}",
                f"兴趣: {', '.join(match_profile.interests or []) or '未填'}",
                f"标签: {', '.join(match_profile.tags or []) or '未填'}",
                f"价值观: {', '.join(match_profile.values or []) or '未填'}",
                f"生活方式: {match_profile.lifestyle or '未填'}",
            ]
        )

    if value_profile:
        lines.extend(
            [
                "",
                "=== 价值观问卷 ===",
                f"情感价值: {', '.join(value_profile.emotional_values or []) or '未填'}",
                f"生活偏好: {', '.join(value_profile.lifestyle_prefs or []) or '未填'}",
                f"关系目标: {', '.join(value_profile.relationship_goals or []) or '未填'}",
            ]
        )

    memory_summary = load_user_memory_summary(db, user_id, limit=8)
    if memory_summary:
        lines.extend(["", "=== AI 长期记忆 ===", memory_summary])

    since = datetime.now(UTC) - timedelta(days=30)
    conversations = list(
        db.scalars(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(
                Conversation.user_id == user_id,
                Conversation.deleted_at.is_(None),
                Conversation.updated_at >= since,
            )
            .order_by(Conversation.updated_at.desc())
            .limit(8)
        )
    )
    if conversations:
        lines.extend(["", "=== 近期对话摘录（最近30天）==="])
        for conv in conversations:
            lines.append(f"对话「{conv.title}」模式={conv.mode} 话题={conv.topic}")
            user_msgs = [
                m.content.strip()
                for m in sorted(conv.messages, key=lambda x: x.created_at)
                if m.role == "user" and m.content.strip()
            ][-4:]
            for msg in user_msgs:
                snippet = msg[:280] + ("…" if len(msg) > 280 else "")
                lines.append(f"  用户: {snippet}")

    topics = list(
        db.scalars(
            select(Topic)
            .where(Topic.creator_id == user_id)
            .order_by(Topic.created_at.desc())
            .limit(5)
        )
    )
    if topics:
        lines.extend(["", "=== 发布的话题 ==="])
        for topic in topics:
            lines.append(f"- {topic.title}: 正方={topic.pro_view[:120]} / 反方={topic.con_view[:120]}")

    return "\n".join(lines)


def apply_analysis_to_profiles(db: Session, user_id: str, analysis: dict) -> None:
    details = analysis.get("details") or {}
    if not isinstance(details, dict):
        details = {}

    comm = db.scalar(select(UserCommunicationProfile).where(UserCommunicationProfile.user_id == user_id))
    if not comm:
        comm = UserCommunicationProfile(user_id=user_id)
        db.add(comm)

    for field in ("reasoning_depth", "knowledge_breadth", "emotional_maturity", "communication_quality"):
        raw = details.get(field)
        if isinstance(raw, (int, float)):
            setattr(comm, field, max(0.0, min(100.0, float(raw))))

    personality_type = str(analysis.get("personality_type") or details.get("personality_type") or "").strip()
    comm_style = str(details.get("communication_style") or "").strip()
    if comm_style:
        comm.response_style = comm_style[:40]
    elif personality_type:
        comm.response_style = personality_type[:40]

    match_profile = db.scalar(select(UserMatchProfile).where(UserMatchProfile.user_id == user_id))
    if match_profile:
        tags = analysis.get("match_tags") or details.get("match_tags") or []
        if isinstance(tags, list):
            merged = list(dict.fromkeys([*(match_profile.tags or []), *[str(t).strip() for t in tags if str(t).strip()]]))
            match_profile.tags = merged[:20]

    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    if profile and isinstance(details.get("learning_style"), str):
        goal_tag = details["learning_style"].strip()
        if goal_tag and goal_tag not in (profile.favorite_topics or []):
            profile.favorite_topics = [*(profile.favorite_topics or []), goal_tag][:12]

    summary = str(analysis.get("summary") or "").strip()
    if personality_type:
        upsert_memory(
            db,
            user_id,
            "personality_type",
            personality_type,
            source="daily_analysis",
            confidence=0.85,
        )

    mbti = str(analysis.get("mbti") or "").strip().upper()[:8]
    if mbti:
        row = db.scalar(select(UserPersonalityTest).where(UserPersonalityTest.user_id == user_id))
        if not row:
            row = UserPersonalityTest(user_id=user_id, mbti=mbti)
            db.add(row)
        else:
            row.mbti = mbti

    if summary:
        upsert_memory(
            db,
            user_id,
            "match_analysis_summary",
            summary[:2000],
            source="daily_analysis",
            confidence=0.8,
        )


async def analyze_user_for_matching(
    db: Session,
    user_id: str,
    provider,
    *,
    report_type: str = "daily",
) -> MatchAnalysisReport | None:
    user = db.get(User, user_id)
    if not user or user.status != "active":
        return None

    payload = build_user_analysis_payload(db, user_id)
    if len(payload.strip()) < 40:
        logger.info("Skip analysis for %s: insufficient data", user_id)
        return None

    analysis = await provider.analyze_user_profile(payload, analysis_hint=ANALYSIS_JSON_HINT)
    apply_analysis_to_profiles(db, user_id, analysis)

    report = MatchAnalysisReport(
        user_id=user_id,
        report_type=report_type,
        summary=str(analysis.get("summary") or ""),
        match_score=float(analysis.get("match_score") or 0),
        details={
            **(analysis.get("details") if isinstance(analysis.get("details"), dict) else {}),
            "personality_type": analysis.get("personality_type", ""),
            "match_tags": analysis.get("match_tags") or [],
            "mbti": analysis.get("mbti", ""),
            "age_group": analysis.get("age_group", ""),
            "hobbies": analysis.get("hobbies") or [],
        },
    )
    db.add(report)
    return report


def users_due_for_analysis(db: Session, limit: int = 200) -> list[str]:
    """Active users with profile, match profile, or recent conversations."""
    since = datetime.now(UTC) - timedelta(days=30)
    conv_user_ids = set(
        db.scalars(
            select(Conversation.user_id)
            .where(Conversation.deleted_at.is_(None), Conversation.updated_at >= since)
            .distinct()
            .limit(limit)
        )
    )
    profile_user_ids = set(db.scalars(select(UserProfile.user_id).limit(limit)))
    match_user_ids = set(db.scalars(select(UserMatchProfile.user_id).limit(limit)))
    candidate_ids = conv_user_ids | profile_user_ids | match_user_ids

    if not candidate_ids:
        return []

    users = list(
        db.scalars(
            select(User.id).where(User.id.in_(candidate_ids), User.status == "active").limit(limit)
        )
    )
    return users


def latest_analysis_details(db: Session, user_id: str) -> dict | None:
    report = db.scalar(
        select(MatchAnalysisReport)
        .where(MatchAnalysisReport.user_id == user_id)
        .order_by(MatchAnalysisReport.created_at.desc())
        .limit(1)
    )
    if not report:
        return None
    details = dict(report.details or {})
    if report.summary and "summary" not in details:
        details["summary"] = report.summary
    details.setdefault("personality_type", details.get("personality_type", ""))
    details.setdefault("match_tags", details.get("match_tags") or [])
    details.setdefault("mbti", details.get("mbti", ""))
    details.setdefault("age_group", details.get("age_group", ""))
    details.setdefault("hobbies", details.get("hobbies") or [])
    details["match_score"] = report.match_score
    details["report_type"] = report.report_type
    details["analyzed_at"] = report.created_at.isoformat()
    return details
