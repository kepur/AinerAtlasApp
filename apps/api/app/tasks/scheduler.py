import logging
import asyncio
from datetime import datetime, UTC
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import SessionLocal
from app.models import User, UserMatchProfile, MatchAnalysisReport, Conversation, Topic
from app.services.llm import get_llm_provider

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def run_match_radar_analysis():
    """Runs a weekly/monthly match radar analysis for all active users with a MatchProfile."""
    logger.info("Starting scheduled match radar analysis...")
    
    with SessionLocal() as db:
        users = db.scalars(
            select(User)
            .join(UserMatchProfile, User.id == UserMatchProfile.user_id)
            .where(User.status == "active")
        ).all()
        
        provider = get_llm_provider(db)
        
        for user in users:
            try:
                # Collect user data for LLM
                match_profile = db.scalar(select(UserMatchProfile).where(UserMatchProfile.user_id == user.id))
                
                # Collect conversations (last 10)
                conversations = db.scalars(
                    select(Conversation)
                    .options(selectinload(Conversation.messages))
                    .where(Conversation.user_id == user.id)
                    .order_by(Conversation.updated_at.desc())
                    .limit(10)
                ).all()
                
                # Collect topics (last 10)
                topics = db.scalars(
                    select(Topic)
                    .where(Topic.creator_id == user.id)
                    .order_by(Topic.created_at.desc())
                    .limit(10)
                ).all()
                
                user_data = f"User Bio: {match_profile.bio}\nInterests: {match_profile.interests}\n"
                user_data += "Recent Topics:\n"
                for t in topics:
                    user_data += f"- {t.title}: {t.pro_view} / {t.con_view}\n"
                
                user_data += "Recent Conversation Summary:\n"
                for c in conversations:
                    user_data += f"- {c.title} (Mode: {c.mode})\n"
                
                system_prompt = (
                    "You are an expert AI Matchmaker. Analyze the user's data (bio, topics, conversations). "
                    "Output a comprehensive analysis of the user's personality, communication style, and dating/friendship preferences. "
                    "You must output JSON exactly in this format: "
                    '{"summary": "A 2-paragraph summary", "match_score": 85, "details": {"communication_style": "...", "preferences": "..."}}'
                )
                
                # Analyze with LLM
                analysis = await provider.analyze_user_profile(user_data)
                
                # Save report
                report = MatchAnalysisReport(
                    user_id=user.id,
                    report_type="weekly",
                    summary=analysis.get("summary", ""),
                    match_score=analysis.get("match_score", 0),
                    details=analysis.get("details", {})
                )
                db.add(report)
                db.commit()
                logger.info(f"Successfully analyzed user {user.id}")
            except Exception as e:
                db.rollback()
                logger.error(f"Error analyzing user {user.id}: {e}")
                
    logger.info("Finished scheduled match radar analysis.")

def start_scheduler():
    if not scheduler.running:
        # Schedule it to run every week on Sunday
        scheduler.add_job(run_match_radar_analysis, 'cron', day_of_week='sun', hour=2)
        scheduler.start()
        logger.info("APScheduler started.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
