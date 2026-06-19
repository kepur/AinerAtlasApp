"""API startup bootstrap — auto VAD + voice coach profiles."""

import asyncio

from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import seed_defaults
from app.models import User, UserVoiceCoachProfile
from app.services.startup_bootstrap import run_api_startup_bootstrap


def test_startup_bootstrap_generates_demo_voice_coach_profile(fresh_test_database, monkeypatch) -> None:
    seed_defaults()
    monkeypatch.setattr("app.services.startup_bootstrap._STARTUP_DELAY_SECONDS", 0.0)

    async def run() -> None:
        await run_api_startup_bootstrap()

    asyncio.run(run())

    with SessionLocal() as db:
        demo = db.scalar(select(User).where(User.email == "demo@ainerspeak.com"))
        assert demo is not None
        row = db.scalar(select(UserVoiceCoachProfile).where(UserVoiceCoachProfile.user_id == demo.id))
        assert row is not None
        assert row.opening_greeting
        assert row.user_summary
