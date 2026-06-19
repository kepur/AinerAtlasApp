import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.session import SessionLocal
from app.services.llm import get_llm_provider
from app.services.runtime_config import resolve_default_llm_provider
from app.services.user_profile_analysis import analyze_user_for_matching, users_due_for_analysis
from app.services.voice_coach_profile import analyze_user_voice_coach, users_due_for_voice_coach
from app.services.voice_platform_config import get_voice_coach_batch_settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()
VOICE_COACH_JOB_ID = "voice_coach_batch"


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


async def run_voice_coach_batch_analysis(*, source: str = "batch") -> None:
    """Batch: build per-user Voice Coach profiles (cached in DB)."""
    logger.info("Starting Voice Coach batch analysis (source=%s)...", source)
    ok = 0
    user_ids: list[str] = []
    batch: dict = {}
    with SessionLocal() as db:
        from app.services.llm import require_llm_provider
        from app.services.runtime_config import resolve_llm_provider_for_task

        batch = get_voice_coach_batch_settings(db)
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
        for user_id in user_ids:
            try:
                row = await analyze_user_voice_coach(db, user_id, provider, source=source)
                if row:
                    db.commit()
                    ok += 1
                else:
                    db.rollback()
            except Exception as exc:
                db.rollback()
                logger.error("Voice coach analysis failed for user %s: %s", user_id, exc)
    logger.info(
        "Voice Coach batch finished: %s/%s users (schedule=%s vip_only=%s)",
        ok,
        len(user_ids),
        batch["schedule"],
        batch["vip_only"],
    )


async def run_daily_voice_coach_analysis() -> None:
    """Backward-compatible alias for admin manual trigger."""
    await run_voice_coach_batch_analysis(source="manual")


async def _voice_coach_cron_job() -> None:
    with SessionLocal() as db:
        batch = get_voice_coach_batch_settings(db)
    if batch["schedule"] == "off":
        logger.info("Voice Coach cron skipped (schedule=off)")
        return
    await run_voice_coach_batch_analysis(source=batch["schedule"])


def reschedule_voice_coach_job() -> None:
    """Apply Admin voice_coach_schedule / cron settings to APScheduler."""
    if not scheduler.running:
        return
    with SessionLocal() as db:
        batch = get_voice_coach_batch_settings(db)

    if scheduler.get_job(VOICE_COACH_JOB_ID):
        scheduler.remove_job(VOICE_COACH_JOB_ID)

    if batch["schedule"] == "off":
        logger.info("Voice Coach cron disabled (schedule=off)")
        return

    trigger_kwargs: dict = {
        "hour": batch["cron_hour"],
        "minute": batch["cron_minute"],
    }
    if batch["schedule"] == "weekly":
        trigger_kwargs["day_of_week"] = batch["weekly_day"]

    scheduler.add_job(
        _voice_coach_cron_job,
        "cron",
        id=VOICE_COACH_JOB_ID,
        replace_existing=True,
        **trigger_kwargs,
    )
    logger.info(
        "Voice Coach cron scheduled: %s at %02d:%02d%s",
        batch["schedule"],
        batch["cron_hour"],
        batch["cron_minute"],
        f" ({batch['weekly_day']})" if batch["schedule"] == "weekly" else "",
    )


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
    reschedule_voice_coach_job()
    scheduler.add_job(run_match_radar_analysis, "cron", day_of_week="sun", hour=2, minute=0)
    scheduler.start()
    logger.info("APScheduler started (daily 03:00 user + configurable voice coach + weekly Sun 02:00).")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
