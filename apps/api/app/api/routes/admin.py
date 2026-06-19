from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, delete

from app.api.deps import AdminUser, DBSession
from app.core.security import encrypt_api_key
from app.models import (
    AIProvider,
    AppSettings,
    AuditLog,
    AuthSettings,
    CircleMember,
    CircleMessage,
    CircleRoom,
    Conversation,
    ExpressionAsset,
    MatchAnalysisReport,
    MembershipPlan,
    ModerationEvent,
    PromptTemplate,
    RealtimeSessionLog,
    Topic,
    UsageLog,
    User,
    UserAIMemory,
    UserCommunicationProfile,
    UserMastery,
    UserMatchProfile,
    UserProfile,
    UserVoiceCoachProfile,
    VoiceSession,
    LLMCallLog,
)
from app.services.audit import write_audit_log
from app.services.topic_purge import delete_circle_room, delete_topic_by_id
from app.schemas import (
    AdminUserCreate,
    AdminUserUpdate,
    AppSettingsRead,
    AppSettingsUpdate,
    AuditLogRead,
    AuthSettingsRead,
    AuthSettingsUpdate,
    CostSummary,
    MembershipPlanRead,
    MembershipPlanUpdate,
    MembershipUpdate,
    ModerationEventRead,
    ProviderCreate,
    ProviderCapabilityRead,
    ProviderRead,
    ProviderTestRequest,
    ProviderTestResult,
    PromptTemplateRead,
    PromptTemplateUpdate,
    UsageLogRead,
    LLMCallLogRead,
    AdminProfileUpdate,
    AnalysisSummary,
    VoiceCoachProfileSummary,
    UserDetailRead,
    UserProfileSummary,
    UserRead,
    CommunicationProfileSummary,
    MatchProfileSummary,
)
from app.api.routes.profile import _sync_match_birthday
from app.services.llm import get_llm_provider
from app.services.runtime_config import resolve_default_llm_provider
from app.services.user_profile_analysis import analyze_user_for_matching
from app.services.voice_coach_profile import (
    analyze_user_voice_coach,
    profile_to_briefing,
)
from app.tasks.scheduler import reschedule_voice_coach_job, run_daily_voice_coach_analysis
from app.services.app_settings import get_app_settings, resolved_default_locale, resolved_enabled_locales
from app.services.auth_settings import (
    demo_password_configured,
    get_auth_settings,
    get_smtp_password,
    set_demo_password,
    set_smtp_password,
)
from app.services.languages import filter_enabled_locales
from app.services.demo_user import sync_demo_user_from_settings
from app.services.email_service import send_verification_email, smtp_configured
from app.services.provider_capabilities import get_provider_capabilities
from app.services.provider_keys import resolve_provider_api_key
from app.services.provider_read import to_provider_read
from app.services.provider_tester import test_provider_connection
from app.services.verification_code import generate_verification_code

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_LIST_LIMIT = 50
ADMIN_LIST_MAX = 200


class BatchDeleteRequest(BaseModel):
    ids: list[str] = Field(default_factory=list, min_length=1)


def _admin_paginate(limit: int, offset: int) -> tuple[int, int]:
    return min(max(limit, 1), ADMIN_LIST_MAX), max(offset, 0)


def _creator_filter(db: DBSession, username: str | None) -> list[str] | None:
    if not username or not username.strip():
        return None
    pattern = f"%{username.strip()}%"
    return list(
        db.scalars(
            select(User.id).where(
                or_(User.username.ilike(pattern), User.email.ilike(pattern))
            )
        )
    )


@router.get("/overview")
def overview(_: AdminUser, db: DBSession) -> dict:
    return {
        "users": db.scalar(select(func.count(User.id))) or 0,
        "conversations": db.scalar(select(func.count(Conversation.id))) or 0,
        "assets": db.scalar(select(func.count(ExpressionAsset.id))) or 0,
        "usage_logs": db.scalar(select(func.count(UsageLog.id))) or 0,
    }


@router.get("/users", response_model=list[UserRead])
def list_users(_: AdminUser, db: DBSession) -> list[User]:
    return list(db.scalars(select(User).order_by(User.created_at.desc()).limit(100)))


@router.get("/users/{user_id}", response_model=UserDetailRead)
def get_user_detail(user_id: str, _: AdminUser, db: DBSession) -> UserDetailRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    conversation_count = db.scalar(
        select(func.count(Conversation.id)).where(Conversation.user_id == user.id)
    ) or 0
    asset_count = db.scalar(
        select(func.count(ExpressionAsset.id)).where(ExpressionAsset.user_id == user.id)
    ) or 0
    pattern_count = db.scalar(
        select(func.count(UserMastery.id)).where(UserMastery.user_id == user.id)
    ) or 0
    mastered_patterns = db.scalar(
        select(func.count(UserMastery.id)).where(
            UserMastery.user_id == user.id,
            UserMastery.status == "mastered",
        )
    ) or 0
    avg_mastery = db.scalar(
        select(func.avg(UserMastery.mastery_score)).where(UserMastery.user_id == user.id)
    ) or 0

    match_profile = db.scalar(select(UserMatchProfile).where(UserMatchProfile.user_id == user.id))
    comm_profile = db.scalar(
        select(UserCommunicationProfile).where(UserCommunicationProfile.user_id == user.id)
    )
    latest_report = db.scalar(
        select(MatchAnalysisReport)
        .where(MatchAnalysisReport.user_id == user.id)
        .order_by(MatchAnalysisReport.created_at.desc())
        .limit(1)
    )
    memory_rows = list(
        db.scalars(
            select(UserAIMemory)
            .where(UserAIMemory.user_id == user.id)
            .order_by(UserAIMemory.created_at.desc())
            .limit(6)
        )
    )

    latest_analysis = None
    if latest_report:
        details = dict(latest_report.details or {})
        latest_analysis = AnalysisSummary(
            id=latest_report.id,
            report_type=latest_report.report_type,
            summary=latest_report.summary,
            match_score=latest_report.match_score,
            personality_type=str(details.get("personality_type") or ""),
            match_tags=list(details.get("match_tags") or []),
            details=details,
            created_at=latest_report.created_at,
        )

    voice_coach = db.scalar(
        select(UserVoiceCoachProfile).where(UserVoiceCoachProfile.user_id == user.id)
    )
    voice_coach_summary = None
    if voice_coach:
        brief = profile_to_briefing(voice_coach)
        voice_coach_summary = VoiceCoachProfileSummary(
            user_summary=brief.get("user_summary", ""),
            coach_identity=brief.get("coach_identity", ""),
            ability_snapshot=brief.get("ability_snapshot") or {},
            strengths=brief.get("strengths") or [],
            weaknesses_to_improve=brief.get("weaknesses_to_improve") or [],
            interests=brief.get("interests") or [],
            focus_topics=brief.get("focus_topics") or [],
            opening_greeting=brief.get("opening_greeting", ""),
            opening_questions=brief.get("opening_questions") or [],
            analyzed_at=voice_coach.analyzed_at,
            analysis_source=voice_coach.analysis_source,
        )

    return UserDetailRead(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        membership_level=user.membership_level,
        status=user.status,
        membership_expires_at=user.membership_expires_at,
        created_at=user.created_at,
        profile=UserProfileSummary.model_validate(profile) if profile else None,
        match_profile=MatchProfileSummary.model_validate(match_profile) if match_profile else None,
        communication_profile=(
            CommunicationProfileSummary.model_validate(comm_profile) if comm_profile else None
        ),
        latest_analysis=latest_analysis,
        voice_coach_profile=voice_coach_summary,
        ai_memory_preview=[f"[{m.memory_type}] {m.content[:120]}" for m in memory_rows],
        stats={
            "conversations": conversation_count,
            "assets": asset_count,
            "patterns": pattern_count,
            "mastered_patterns": mastered_patterns,
            "avg_mastery_score": round(float(avg_mastery), 1),
        },
    )


@router.post("/users/{user_id}/analyze")
async def trigger_user_analysis(user_id: str, admin: AdminUser, db: DBSession) -> dict:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    provider = get_llm_provider(
        resolve_default_llm_provider(db),
        db,
        allow_mock_fallback=True,
    )
    report = await analyze_user_for_matching(db, user_id, provider, report_type="manual")
    if not report:
        raise HTTPException(status_code=400, detail="用户数据不足，无法生成分析")
    write_audit_log(
        db,
        admin,
        action="trigger_user_analysis",
        resource_type="user",
        resource_id=user_id,
        details={"report_id": report.id},
    )
    db.commit()
    db.refresh(report)
    details = dict(report.details or {})
    return {
        "ok": True,
        "report_id": report.id,
        "summary": report.summary,
        "match_score": report.match_score,
        "personality_type": details.get("personality_type", ""),
        "match_tags": details.get("match_tags") or [],
    }


@router.post("/users/{user_id}/analyze-voice-coach")
async def trigger_voice_coach_analysis(user_id: str, admin: AdminUser, db: DBSession) -> dict:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    from app.services.runtime_config import resolve_llm_provider_for_task
    from app.services.llm import require_llm_provider

    try:
        provider = require_llm_provider(
            resolve_llm_provider_for_task("voice_coach_analysis", db), db=db
        )
    except Exception:
        provider = get_llm_provider(
            resolve_default_llm_provider(db),
            db,
            allow_mock_fallback=True,
        )
    row = await analyze_user_voice_coach(db, user_id, provider, source="manual")
    if not row:
        raise HTTPException(status_code=400, detail="无法生成语音教练画像")
    write_audit_log(
        db,
        admin,
        action="trigger_voice_coach_analysis",
        resource_type="user",
        resource_id=user_id,
        details={"profile_id": row.id},
    )
    db.commit()
    db.refresh(row)
    return {"ok": True, "profile": profile_to_briefing(row)}


@router.post("/voice-coach/run-daily")
async def admin_run_daily_voice_coach(_: AdminUser) -> dict:
    """Manually trigger the daily Voice Coach batch (same as cron 03:30)."""
    await run_daily_voice_coach_analysis()
    return {"ok": True, "message": "Daily Voice Coach analysis job completed"}


@router.post("/voice-platform/apply-recommended-vad")
def apply_recommended_vad(admin: AdminUser, db: DBSession) -> dict:
    """One-click: set omni_silence_ms=1200 and recommended VAD defaults in DB."""
    from app.services.voice_platform_config import (
        RECOMMENDED_VAD_PATCH,
        apply_recommended_vad_patch,
        get_voice_platform_config,
    )

    applied = apply_recommended_vad_patch(db)
    if applied:
        write_audit_log(
            db,
            admin,
            action="apply_recommended_vad",
            resource_type="app_settings",
            resource_id="default",
            details=RECOMMENDED_VAD_PATCH,
        )
        db.commit()
    return {"ok": True, "applied": applied, "voice_platform_config": get_voice_platform_config(db)}


@router.put("/users/{user_id}/profile", response_model=UserProfileSummary)
def admin_update_user_profile(
    user_id: str,
    payload: AdminProfileUpdate,
    admin: AdminUser,
    db: DBSession,
) -> UserProfileSummary:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    for field, value in payload.model_dump().items():
        setattr(profile, field, value)

    _sync_match_birthday(db, user.id, profile.birthday)
    write_audit_log(
        db,
        admin,
        action="update_user_profile",
        resource_type="user",
        resource_id=user_id,
        details={"birthday": str(profile.birthday) if profile.birthday else None},
    )
    db.commit()
    db.refresh(profile)
    return UserProfileSummary.model_validate(profile)


@router.put("/users/{user_id}/membership", response_model=UserRead)
def update_membership(
    user_id: str,
    payload: MembershipUpdate,
    admin: AdminUser,
    db: DBSession,
) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    previous = {
        "membership_level": user.membership_level,
        "status": user.status,
        "membership_expires_at": (
            user.membership_expires_at.isoformat() if user.membership_expires_at else None
        ),
    }
    user.membership_level = payload.membership_level
    user.membership_expires_at = payload.membership_expires_at
    user.status = payload.status
    write_audit_log(
        db,
        admin,
        action="update_membership",
        resource_type="user",
        resource_id=user_id,
        details={"before": previous, "after": payload.model_dump(mode="json")},
    )
    db.commit()
    db.refresh(user)
    return user


@router.post("/users", response_model=UserRead)
def create_user(
    payload: AdminUserCreate,
    admin: AdminUser,
    db: DBSession,
) -> User:
    from app.core.security import hash_password
    user = User(
        email=payload.email,
        username=payload.username,
        role=payload.role,
        membership_level=payload.membership_level,
        password_hash=hash_password(payload.password),
        status="active"
    )
    db.add(user)
    db.flush()
    write_audit_log(
        db,
        admin,
        action="create_user",
        resource_type="user",
        resource_id=user.id,
        details={"email": payload.email, "role": payload.role},
    )
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    admin: AdminUser,
    db: DBSession,
) -> User:
    from app.core.security import hash_password
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    previous = {
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "membership_level": user.membership_level,
        "status": user.status,
    }
    
    if payload.email is not None:
        user.email = payload.email
    if payload.username is not None:
        user.username = payload.username
    if payload.role is not None:
        user.role = payload.role
    if payload.membership_level is not None:
        user.membership_level = payload.membership_level
    if payload.status is not None:
        user.status = payload.status
    if payload.password:
        user.password_hash = hash_password(payload.password)
        
    write_audit_log(
        db,
        admin,
        action="update_user",
        resource_type="user",
        resource_id=user.id,
        details={"before": previous, "after": payload.model_dump(exclude={"password"})},
    )
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, admin: AdminUser, db: DBSession) -> None:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    write_audit_log(
        db,
        admin,
        action="delete_user",
        resource_type="user",
        resource_id=user_id,
        details={"email": user.email, "role": user.role},
    )
    from app.services.user_data_purge import delete_user_account

    delete_user_account(db, user_id)
    db.commit()


@router.get("/providers", response_model=list[ProviderRead])
def list_providers(_: AdminUser, db: DBSession) -> list[ProviderRead]:
    rows = db.scalars(select(AIProvider).order_by(AIProvider.priority.asc()))
    return [to_provider_read(row, db) for row in rows]


@router.get("/providers/capabilities", response_model=list[ProviderCapabilityRead])
def provider_capabilities(_: AdminUser, db: DBSession) -> list[ProviderCapabilityRead]:
    return [
        ProviderCapabilityRead(
            key=item.key,
            label=item.label,
            features=list(item.features),
            status=item.status,
            active_provider=item.active_provider,
            message=item.message,
            required=item.required,
        )
        for item in get_provider_capabilities(db)
    ]


@router.get("/prompts", response_model=list[PromptTemplateRead])
def list_prompts(_: AdminUser, db: DBSession) -> list[PromptTemplate]:
    return list(db.scalars(select(PromptTemplate).order_by(PromptTemplate.task_type.asc())))


@router.put("/prompts/{prompt_id}", response_model=PromptTemplateRead)
def update_prompt(
    prompt_id: str,
    payload: PromptTemplateUpdate,
    admin: AdminUser,
    db: DBSession,
) -> PromptTemplate:
    prompt = db.get(PromptTemplate, prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    previous = {
        "version": prompt.version,
        "enabled": prompt.enabled,
        "content_preview": prompt.content[:120],
    }
    prompt.content = payload.content
    prompt.enabled = payload.enabled
    prompt.version = payload.version
    write_audit_log(
        db,
        admin,
        action="update_prompt",
        resource_type="prompt",
        resource_id=prompt_id,
        details={"before": previous, "after": payload.model_dump()},
    )
    db.commit()
    db.refresh(prompt)
    return prompt


@router.get("/usage")
def list_usage(
    _: AdminUser,
    db: DBSession,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    base = select(UsageLog)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = list(
        db.scalars(
            base.order_by(UsageLog.created_at.desc()).offset(max(0, offset)).limit(min(limit, 200))
        )
    )
    return {
        "items": [UsageLogRead.model_validate(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/audit-logs")
def list_audit_logs(
    _: AdminUser,
    db: DBSession,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    base = select(AuditLog)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = list(
        db.scalars(
            base.order_by(AuditLog.created_at.desc()).offset(max(0, offset)).limit(min(limit, 200))
        )
    )
    return {
        "items": [AuditLogRead.model_validate(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/audit-logs/legacy", response_model=list[AuditLogRead], include_in_schema=False)
def list_audit_logs_legacy(_: AdminUser, db: DBSession) -> list[AuditLog]:
    return list(db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100)))


@router.get("/llm-logs")
def list_llm_logs(
    _: AdminUser,
    db: DBSession,
    limit: int = 20,
    offset: int = 0,
    status: str | None = None,
) -> dict:
    base = select(LLMCallLog)
    if status:
        base = base.where(LLMCallLog.status == status)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = list(
        db.scalars(
            base.order_by(LLMCallLog.created_at.desc()).offset(max(0, offset)).limit(min(limit, 200))
        )
    )
    return {
        "items": [LLMCallLogRead.model_validate(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/llm-logs/legacy", response_model=list[LLMCallLogRead], include_in_schema=False)
def list_llm_logs_legacy(
    _: AdminUser,
    db: DBSession,
    limit: int = 100,
    offset: int = 0,
    status: str | None = None,
) -> list[LLMCallLog]:
    query = select(LLMCallLog)
    if status:
        query = query.where(LLMCallLog.status == status)
    query = query.order_by(LLMCallLog.created_at.desc()).offset(offset).limit(limit)
    return list(db.scalars(query))


@router.delete("/llm-logs")
def clear_llm_logs(_: AdminUser, db: DBSession) -> dict:
    db.execute(delete(LLMCallLog))
    db.commit()
    return {"status": "ok", "message": "LLM logs cleared"}


@router.get("/costs", response_model=CostSummary)
def cost_center(_: AdminUser, db: DBSession) -> CostSummary:
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    today_logs = list(
        db.scalars(select(UsageLog).where(UsageLog.created_at >= today_start))
    )
    today_total = round(sum(log.cost_estimate for log in today_logs), 4)

    provider_costs: dict[str, float] = {}
    task_costs: dict[str, float] = {}
    user_costs: dict[str, float] = {}
    for log in today_logs:
        provider_key = log.provider_id or "unknown"
        provider_costs[provider_key] = provider_costs.get(provider_key, 0) + log.cost_estimate
        task_costs[log.task_type] = task_costs.get(log.task_type, 0) + log.cost_estimate
        if log.user_id:
            user_costs[log.user_id] = user_costs.get(log.user_id, 0) + log.cost_estimate

    provider_rows = [
        {"provider_id": key, "cost": round(value, 4)}
        for key, value in sorted(provider_costs.items(), key=lambda item: item[1], reverse=True)
    ]
    task_rows = [
        {"task_type": key, "cost": round(value, 4)}
        for key, value in sorted(task_costs.items(), key=lambda item: item[1], reverse=True)
    ]

    high_cost_users: list[dict[str, float | str]] = []
    for user_id, cost in sorted(user_costs.items(), key=lambda item: item[1], reverse=True)[:10]:
        user = db.get(User, user_id)
        high_cost_users.append(
            {
                "user_id": user_id,
                "email": user.email if user else "unknown",
                "cost": round(cost, 4),
            }
        )

    return CostSummary(
        today_total=today_total,
        by_provider=provider_rows,
        by_task_type=task_rows,
        high_cost_users=high_cost_users,
    )


@router.get("/moderation", response_model=list[ModerationEventRead])
def list_moderation_events(_: AdminUser, db: DBSession) -> list[ModerationEvent]:
    return list(
        db.scalars(
            select(ModerationEvent).order_by(ModerationEvent.created_at.desc()).limit(100)
        )
    )


@router.get("/users/{user_id}/assets", response_model=None)
def list_user_assets(user_id: str, _: AdminUser, db: DBSession) -> list[dict]:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    assets = list(
        db.scalars(
            select(ExpressionAsset)
            .where(ExpressionAsset.user_id == user_id)
            .order_by(ExpressionAsset.created_at.desc())
            .limit(100)
        )
    )
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "title": a.title,
            "source_text": a.source_text,
            "target_language": a.target_language,
            "variants": a.variants,
            "keywords": a.keywords,
            "current_version": a.current_version,
            "created_at": a.created_at.isoformat(),
        }
        for a in assets
    ]


@router.get("/membership-plans", response_model=list[MembershipPlanRead])
def list_membership_plans(_: AdminUser, db: DBSession) -> list[MembershipPlan]:
    return list(db.scalars(select(MembershipPlan).order_by(MembershipPlan.level.asc())))


@router.put("/membership-plans/{plan_id}", response_model=MembershipPlanRead)
def update_membership_plan(
    plan_id: str,
    payload: MembershipPlanUpdate,
    admin: AdminUser,
    db: DBSession,
) -> MembershipPlan:
    plan = db.get(MembershipPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Membership plan not found")
    previous = {
        "display_name": plan.display_name,
        "daily_ai_dialogue": plan.daily_ai_dialogue,
        "daily_voice_minutes": plan.daily_voice_minutes,
        "daily_freeze_count": plan.daily_freeze_count,
        "asset_limit": plan.asset_limit,
        "daily_match_cards": plan.daily_match_cards,
        "match_batch_size": plan.match_batch_size,
        "enabled": plan.enabled,
    }
    plan.display_name = payload.display_name
    plan.daily_ai_dialogue = payload.daily_ai_dialogue
    plan.daily_voice_minutes = payload.daily_voice_minutes
    plan.daily_freeze_count = payload.daily_freeze_count
    plan.asset_limit = payload.asset_limit
    plan.daily_match_cards = payload.daily_match_cards
    plan.match_batch_size = payload.match_batch_size
    plan.enabled = payload.enabled
    write_audit_log(
        db,
        admin,
        action="update_membership_plan",
        resource_type="membership_plan",
        resource_id=plan_id,
        details={"before": previous, "after": payload.model_dump()},
    )
    db.commit()
    db.refresh(plan)
    return plan


def _auth_settings_read(settings: AuthSettings) -> AuthSettingsRead:
    return AuthSettingsRead(
        smtp_host=settings.smtp_host,
        smtp_port=settings.smtp_port,
        smtp_username=settings.smtp_username,
        smtp_from_email=settings.smtp_from_email,
        smtp_use_tls=settings.smtp_use_tls,
        smtp_configured=smtp_configured(settings),
        email_verification_enabled=settings.email_verification_enabled,
        verification_code_ttl_seconds=settings.verification_code_ttl_seconds,
        google_trial_enabled=settings.google_trial_enabled,
        google_trial_days=settings.google_trial_days,
        google_trial_membership_level=settings.google_trial_membership_level,
        google_email_domains=settings.google_email_domains or ["gmail.com", "googlemail.com"],
        demo_mode_enabled=settings.demo_mode_enabled,
        demo_user_email=settings.demo_user_email,
        demo_password_configured=demo_password_configured(settings),
        updated_at=settings.updated_at,
    )


@router.get("/auth-settings", response_model=AuthSettingsRead)
def get_auth_settings_admin(_: AdminUser, db: DBSession) -> AuthSettingsRead:
    return _auth_settings_read(get_auth_settings(db))


@router.put("/auth-settings", response_model=AuthSettingsRead)
def update_auth_settings(
    payload: AuthSettingsUpdate,
    admin: AdminUser,
    db: DBSession,
) -> AuthSettingsRead:
    settings = get_auth_settings(db)
    previous = _auth_settings_read(settings).model_dump(mode="json")
    settings.smtp_host = payload.smtp_host
    settings.smtp_port = payload.smtp_port
    settings.smtp_username = payload.smtp_username
    if payload.smtp_password:
        set_smtp_password(settings, payload.smtp_password)
    settings.smtp_from_email = payload.smtp_from_email
    settings.smtp_use_tls = payload.smtp_use_tls
    settings.email_verification_enabled = payload.email_verification_enabled
    settings.verification_code_ttl_seconds = payload.verification_code_ttl_seconds
    settings.google_trial_enabled = payload.google_trial_enabled
    settings.google_trial_days = payload.google_trial_days
    settings.google_trial_membership_level = payload.google_trial_membership_level
    settings.google_email_domains = payload.google_email_domains
    settings.demo_mode_enabled = payload.demo_mode_enabled
    settings.demo_user_email = payload.demo_user_email.lower().strip()
    if payload.demo_user_password:
        set_demo_password(settings, payload.demo_user_password)
    sync_demo_user_from_settings(db, settings)
    write_audit_log(
        db,
        admin,
        action="update_auth_settings",
        resource_type="auth_settings",
        resource_id=settings.id,
        details={"before": previous, "after": payload.model_dump(exclude={"smtp_password"})},
    )
    db.commit()
    db.refresh(settings)
    return _auth_settings_read(settings)


@router.post("/auth-settings/test-smtp")
def test_smtp(admin: AdminUser, db: DBSession) -> dict:
    settings = get_auth_settings(db)
    if not smtp_configured(settings):
        raise HTTPException(status_code=400, detail="SMTP is not fully configured")
    code = generate_verification_code()
    send_verification_email(
        db,
        to_email=admin.email,
        code=code,
        ttl_minutes=max(1, settings.verification_code_ttl_seconds // 60),
    )
    return {"message": f"Test email sent to {admin.email}"}


def _app_settings_read(settings: AppSettings) -> AppSettingsRead:
    return AppSettingsRead(
        default_theme=settings.default_theme,
        default_locale=resolved_default_locale(settings),
        enabled_locales=resolved_enabled_locales(settings),
        allow_user_theme_override=settings.allow_user_theme_override,
        allow_user_locale_override=settings.allow_user_locale_override,
        default_llm_provider=settings.default_llm_provider or "",
        default_voice_provider=settings.default_voice_provider or "",
        realtime_asr_provider=settings.realtime_asr_provider or "auto",
        default_embedding_provider=settings.default_embedding_provider or "",
        tts_provider=getattr(settings, "tts_provider", "browser") or "browser",
        tts_voice=getattr(settings, "tts_voice", "longanhuan") or "longanhuan",
        tts_speed=float(getattr(settings, "tts_speed", 0.9) or 0.9),
        tts_pitch=float(getattr(settings, "tts_pitch", 1.1) or 1.1),
        global_api_keys=getattr(settings, "global_api_keys", []) or [],
        llm_routing=getattr(settings, "llm_routing", {}) or {},
        voice_platform_config=getattr(settings, "voice_platform_config", {}) or {},
        updated_at=settings.updated_at,
    )


@router.get("/app-settings", response_model=AppSettingsRead)
def get_app_settings_admin(_: AdminUser, db: DBSession) -> AppSettingsRead:
    return _app_settings_read(get_app_settings(db))


@router.get("/llm-routing-catalog")
def get_llm_routing_catalog(_: AdminUser, db: DBSession) -> dict:
    from app.services.llm_routing_catalog import LLM_ROUTE_BUCKETS, catalog_for_admin

    settings = get_app_settings(db)
    return {
        "routes": catalog_for_admin(),
        "buckets": list(LLM_ROUTE_BUCKETS),
        "routing": getattr(settings, "llm_routing", {}) or {},
    }


@router.put("/app-settings", response_model=AppSettingsRead)
def update_app_settings(
    payload: AppSettingsUpdate,
    admin: AdminUser,
    db: DBSession,
) -> AppSettingsRead:
    settings = get_app_settings(db)
    previous = _app_settings_read(settings).model_dump(mode="json")
    enabled = filter_enabled_locales(payload.enabled_locales)
    if not enabled:
        raise HTTPException(status_code=400, detail="At least one locale must be enabled")

    default_locale = payload.default_locale.lower().strip()
    if default_locale not in enabled:
        default_locale = enabled[0]

    theme = payload.default_theme.lower().strip()
    if theme not in {"dark", "light"}:
        theme = "dark"

    settings.default_theme = theme
    settings.default_locale = default_locale
    settings.enabled_locales = enabled
    settings.allow_user_theme_override = payload.allow_user_theme_override
    settings.allow_user_locale_override = payload.allow_user_locale_override
    settings.default_llm_provider = payload.default_llm_provider.strip()
    settings.default_voice_provider = payload.default_voice_provider.strip()
    settings.realtime_asr_provider = payload.realtime_asr_provider.strip().lower() or "auto"
    settings.default_embedding_provider = payload.default_embedding_provider.strip()
    settings.tts_provider = getattr(payload, "tts_provider", "browser") or "browser"
    settings.tts_voice = getattr(payload, "tts_voice", "longanhuan") or "longanhuan"
    settings.tts_speed = getattr(payload, "tts_speed", 0.9) or 0.9
    settings.tts_pitch = getattr(payload, "tts_pitch", 1.1) or 1.1
    settings.global_api_keys = getattr(payload, "global_api_keys", []) or []
    settings.llm_routing = getattr(payload, "llm_routing", {}) or {}
    from app.services.voice_platform_config import merge_voice_platform_config

    incoming_vpc = getattr(payload, "voice_platform_config", {}) or {}
    current_vpc = merge_voice_platform_config(getattr(settings, "voice_platform_config", None))
    if isinstance(incoming_vpc, dict):
        patch = {k: v for k, v in incoming_vpc.items() if v is not None}
        secret = str(patch.get("nls_access_key_secret") or "").strip()
        if not secret:
            patch.pop("nls_access_key_secret", None)
        current_vpc.update(patch)
    settings.voice_platform_config = current_vpc
    write_audit_log(
        db,
        admin,
        action="update_app_settings",
        resource_type="app_settings",
        resource_id=settings.id,
        details={"before": previous, "after": payload.model_dump()},
    )
    db.commit()
    db.refresh(settings)
    reschedule_voice_coach_job()
    return _app_settings_read(settings)


@router.get("/security")
def security_status(_: AdminUser, db: DBSession) -> dict:
    return {
        "jwt": "enabled",
        "admin_role_guard": "enabled",
        "provider_keys": "fernet_symmetric_encryption",
        "cors": "configured",
        "active_users": db.scalar(select(func.count(User.id)).where(User.status == "active")) or 0,
        "disabled_users": db.scalar(select(func.count(User.id)).where(User.status != "active")) or 0,
        "notes": [
            "API keys are encrypted with Fernet (symmetric). ENCRYPTION_KEY must be set in production.",
            "Admin audit logs are persisted for membership, provider, and prompt changes.",
        ],
    }


@router.post("/providers", response_model=ProviderRead)
def create_provider(payload: ProviderCreate, admin: AdminUser, db: DBSession) -> AIProvider:
    provider = AIProvider(
        provider_name=payload.provider_name,
        provider_type=payload.provider_type,
        api_base_url=payload.api_base_url,
        api_key_encrypted=encrypt_api_key(payload.api_key),
        model_name=payload.model_name,
        enabled=payload.enabled,
        priority=payload.priority,
        cost_weight=payload.cost_weight,
        fallback_provider=payload.fallback_provider,
        config=payload.config,
    )
    db.add(provider)
    db.flush()
    write_audit_log(
        db,
        admin,
        action="create_provider",
        resource_type="provider",
        resource_id=provider.id,
        details={"provider_name": payload.provider_name, "provider_type": payload.provider_type},
    )
    db.commit()
    db.refresh(provider)
    return to_provider_read(provider, db)


@router.put("/providers/{provider_id}", response_model=ProviderRead)
def update_provider(
    provider_id: str,
    payload: ProviderCreate,
    admin: AdminUser,
    db: DBSession,
) -> AIProvider:
    provider = db.get(AIProvider, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    previous = {
        "provider_name": provider.provider_name,
        "provider_type": provider.provider_type,
        "model_name": provider.model_name,
        "enabled": provider.enabled,
        "priority": provider.priority,
    }
    provider.provider_name = payload.provider_name
    provider.provider_type = payload.provider_type
    provider.api_base_url = payload.api_base_url
    provider.api_key_encrypted = (
        encrypt_api_key(payload.api_key) if payload.api_key else provider.api_key_encrypted
    )
    provider.model_name = payload.model_name
    provider.enabled = payload.enabled
    provider.priority = payload.priority
    provider.cost_weight = payload.cost_weight
    provider.fallback_provider = payload.fallback_provider
    provider.config = payload.config
    write_audit_log(
        db,
        admin,
        action="update_provider",
        resource_type="provider",
        resource_id=provider_id,
        details={"before": previous, "after": payload.model_dump(exclude={"api_key"})},
    )
    db.commit()
    db.refresh(provider)
    return to_provider_read(provider, db)


@router.delete("/providers/{provider_id}", status_code=204)
def delete_provider(provider_id: str, admin: AdminUser, db: DBSession) -> None:
    provider = db.get(AIProvider, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    app_settings = get_app_settings(db)
    if app_settings.default_llm_provider == provider.provider_name:
        app_settings.default_llm_provider = ""
    if app_settings.default_voice_provider == provider.provider_name:
        app_settings.default_voice_provider = ""
    if app_settings.default_embedding_provider == provider.provider_name:
        app_settings.default_embedding_provider = ""

    write_audit_log(
        db,
        admin,
        action="delete_provider",
        resource_type="provider",
        resource_id=provider_id,
        details={
            "provider_name": provider.provider_name,
            "provider_type": provider.provider_type,
            "model_name": provider.model_name,
        },
    )
    db.delete(provider)
    db.commit()


@router.post("/providers/test", response_model=ProviderTestResult)
async def test_provider_draft(payload: ProviderTestRequest, _: AdminUser, db: DBSession) -> ProviderTestResult:
    request = payload
    if not payload.api_key.strip() and payload.provider_id:
        provider = db.get(AIProvider, payload.provider_id)
        if provider:
            request = payload.model_copy(
                update={"api_key": resolve_provider_api_key(provider, db)}
            )
    return await test_provider_connection(request)


@router.post("/providers/{provider_id}/test", response_model=ProviderTestResult)
async def test_saved_provider(provider_id: str, _: AdminUser, db: DBSession) -> ProviderTestResult:
    provider = db.get(AIProvider, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    result = await test_provider_connection(
        ProviderTestRequest(
            provider_name=provider.provider_name,
            provider_type=provider.provider_type,
            api_base_url=provider.api_base_url,
            api_key=resolve_provider_api_key(provider, db),
            model_name=provider.model_name,
            enabled=provider.enabled,
            priority=provider.priority,
            cost_weight=provider.cost_weight,
            fallback_provider=provider.fallback_provider,
            config=provider.config,
        )
    )
    provider.config = {**(provider.config or {}), "last_test": result.model_dump()}
    db.commit()
    return result


@router.get("/topics")
def list_admin_topics(
    _: AdminUser,
    db: DBSession,
    q: str | None = None,
    username: str | None = None,
    status: str | None = None,
    limit: int = ADMIN_LIST_LIMIT,
    offset: int = 0,
) -> dict:
    lim, off = _admin_paginate(limit, offset)
    stmt = select(Topic)
    if q and q.strip():
        stmt = stmt.where(Topic.title.ilike(f"%{q.strip()}%"))
    if status:
        stmt = stmt.where(Topic.status == status)
    creator_ids = _creator_filter(db, username)
    if creator_ids is not None:
        if not creator_ids:
            return {"items": [], "total": 0, "limit": lim, "offset": off}
        stmt = stmt.where(Topic.creator_id.in_(creator_ids))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    topics = list(db.scalars(stmt.order_by(Topic.created_at.desc()).offset(off).limit(lim)))
    items = []
    for t in topics:
        creator = db.get(User, t.creator_id)
        items.append(
            {
                "id": t.id,
                "title": t.title,
                "creator_id": t.creator_id,
                "creator_email": creator.email if creator else "",
                "creator_username": creator.username if creator else "",
                "status": t.status,
                "category": getattr(t, "category", ""),
                "tags": t.tags or [],
                "view_count": t.view_count,
                "parent_topic_id": t.parent_topic_id,
                "heat": getattr(t, "heat", "0"),
                "created_at": t.created_at.isoformat(),
            }
        )
    return {"items": items, "total": total, "limit": lim, "offset": off}


@router.put("/topics/{topic_id}")
def update_admin_topic(topic_id: str, payload: dict, _: AdminUser, db: DBSession) -> dict:
    topic = db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404)
    if "title" in payload: topic.title = payload["title"]
    if "status" in payload: topic.status = payload["status"]
    if "category" in payload: setattr(topic, "category", payload["category"])
    if "tags" in payload: topic.tags = payload["tags"]
    db.commit()
    return {"id": topic.id, "title": topic.title, "status": topic.status}


@router.delete("/topics/{topic_id}")
def delete_admin_topic(topic_id: str, admin: AdminUser, db: DBSession) -> dict:
    topic = db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404)
    title = topic.title
    if not delete_topic_by_id(db, topic_id):
        raise HTTPException(status_code=404)
    write_audit_log(
        db,
        admin,
        action="delete_topic",
        resource_type="topic",
        resource_id=topic_id,
        details={"title": title},
    )
    db.commit()
    return {"deleted": True, "id": topic_id}


@router.post("/topics/batch-delete")
def batch_delete_admin_topics(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    deleted = 0
    titles: list[str] = []
    for topic_id in payload.ids:
        topic = db.get(Topic, topic_id)
        if topic and delete_topic_by_id(db, topic_id):
            deleted += 1
            titles.append(topic.title)
    write_audit_log(
        db,
        admin,
        action="batch_delete_topics",
        resource_type="topic",
        resource_id=",".join(payload.ids[:5]),
        details={"count": deleted, "titles": titles[:10]},
    )
    db.commit()
    return {"deleted": deleted}


@router.get("/circles")
def list_admin_circles(
    _: AdminUser,
    db: DBSession,
    q: str | None = None,
    username: str | None = None,
    status: str | None = None,
    limit: int = ADMIN_LIST_LIMIT,
    offset: int = 0,
) -> dict:
    lim, off = _admin_paginate(limit, offset)
    stmt = select(CircleRoom)
    if q and q.strip():
        stmt = stmt.where(CircleRoom.title.ilike(f"%{q.strip()}%"))
    if status:
        stmt = stmt.where(CircleRoom.status == status)
    creator_ids = _creator_filter(db, username)
    if creator_ids is not None:
        if not creator_ids:
            return {"items": [], "total": 0, "limit": lim, "offset": off}
        stmt = stmt.where(CircleRoom.creator_id.in_(creator_ids))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    circles = list(db.scalars(stmt.order_by(CircleRoom.created_at.desc()).offset(off).limit(lim)))

    circle_ids = [c.id for c in circles]
    member_counts: dict[str, int] = {}
    message_counts: dict[str, int] = {}
    if circle_ids:
        member_counts = dict(
            db.execute(
                select(CircleMember.room_id, func.count(CircleMember.id))
                .where(CircleMember.room_id.in_(circle_ids))
                .group_by(CircleMember.room_id)
            ).all()
        )
        message_counts = dict(
            db.execute(
                select(CircleMessage.room_id, func.count(CircleMessage.id))
                .where(CircleMessage.room_id.in_(circle_ids))
                .group_by(CircleMessage.room_id)
            ).all()
        )

    result = []
    for c in circles:
        creator = db.get(User, c.creator_id)
        result.append(
            {
                "id": c.id,
                "title": c.title,
                "room_type": c.room_type,
                "status": c.status,
                "topic_id": c.topic_id,
                "creator_id": c.creator_id,
                "creator_email": creator.email if creator else "",
                "creator_username": creator.username if creator else "",
                "allowed_languages": c.allowed_languages or [],
                "member_count": member_counts.get(c.id, 0),
                "message_count": message_counts.get(c.id, 0),
                "max_members": c.max_members,
                "created_at": c.created_at.isoformat(),
                "ended_at": c.ended_at.isoformat() if c.ended_at else None,
            }
        )
    return {"items": result, "total": total, "limit": lim, "offset": off}


@router.get("/circles/{circle_id}/members")
def list_admin_circle_members(circle_id: str, _: AdminUser, db: DBSession) -> list[dict]:
    members = list(db.scalars(select(CircleMember).where(CircleMember.room_id == circle_id)))
    result = []
    for m in members:
        user = db.get(User, m.user_id)
        result.append({
            "id": m.id,
            "user_id": m.user_id,
            "username": user.username if user else "?",
            "email": user.email if user else "",
            "role": m.role,
            "joined_at": m.joined_at.isoformat(),
        })
    return result


@router.get("/circles/{circle_id}/messages")
def list_admin_circle_messages(circle_id: str, _: AdminUser, db: DBSession) -> dict:
    """Chat records for a circle/meeting — full message history for moderation."""
    circle = db.get(CircleRoom, circle_id)
    if not circle:
        raise HTTPException(status_code=404)
    msgs = list(
        db.scalars(
            select(CircleMessage)
            .where(CircleMessage.room_id == circle_id)
            .order_by(CircleMessage.created_at.asc())
            .limit(500)
        )
    )
    items = []
    for m in msgs:
        user = db.get(User, m.user_id) if m.user_id else None
        items.append({
            "id": m.id,
            "user_id": m.user_id,
            "username": (user.username if user else ("AI 主持" if m.role == "assistant" else "?")),
            "role": m.role,
            "content": m.content,
            "content_language": m.content_language,
            "translated_content": m.translated_content,
            "created_at": m.created_at.isoformat(),
        })
    return {
        "circle": {"id": circle.id, "title": circle.title, "status": circle.status},
        "messages": items,
        "total": len(items),
    }


@router.put("/circles/{circle_id}")
def update_admin_circle(circle_id: str, payload: dict, _: AdminUser, db: DBSession) -> dict:
    circle = db.get(CircleRoom, circle_id)
    if not circle:
        raise HTTPException(status_code=404)
    if "title" in payload: circle.title = payload["title"]
    if "status" in payload: circle.status = payload["status"]
    db.commit()
    return {"id": circle.id, "title": circle.title, "status": circle.status}


@router.delete("/circles/{circle_id}")
def delete_admin_circle(circle_id: str, admin: AdminUser, db: DBSession) -> dict:
    circle = db.get(CircleRoom, circle_id)
    if not circle:
        raise HTTPException(status_code=404)
    title = circle.title
    delete_circle_room(db, circle_id)
    write_audit_log(
        db,
        admin,
        action="delete_circle",
        resource_type="circle",
        resource_id=circle_id,
        details={"title": title},
    )
    db.commit()
    return {"deleted": True, "id": circle_id}


@router.post("/circles/batch-delete")
def batch_delete_admin_circles(payload: BatchDeleteRequest, admin: AdminUser, db: DBSession) -> dict:
    deleted = 0
    titles: list[str] = []
    for circle_id in payload.ids:
        circle = db.get(CircleRoom, circle_id)
        if circle:
            delete_circle_room(db, circle_id)
            deleted += 1
            titles.append(circle.title)
    write_audit_log(
        db,
        admin,
        action="batch_delete_circles",
        resource_type="circle",
        resource_id=",".join(payload.ids[:5]),
        details={"count": deleted, "titles": titles[:10]},
    )
    db.commit()
    return {"deleted": deleted}


@router.get("/voice/sessions")
def list_admin_voice_sessions(_: AdminUser, db: DBSession, limit: int = 100) -> dict:
    """Real-time voice sessions — both stored VoiceSession rows and the
    realtime WebSocket session logs, merged into one chronological list."""
    limit = max(1, min(limit, 300))
    rows: list[dict] = []

    for s in db.scalars(
        select(VoiceSession).order_by(VoiceSession.created_at.desc()).limit(limit)
    ):
        user = db.get(User, s.user_id) if s.user_id else None
        rows.append({
            "id": s.id,
            "kind": "session",
            "user_id": s.user_id,
            "username": user.username if user else "?",
            "provider": s.provider,
            "duration_seconds": s.duration_seconds,
            "status": "completed" if s.duration_seconds else "empty",
            "has_transcript": bool(s.transcript),
            "created_at": s.created_at.isoformat(),
        })

    for r in db.scalars(
        select(RealtimeSessionLog).order_by(RealtimeSessionLog.created_at.desc()).limit(limit)
    ):
        user = db.get(User, r.user_id) if r.user_id else None
        rows.append({
            "id": r.id,
            "kind": "realtime",
            "user_id": r.user_id,
            "username": user.username if user else "?",
            "provider": r.provider,
            "duration_seconds": getattr(r, "duration_seconds", 0),
            "status": getattr(r, "status", ""),
            "created_at": r.created_at.isoformat(),
        })

    rows.sort(key=lambda x: x["created_at"], reverse=True)
    return {"items": rows[:limit], "total": len(rows)}
