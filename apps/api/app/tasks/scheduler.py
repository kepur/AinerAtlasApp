import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.session import SessionLocal
from app.services.llm import get_llm_provider
from app.services.runtime_config import resolve_default_llm_provider
from app.services.user_profile_analysis import analyze_user_for_matching, users_due_for_analysis
from app.services.voice_coach_profile import analyze_user_voice_coach, users_due_for_voice_coach

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def run_daily_user_analysis() -> None:
    """Daily batch: analyze user profile + chat data for matching."""
    logger.info("Starting daily user profile analysis...")
    with SessionLocal() as db:
        provider = get_llm_provider(
            resolve_default_llm_provider(db),
            db,
            allow_mock_fallback=True,
        )
        user_ids = users_due_for_analysis(db, limit=200)
        ok = 0
        for user_id in user_ids:
            try:
                report = await analyze_user_for_matching(db, user_id, provider, report_type="daily")
                if report:
                    db.commit()
                    ok += 1
                else:
                    db.rollback()
            except Exception as exc:
                db.rollback()
                logger.error("Daily analysis failed for user %s: %s", user_id, exc)
    logger.info("Daily user analysis finished: %s/%s users", ok, len(user_ids))


async def run_daily_voice_coach_analysis() -> None:
    """Daily batch: build per-user Voice Coach profiles (cached in DB)."""
    logger.info("Starting daily Voice Coach profile analysis...")
    with SessionLocal() as db:
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
        user_ids = users_due_for_voice_coach(db, limit=300)
        ok = 0
        for user_id in user_ids:
            try:
                row = await analyze_user_voice_coach(db, user_id, provider, source="daily")
                if row:
                    db.commit()
                    ok += 1
                else:
                    db.rollback()
            except Exception as exc:
                db.rollback()
                logger.error("Voice coach analysis failed for user %s: %s", user_id, exc)
    logger.info("Daily Voice Coach analysis finished: %s/%s users", ok, len(user_ids))


async def run_match_radar_analysis() -> None:
    """Weekly deep pass — same pipeline, weekly report label."""
    logger.info("Starting weekly match radar analysis...")
    with SessionLocal() as db:
        provider = get_llm_provider(
            resolve_default_llm_provider(db),
            db,
            allow_mock_fallback=True,
        )
        user_ids = users_due_for_analysis(db, limit=500)
        ok = 0
        for user_id in user_ids:
            try:
                report = await analyze_user_for_matching(db, user_id, provider, report_type="weekly")
                if report:
                    db.commit()
                    ok += 1
                else:
                    db.rollback()
            except Exception as exc:
                db.rollback()
                logger.error("Weekly analysis failed for user %s: %s", user_id, exc)
    logger.info("Weekly match radar analysis finished: %s/%s users", ok, len(user_ids))


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(run_daily_user_analysis, "cron", hour=3, minute=0)
    scheduler.add_job(run_daily_voice_coach_analysis, "cron", hour=3, minute=30)
    scheduler.add_job(run_match_radar_analysis, "cron", day_of_week="sun", hour=2, minute=0)
    scheduler.start()
    logger.info(
        "APScheduler started (daily 03:00 user + 03:30 voice coach + weekly Sun 02:00 analysis)."
    )


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
