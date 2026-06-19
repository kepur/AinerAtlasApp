"""Voice Coach daily profile — persist, cache, and session instructions."""

from __future__ import annotations

import asyncio

import pytest
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import User, UserProfile, UserVoiceCoachProfile
from app.services.llm import MockLLMProvider
from app.services.voice_coach_profile import (
    analyze_user_voice_coach,
    build_session_coach_context,
    build_voice_coach_payload,
    get_voice_coach_profile,
    is_profile_fresh,
    profile_to_briefing,
)


@pytest.fixture
def voice_user(fresh_test_database):
    with SessionLocal() as db:
        user = User(email="voicecoach@example.com", username="voicecoach", password_hash="x")
        db.add(user)
        db.flush()
        db.add(
            UserProfile(
                user_id=user.id,
                native_language="zh",
                primary_target_language="en",
                current_level="B1",
                favorite_topics=["欧洲生活", "职业发展"],
                grammar_level_score=62,
                vocabulary_level_score=58,
                fluency_score=55,
            )
        )
        db.commit()
        user_id = user.id
    return user_id


def test_build_voice_coach_payload_includes_profile(fresh_test_database, voice_user) -> None:
    with SessionLocal() as db:
        payload = build_voice_coach_payload(db, voice_user)
        assert "欧洲生活" in payload
        assert "B1" in payload


def test_analyze_user_voice_coach_persists(fresh_test_database, voice_user) -> None:
    async def run() -> None:
        with SessionLocal() as db:
            provider = MockLLMProvider()
            row = await analyze_user_voice_coach(db, voice_user, provider, source="test")
            assert row is not None
            db.commit()
            saved = get_voice_coach_profile(db, voice_user)
            assert saved is not None
            assert saved.opening_greeting
            assert saved.session_instructions
            assert len(saved.weaknesses_to_improve) >= 1

    asyncio.run(run())


def test_build_session_coach_context_reads_db_not_llm(fresh_test_database, voice_user) -> None:
    async def run() -> None:
        with SessionLocal() as db:
            provider = MockLLMProvider()
            await analyze_user_voice_coach(db, voice_user, provider, source="test")
            db.commit()
        with SessionLocal() as db:
            ctx = build_session_coach_context(db, voice_user, mode="free", topic="voice chat")
            assert "coach_instructions" in ctx
            lowered = ctx["coach_instructions"].lower()
            assert "proactive" in lowered or "greet" in lowered or "speak first" in lowered
            assert ctx["coach_briefing"] is not None
            assert ctx["opening_greeting"]

    asyncio.run(run())


def test_profile_freshness(fresh_test_database, voice_user) -> None:
    async def run() -> None:
        with SessionLocal() as db:
            provider = MockLLMProvider()
            row = await analyze_user_voice_coach(db, voice_user, provider, source="test")
            db.commit()
            assert row is not None
            assert is_profile_fresh(row)

    asyncio.run(run())


def test_bootstrap_when_no_prior_row(fresh_test_database, voice_user) -> None:
    with SessionLocal() as db:
        ctx = build_session_coach_context(db, voice_user, mode="free", topic="voice chat")
        db.commit()
        row = db.scalar(select(UserVoiceCoachProfile).where(UserVoiceCoachProfile.user_id == voice_user))
        assert row is not None
        assert ctx["coach_briefing"]
        brief = profile_to_briefing(row)
        assert brief["opening_greeting"]
