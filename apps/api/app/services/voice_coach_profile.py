"""Daily Voice Coach profile: analyze, persist, and build Omni session instructions."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Conversation,
    User,
    UserMastery,
    UserProfile,
    UserVoiceCoachProfile,
    VoiceSession,
)
from app.services.ai_memory import load_user_memory_summary
from app.services.user_profile_analysis import build_user_analysis_payload, latest_analysis_details
from app.services.voice_platform_config import get_voice_platform_config

logger = logging.getLogger(__name__)

PROFILE_MAX_AGE_HOURS = 36

VOICE_COACH_JSON_HINT = (
    "You are building a personalized Voice Coach briefing for a language-learning app. "
    "Analyze the user data and output pure JSON with these keys:\n"
    "- user_summary: 2-3 sentences in Chinese describing who this user is and their current situation\n"
    "- coach_identity: 2-4 sentences in English defining the AI voice coach persona "
    "(warm, proactive language partner — NOT a passive assistant)\n"
    "- user_context_prompt: English paragraph injected into the voice model about this specific user "
    "(level, goals, personality, recent focus)\n"
    "- ability_snapshot: object with grammar, vocabulary, fluency, expression (0-100 numbers) "
    "and overall_level (CEFR string e.g. B1)\n"
    "- strengths: array of 3-6 Chinese strings (what they do well)\n"
    "- weaknesses_to_improve: array of 3-6 Chinese strings (skills to practice in voice sessions)\n"
    "- interests: array of 3-8 Chinese strings (topics they care about)\n"
    "- focus_topics: array of 3-5 English topic labels for upcoming voice sessions\n"
    "- opening_greeting: 1-2 sentences in English the coach should SPEAK FIRST when the call connects "
    "(personalized, warm, references their interests or goals)\n"
    "- opening_questions: array of 2-3 English follow-up questions to ask after the greeting\n"
    "- session_directives: English bullet-style instructions for how the coach should behave this week "
    "(proactive, ask follow-ups, correct gently, push on weak areas)\n"
)

DEFAULT_COACH_IDENTITY = (
    "You are AinerSpeak Voice Coach — a warm, proactive language partner. "
    "You lead the conversation: greet first, ask thoughtful follow-ups, and help the user "
    "practice natural spoken English (or their target language). Never wait silently for the user."
)

INTERVIEW_SCENARIOS: dict[str, dict[str, Any]] = {
    "通用": {
        "topic_labels": ["自我介绍", "优缺点", "职业规划", "团队协作"],
        "question_pool": [
            "Tell me about yourself.",
            "What are your greatest strengths and weaknesses?",
            "Why do you want this role?",
            "Describe a challenge you overcame at work.",
        ],
        "evaluation": ["回答结构 STAR", "逻辑清晰", "专业语气", "细节与例证"],
        "opening": "Good morning. Thank you for joining today. Let's begin — please introduce yourself briefly.",
    },
    "科技": {
        "topic_labels": ["技术栈", "系统设计", "项目难点", "跨团队协作"],
        "question_pool": [
            "Walk me through a technical project you are proud of.",
            "How do you handle trade-offs in system design?",
            "Tell me about a bug or outage you resolved under pressure.",
            "How do you stay current with new technologies?",
        ],
        "evaluation": ["技术深度", "问题拆解", "英文技术表达", "结论先行"],
        "opening": "Hi, I'm your interviewer today for a tech role. Start with a brief intro and your core technical stack.",
    },
    "金融": {
        "topic_labels": ["风险意识", "合规", "数据分析", "客户沟通"],
        "question_pool": [
            "Why finance, and why this position?",
            "Describe a time you managed risk or compliance carefully.",
            "How do you explain complex numbers to non-experts?",
            "Tell me about a high-pressure deadline you met.",
        ],
        "evaluation": ["严谨表达", "数字与逻辑", "合规意识", "客户导向"],
        "opening": "Welcome. This is a finance interview simulation. Please introduce yourself and your relevant experience.",
    },
    "医疗": {
        "topic_labels": ["患者沟通", "伦理", "应急处理", "跨学科合作"],
        "question_pool": [
            "Why are you interested in healthcare?",
            "Describe communicating bad news or difficult information.",
            "How do you handle stress in clinical or care settings?",
            "Tell me about teamwork with non-clinical staff.",
        ],
        "evaluation": ["共情表达", "专业术语准确", "伦理敏感度", "清晰有条理"],
        "opening": "Hello. We'll simulate a healthcare-related interview. Please introduce yourself and your background.",
    },
    "教育": {
        "topic_labels": ["教学方法", "课堂管理", "学生激励", "课程设计"],
        "question_pool": [
            "What is your teaching philosophy?",
            "How do you adapt lessons for different learners?",
            "Describe a difficult classroom situation you handled.",
            "How do you assess student progress?",
        ],
        "evaluation": ["表达感染力", "结构化回答", "实例具体", "反思能力"],
        "opening": "Welcome to our education interview practice. Please tell me about your teaching experience and approach.",
    },
    "零售": {
        "topic_labels": ["客户服务", "销售目标", "投诉处理", "门店运营"],
        "question_pool": [
            "Why retail, and what motivates you in customer-facing roles?",
            "Describe handling an unhappy customer.",
            "How do you prioritize tasks during a busy shift?",
            "Tell me about exceeding a sales or service target.",
        ],
        "evaluation": ["服务意识", "抗压表达", "结果导向", "沟通自然度"],
        "opening": "Hi there. This is a retail industry interview practice. Introduce yourself and your customer service experience.",
    },
}


def _ielts_band_rubric(band: str) -> str:
    return (
        f"Target IELTS Speaking band: {band}. "
        f"Adjust question difficulty and follow-up depth to band {band} expectations. "
        "After each answer, give ONE brief evaluation on fluency, vocabulary range, grammar, or pronunciation — "
        "then ask the next interview question."
    )


def build_interview_briefing(industry: str, ielts_band: str) -> dict[str, Any]:
    scenario = INTERVIEW_SCENARIOS.get(industry) or INTERVIEW_SCENARIOS["通用"]
    band = ielts_band or "6.5"
    return {
        "user_summary": f"英语面试模拟 · {industry} · 雅思口语 Band {band}",
        "coach_identity": "Professional English interviewer",
        "ability_snapshot": {
            "grammar": 0,
            "vocabulary": 0,
            "fluency": 0,
            "expression": 0,
            "overall_level": f"IELTS {band}",
        },
        "strengths": list(scenario.get("evaluation", []))[:3],
        "weaknesses_to_improve": [
            "面试回答结构（STAR）",
            "行业相关英文词汇",
            f"雅思 Band {band} 流利度与连贯性",
        ],
        "interests": list(scenario.get("topic_labels", []))[:6],
        "focus_topics": list(scenario.get("question_pool", []))[:4],
        "opening_greeting": scenario.get("opening", ""),
        "opening_questions": list(scenario.get("question_pool", []))[:3],
        "analyzed_at": None,
        "analysis_source": "interview_scenario",
    }


def compose_interview_session_instructions(
    industry: str,
    ielts_band: str,
    *,
    topic: str,
    db: Session | None = None,
) -> str:
    scenario = INTERVIEW_SCENARIOS.get(industry) or INTERVIEW_SCENARIOS["通用"]
    band = ielts_band or "6.5"
    cfg = get_voice_platform_config(db)
    base = str(cfg.get("omni_instructions") or "").strip()
    questions = "\n".join(f"- {q}" for q in scenario.get("question_pool", [])[:6])
    eval_points = ", ".join(scenario.get("evaluation", []))
    rubric = _ielts_band_rubric(band)

    return (
        f"{base}\n\n" if base else ""
    ) + (
        "## Role\n"
        "You are a professional English job interviewer in a mock interview session. "
        "Do NOT act as a general language tutor or discuss the candidate's unrelated hobbies.\n\n"
        f"## Scenario\nIndustry: {industry}\n{topic}\n\n"
        f"## {rubric}\n\n"
        f"## Interview focus for this industry\n{eval_points}\n\n"
        f"## Question pool (pick one at a time; do not ask multiple at once)\n{questions}\n\n"
        "## Rules\n"
        "- Ask exactly ONE interview question per turn, then wait for the candidate.\n"
        "- After the candidate answers, give a brief professional evaluation (2-3 sentences), "
        "then move to the next question.\n"
        "- Keep language natural interview English; adjust complexity to the IELTS band target.\n"
        "- Do NOT reveal you are an AI unless asked.\n"
        "- Do NOT use the candidate's personal chat history or unrelated profile topics.\n"
    )


def build_voice_coach_payload(db: Session, user_id: str) -> str:
    """Rich payload: base user analysis + voice sessions + pattern mastery."""
    base = build_user_analysis_payload(db, user_id)
    lines = [base]

    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    if profile:
        lines.extend(
            [
                "",
                "=== 语音教练能力基线 ===",
                f"口语自信: {profile.speaking_confidence_score}",
                f"写作自信: {profile.writing_confidence_score}",
                f"教练风格偏好: {profile.coach_style}",
                f"纠错风格: {profile.correction_style}",
            ]
        )

    match_analysis = latest_analysis_details(db, user_id)
    if match_analysis:
        lines.extend(
            [
                "",
                "=== 最近匹配/人格分析 ===",
                f"类型: {match_analysis.get('personality_type', '')}",
                f"摘要: {str(match_analysis.get('summary', ''))[:500]}",
            ]
        )

    since = datetime.now(UTC) - timedelta(days=14)
    voice_sessions = list(
        db.scalars(
            select(VoiceSession)
            .where(VoiceSession.user_id == user_id, VoiceSession.created_at >= since)
            .order_by(VoiceSession.created_at.desc())
            .limit(6)
        )
    )
    if voice_sessions:
        lines.extend(["", "=== 近期语音通话 ==="])
        for vs in voice_sessions:
            snippet = (vs.transcript or "").strip()[:200]
            mode = (vs.analysis or {}).get("mode", "realtime")
            lines.append(f"- {vs.duration_seconds}s mode={mode} {snippet or '(无转写)'}")

    weak_patterns = list(
        db.scalars(
            select(UserMastery)
            .where(UserMastery.user_id == user_id, UserMastery.status != "mastered")
            .order_by(UserMastery.mastery_score.asc())
            .limit(8)
        )
    )
    if weak_patterns:
        lines.extend(["", "=== 待加强句型/词汇 ==="])
        for row in weak_patterns:
            lines.append(f"- {row.title} (掌握度 {row.mastery_score:.0f})")

    return "\n".join(lines)


def _default_ability_snapshot(profile: UserProfile | None) -> dict[str, Any]:
    if not profile:
        return {
            "grammar": 50,
            "vocabulary": 50,
            "fluency": 50,
            "expression": 50,
            "overall_level": "B1",
        }
    return {
        "grammar": round(float(profile.grammar_level_score or 50)),
        "vocabulary": round(float(profile.vocabulary_level_score or 50)),
        "fluency": round(float(profile.fluency_score or 50)),
        "expression": round(float(profile.speaking_confidence_score or 50)),
        "overall_level": profile.current_level or "B1",
    }


def _bootstrap_profile(db: Session, user_id: str, *, source: str = "bootstrap") -> UserVoiceCoachProfile:
    """Minimal profile when LLM data is insufficient (new users)."""
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    native = profile.native_language if profile else "zh"
    target = profile.primary_target_language if profile else "en"
    level = profile.current_level if profile else "B1"
    topics = (profile.favorite_topics or [])[:3] if profile else []
    interests = topics or ["daily life", "career", "travel"]
    greeting = (
        f"Hi! Great to connect with you today. I'm your voice coach — "
        f"let's practice natural {target} together. What's been on your mind lately?"
    )
    row = UserVoiceCoachProfile(
        user_id=user_id,
        user_summary=f"新用户，目标语言 {target}，当前等级 {level}。",
        coach_identity=DEFAULT_COACH_IDENTITY,
        user_context_prompt=(
            f"User is a {level} learner. Native: {native}. Target: {target}. "
            f"Interests: {', '.join(interests)}. Encourage them to speak first after your greeting."
        ),
        ability_snapshot=_default_ability_snapshot(profile),
        strengths=["愿意尝试开口", "有明确学习目标"],
        weaknesses_to_improve=["口语流利度", "自然表达", "句型多样性"],
        interests=interests,
        focus_topics=["free conversation", "daily expression", "confidence building"],
        opening_greeting=greeting,
        opening_questions=[
            "What would you like to practice today?",
            "Is there a topic you've been thinking about recently?",
        ],
        session_directives=(
            "Greet proactively. Ask one question at a time. "
            "Gently upgrade their expressions. Keep the conversation moving."
        ),
        analysis_source=source,
        analyzed_at=datetime.now(UTC),
    )
    row.session_instructions = compose_session_instructions(row, mode="free", topic="voice chat", db=db)
    return row


def compose_session_instructions(
    coach: UserVoiceCoachProfile,
    *,
    mode: str,
    topic: str,
    db: Session | None = None,
) -> str:
    cfg = get_voice_platform_config(db)
    base = str(cfg.get("omni_instructions") or "").strip() or DEFAULT_COACH_IDENTITY
    identity = (coach.coach_identity or "").strip() or DEFAULT_COACH_IDENTITY
    context = (coach.user_context_prompt or "").strip()
    directives = (coach.session_directives or "").strip()
    greeting = (coach.opening_greeting or "").strip()
    questions = coach.opening_questions or []
    weaknesses = coach.weaknesses_to_improve or []
    interests = coach.interests or []

    q_block = "\n".join(f"- {q}" for q in questions[:3])
    weak_block = ", ".join(str(w) for w in weaknesses[:5])
    interest_block = ", ".join(str(i) for i in interests[:6])

    return (
        f"{base}\n\n"
        f"## Coach identity\n{identity}\n\n"
        f"## About this user\n{context}\n\n"
        f"## Session mode: {mode}\n## Topic: {topic}\n\n"
        f"## This week's focus\n{directives}\n\n"
        f"## Practice weak areas: {weak_block}\n"
        f"## User interests: {interest_block}\n\n"
        f"## Opening style\n"
        f"Wait for the user to speak first, then reply warmly. "
        f"You may weave in a brief personalized greeting in your first reply, e.g.: \"{greeting}\"\n"
        f"Follow-up questions to consider:\n{q_block}\n"
    )


def get_voice_coach_profile(db: Session, user_id: str) -> UserVoiceCoachProfile | None:
    return db.scalar(select(UserVoiceCoachProfile).where(UserVoiceCoachProfile.user_id == user_id))


def is_profile_fresh(
    profile: UserVoiceCoachProfile | None,
    max_age_hours: int | None = None,
    db: Session | None = None,
) -> bool:
    if max_age_hours is None:
        from app.services.voice_platform_config import get_voice_coach_batch_settings

        max_age_hours = get_voice_coach_batch_settings(db)["profile_ttl_hours"]
    if not profile or not profile.analyzed_at:
        return False
    age = datetime.now(UTC) - profile.analyzed_at.replace(tzinfo=UTC)
    return age < timedelta(hours=max_age_hours)


def profile_to_briefing(profile: UserVoiceCoachProfile) -> dict[str, Any]:
    snap = profile.ability_snapshot or {}
    return {
        "user_summary": profile.user_summary,
        "coach_identity": profile.coach_identity,
        "ability_snapshot": snap,
        "strengths": profile.strengths or [],
        "weaknesses_to_improve": profile.weaknesses_to_improve or [],
        "interests": profile.interests or [],
        "focus_topics": profile.focus_topics or [],
        "opening_greeting": profile.opening_greeting,
        "opening_questions": profile.opening_questions or [],
        "analyzed_at": profile.analyzed_at.isoformat() if profile.analyzed_at else None,
        "analysis_source": profile.analysis_source,
    }


def build_session_coach_context(
    db: Session,
    user_id: str | None,
    *,
    mode: str,
    topic: str,
    industry: str = "",
    ielts_band: str = "",
) -> dict[str, Any]:
    """Load cached profile from DB for voice session (no LLM on hot path)."""
    if mode == "interview":
        ind = (industry or "通用").strip() or "通用"
        band = (ielts_band or "6.5").strip() or "6.5"
        briefing = build_interview_briefing(ind, band)
        instructions = compose_interview_session_instructions(
            ind, band, topic=topic, db=db
        )
        return {
            "coach_instructions": instructions,
            "opening_greeting": briefing.get("opening_greeting") or "",
            "coach_briefing": briefing,
        }

    if not user_id:
        return {
            "coach_instructions": DEFAULT_COACH_IDENTITY,
            "opening_greeting": "",
            "coach_briefing": None,
        }

    coach = get_voice_coach_profile(db, user_id)
    if not coach:
        coach = _bootstrap_profile(db, user_id, source="bootstrap")
        coach.session_instructions = compose_session_instructions(coach, mode=mode, topic=topic, db=db)
        db.add(coach)
        db.flush()

    instructions = coach.session_instructions or compose_session_instructions(
        coach, mode=mode, topic=topic, db=db
    )
    return {
        "coach_instructions": instructions,
        "opening_greeting": coach.opening_greeting or "",
        "coach_briefing": profile_to_briefing(coach),
    }


def _apply_analysis_to_row(row: UserVoiceCoachProfile, analysis: dict[str, Any], *, source: str) -> None:
    snap = analysis.get("ability_snapshot")
    if not isinstance(snap, dict):
        snap = {}
    row.user_summary = str(analysis.get("user_summary") or analysis.get("summary") or row.user_summary or "")
    row.coach_identity = str(analysis.get("coach_identity") or row.coach_identity or DEFAULT_COACH_IDENTITY)
    row.user_context_prompt = str(analysis.get("user_context_prompt") or row.user_context_prompt or "")
    row.ability_snapshot = {
        "grammar": int(snap.get("grammar", 50)),
        "vocabulary": int(snap.get("vocabulary", 50)),
        "fluency": int(snap.get("fluency", 50)),
        "expression": int(snap.get("expression", 50)),
        "overall_level": str(snap.get("overall_level") or "B1"),
    }
    for field in ("strengths", "weaknesses_to_improve", "interests", "focus_topics", "opening_questions"):
        val = analysis.get(field)
        if isinstance(val, list):
            setattr(row, field, [str(x).strip() for x in val if str(x).strip()][:12])
    row.opening_greeting = str(analysis.get("opening_greeting") or row.opening_greeting or "")
    row.session_directives = str(analysis.get("session_directives") or row.session_directives or "")
    row.analysis_source = source
    row.analyzed_at = datetime.now(UTC)


async def analyze_user_voice_coach(
    db: Session,
    user_id: str,
    provider,
    *,
    source: str = "daily",
    mode: str = "free",
    topic: str = "voice chat",
) -> UserVoiceCoachProfile | None:
    user = db.get(User, user_id)
    if not user or user.status != "active":
        return None

    payload = build_voice_coach_payload(db, user_id)
    row = get_voice_coach_profile(db, user_id)
    if not row:
        row = UserVoiceCoachProfile(user_id=user_id)
        db.add(row)

    if len(payload.strip()) < 30:
        bootstrap = _bootstrap_profile(db, user_id, source=source)
        _apply_analysis_to_row(row, {
            "user_summary": bootstrap.user_summary,
            "coach_identity": bootstrap.coach_identity,
            "user_context_prompt": bootstrap.user_context_prompt,
            "ability_snapshot": bootstrap.ability_snapshot,
            "strengths": bootstrap.strengths,
            "weaknesses_to_improve": bootstrap.weaknesses_to_improve,
            "interests": bootstrap.interests,
            "focus_topics": bootstrap.focus_topics,
            "opening_greeting": bootstrap.opening_greeting,
            "opening_questions": bootstrap.opening_questions,
            "session_directives": bootstrap.session_directives,
        }, source=source)
    else:
        try:
            if hasattr(provider, "analyze_voice_coach"):
                analysis = await provider.analyze_voice_coach(payload, analysis_hint=VOICE_COACH_JSON_HINT)
            else:
                analysis = await provider.analyze_user_profile(payload, analysis_hint=VOICE_COACH_JSON_HINT)
                details = analysis.get("details") if isinstance(analysis.get("details"), dict) else {}
                analysis = {**details, **analysis}
            _apply_analysis_to_row(row, analysis, source=source)
        except Exception as exc:
            logger.warning("Voice coach LLM analysis failed for %s, using bootstrap: %s", user_id, exc)
            bootstrap = _bootstrap_profile(db, user_id, source=source)
            _apply_analysis_to_row(
                row,
                {
                    "user_summary": bootstrap.user_summary,
                    "coach_identity": bootstrap.coach_identity,
                    "user_context_prompt": bootstrap.user_context_prompt,
                    "ability_snapshot": bootstrap.ability_snapshot,
                    "strengths": bootstrap.strengths,
                    "weaknesses_to_improve": bootstrap.weaknesses_to_improve,
                    "interests": bootstrap.interests,
                    "focus_topics": bootstrap.focus_topics,
                    "opening_greeting": bootstrap.opening_greeting,
                    "opening_questions": bootstrap.opening_questions,
                    "session_directives": bootstrap.session_directives,
                },
                source=source,
            )
        if not row.opening_greeting:
            bootstrap = _bootstrap_profile(db, user_id, source=source)
            row.opening_greeting = bootstrap.opening_greeting
            row.opening_questions = bootstrap.opening_questions

    row.session_instructions = compose_session_instructions(row, mode=mode, topic=topic, db=db)
    return row


async def ensure_voice_coach_profile(
    db: Session,
    user_id: str,
    provider,
    *,
    force: bool = False,
    mode: str = "free",
    topic: str = "voice chat",
) -> UserVoiceCoachProfile:
    existing = get_voice_coach_profile(db, user_id)
    if existing and is_profile_fresh(existing, db=db) and not force:
        return existing
    analyzed = await analyze_user_voice_coach(
        db, user_id, provider, source="on_demand" if force else "daily", mode=mode, topic=topic
    )
    if analyzed:
        return analyzed
    if existing:
        return existing
    row = _bootstrap_profile(db, user_id, source="bootstrap")
    db.add(row)
    db.flush()
    return row


def users_due_for_voice_coach(db: Session, limit: int = 300) -> list[str]:
    """Users due for Voice Coach batch per Admin schedule settings."""
    from app.services.membership_access import has_voice_coach_access
    from app.services.voice_platform_config import get_voice_coach_batch_settings

    batch = get_voice_coach_batch_settings(db)
    max_age_hours = batch["profile_ttl_hours"]
    since = datetime.now(UTC) - timedelta(days=45)
    voice_ids = set(
        db.scalars(
            select(VoiceSession.user_id)
            .where(VoiceSession.created_at >= since)
            .distinct()
            .limit(limit)
        )
    )
    conv_ids = set(
        db.scalars(
            select(Conversation.user_id)
            .where(Conversation.deleted_at.is_(None), Conversation.updated_at >= since)
            .distinct()
            .limit(limit)
        )
    )
    profile_ids = set(db.scalars(select(UserProfile.user_id).limit(limit)))
    candidate_ids = voice_ids | conv_ids | profile_ids
    if not candidate_ids:
        return []

    stale_cutoff = datetime.now(UTC) - timedelta(hours=max_age_hours)
    fresh_ids = set(
        db.scalars(
            select(UserVoiceCoachProfile.user_id).where(
                UserVoiceCoachProfile.analyzed_at >= stale_cutoff
            )
        )
    )
    due_ids = [uid for uid in candidate_ids if uid not in fresh_ids]

    users = list(
        db.scalars(select(User).where(User.id.in_(due_ids), User.status == "active").limit(limit * 2))
    )
    if batch["vip_only"]:
        users = [u for u in users if has_voice_coach_access(u)]
    return [u.id for u in users[:limit]]
