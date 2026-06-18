import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.session import SessionLocal
from app.services.llm import get_llm_provider
from app.services.runtime_config import resolve_default_llm_provider
from app.services.user_profile_analysis import analyze_user_for_matching, users_due_for_analysis

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
    scheduler.add_job(run_match_radar_analysis, "cron", day_of_week="sun", hour=2, minute=0)
    scheduler.start()
    logger.info("APScheduler started (daily 03:00 + weekly Sun 02:00 user analysis).")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
