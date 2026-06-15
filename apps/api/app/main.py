from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.router import api_router
from app.core.config import get_cors_origins, get_settings
from app.core.logging import ErrorHandlingMiddleware, RequestLoggerMiddleware, setup_logging
from app.core.rate_limit import RateLimitMiddleware
from app.core.security import decrypt_api_key, encrypt_api_key, hash_password
from app.db.session import Base, SessionLocal, engine
from app.models import AIProvider, AppSettings, AuthSettings, MembershipPlan, PromptTemplate, User, UserProfile
from app.services.demo_user import sync_demo_user_from_settings
from app.services.seed_aliyun import seed_aliyun_providers
from app.tasks.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    setup_logging()
    # Production should use `alembic upgrade head` instead of create_all().
    # Kept here as a fallback so the app can still start without running migrations.
    Base.metadata.create_all(bind=engine)
    seed_defaults()
    start_scheduler()
    logger.info("AinerSpeak API started")
    yield
    stop_scheduler()
    logger.info("AinerSpeak API shutting down")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="AI Expression OS backend for AinerSpeak.",
        lifespan=lifespan,
    )

    app.add_middleware(ErrorHandlingMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestLoggerMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "ainerspeak-api"}

    return app


def seed_defaults() -> None:
    settings = get_settings()
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.email == settings.initial_admin_email))
        if not admin:
            try:
                admin = User(
                    email=settings.initial_admin_email,
                    username="AinerSpeak Admin",
                    password_hash=hash_password(settings.initial_admin_password),
                    role="super_admin",
                    membership_level="premium",
                )
                db.add(admin)
                db.flush()
                db.add(UserProfile(user_id=admin.id))
                logger.info("Seeded admin account: {}", settings.initial_admin_email)
            except IntegrityError:
                db.rollback()
                admin = db.scalar(select(User).where(User.email == settings.initial_admin_email))

        logger.info("Skipping mock provider seed — use Global API Keys + Provider panel instead")

        prompt_count = db.scalar(select(PromptTemplate).limit(1))
        if not prompt_count:
            db.add_all(
                [
                    PromptTemplate(
                        name="思想对话",
                        task_type="thought_dialogue",
                        version="v1.0",
                        content=(
                            "Act as a Socratic AI expression coach. Understand the user's thought, "
                            "ask one challenging question, and provide bilingual expression variants."
                        ),
                    ),
                    PromptTemplate(
                        name="纠错分析",
                        task_type="grammar_analysis",
                        version="v1.0",
                        content=(
                            "Analyze grammar, vocabulary, naturalness, and decide which patterns "
                            "should enter the personal review queue."
                        ),
                    ),
                    PromptTemplate(
                        name="Thought Freeze",
                        task_type="thought_freeze",
                        version="v1.0",
                        content=(
                            "Turn a conversation into reusable expression assets with native, basic, "
                            "spoken, advanced, written, interview, and vlog variants."
                        ),
                    ),
                    PromptTemplate(
                        name="消消乐生成",
                        task_type="review_queue",
                        version="v1.0",
                        content=(
                            "Generate high-value grammar, pattern, and vocabulary review items from "
                            "the user's real expression history."
                        ),
                    ),
                    PromptTemplate(
                        name="魔鬼代言人模式",
                        task_type="thought_dialogue_devils_advocate",
                        version="v1.0",
                        content=(
                            "You are a Devil's Advocate AI coach. Your role is to deliberately challenge "
                            "the user's position by taking the opposite side. For every claim the user makes, "
                            "present a strong counterargument, question their assumptions, and push them to "
                            "defend their reasoning with evidence and logic.\n\n"
                            "Rules:\n"
                            "- Always present the strongest version of the opposing view\n"
                            "- Ask probing questions that expose weak points in the user's argument\n"
                            "- Never agree too easily — make the user work for their position\n"
                            "- After 3-4 exchanges, acknowledge valid points and help synthesize a stronger stance\n"
                            "- Provide bilingual expression variants for both the user's position and counterarguments"
                        ),
                    ),
                    PromptTemplate(
                        name="信息收集模式",
                        task_type="thought_dialogue_information_collector",
                        version="v1.0",
                        content=(
                            "You are an Information Collector AI consultant. Your role is to conduct a structured "
                            "interview to help the user clarify their thinking on a topic. Ask systematic questions "
                            "to gather: background context, goals, constraints, resources, risks, timeline, and priorities.\n\n"
                            "Rules:\n"
                            "- Ask one focused question at a time\n"
                            "- Build a mental model of the user's situation across multiple turns\n"
                            "- Summarize what you've learned periodically\n"
                            "- After gathering enough info, offer a structured analysis with recommendations\n"
                            "- Help the user express their situation clearly in both native and target language"
                        ),
                    ),
                    PromptTemplate(
                        name="辩论训练模式",
                        task_type="thought_dialogue_debate_training",
                        version="v1.0",
                        content=(
                            "You are a Debate Training AI coach. Guide the user through structured multi-round debate:\n\n"
                            "Round structure:\n"
                            "1. Opening: Ask user to state their position clearly\n"
                            "2. Evidence: Challenge them to provide supporting evidence\n"
                            "3. Counter: Present the strongest opposing argument\n"
                            "4. Rebuttal: Help user craft a strong rebuttal\n"
                            "5. Synthesis: Help user integrate both sides into a nuanced final stance\n\n"
                            "Rules:\n"
                            "- Track which round you're in and announce transitions\n"
                            "- Score the user's arguments on: clarity, evidence, logic, persuasiveness\n"
                            "- Provide specific feedback on argumentation skills\n"
                            "- Generate bilingual expression variants for key debate phrases\n"
                            "- After debate ends, provide a structured summary with pro/con analysis"
                        ),
                    ),
                    PromptTemplate(
                        name="角色模拟模式",
                        task_type="thought_dialogue_role_simulation",
                        version="v1.0",
                        content=(
                            "You are a Role Simulation AI that plays specific characters to help the user practice "
                            "real-world conversations. Based on the topic, adopt one of these roles:\n\n"
                            "- Job Interviewer: Ask tough interview questions, evaluate answers professionally\n"
                            "- Client/Customer: Present needs and objections, test negotiation skills\n"
                            "- Date/Social Partner: Practice casual conversation and small talk\n"
                            "- Visa Officer: Ask formal questions, test ability to explain clearly under pressure\n"
                            "- Business Partner: Discuss deals, partnerships, and strategic decisions\n"
                            "- Teacher/Professor: Explain concepts, test understanding, give feedback\n"
                            "- Colleague: Practice workplace communication and conflict resolution\n\n"
                            "Rules:\n"
                            "- Stay in character throughout the conversation\n"
                            "- React naturally to what the user says\n"
                            "- After each exchange, briefly break character to give language feedback\n"
                            "- Provide natural expressions the user could use in this scenario\n"
                            "- Gradually increase difficulty as user improves"
                        ),
                    ),
                ]
            )
            logger.info("Seeded prompt templates")

        plan_count = db.scalar(select(MembershipPlan).limit(1))
        if not plan_count:
            db.add_all(
                [
                    MembershipPlan(
                        level="free",
                        display_name="Free",
                        daily_ai_dialogue=5,
                        daily_voice_minutes=0,
                        daily_freeze_count=1,
                        asset_limit=20,
                    ),
                    MembershipPlan(
                        level="vip",
                        display_name="VIP",
                        daily_ai_dialogue=50,
                        daily_voice_minutes=10,
                        daily_freeze_count=5,
                        asset_limit=100,
                    ),
                    MembershipPlan(
                        level="pro",
                        display_name="Pro",
                        daily_ai_dialogue=200,
                        daily_voice_minutes=30,
                        daily_freeze_count=20,
                        asset_limit=500,
                    ),
                    MembershipPlan(
                        level="premium",
                        display_name="Premium",
                        daily_ai_dialogue=500,
                        daily_voice_minutes=120,
                        daily_freeze_count=100,
                        asset_limit=2000,
                    ),
                ]
            )
            logger.info("Seeded membership plans")

        auth_settings = db.get(AuthSettings, "default")
        if not auth_settings:
            db.add(AuthSettings(id="default"))
            logger.info("Seeded auth settings")

        sync_demo_user_from_settings(db)
        seed_aliyun_providers(db, settings)
        _repair_provider_api_keys(db, settings)
        app_settings = db.get(AppSettings, "default")
        if not app_settings:
            db.add(AppSettings(id="default"))
            logger.info("Seeded app settings")
        db.commit()


def _repair_provider_api_keys(db, settings) -> None:
    """In development, store readable API keys and backfill DashScope from .env when needed."""
    if not settings.store_plaintext_api_keys:
        return
    env_key = settings.dashscope_api_key.strip()
    if not env_key:
        return
    dashscope_names = {"dashscope", "dashscope-embedding", "qwen"}
    changed = False
    for provider in db.scalars(select(AIProvider)):
        if provider.provider_name in {"mock", "mock-voice"}:
            continue
        key = decrypt_api_key(provider.api_key_encrypted)
        if not key and provider.provider_name in dashscope_names:
            key = env_key
        if not key:
            continue
        plain = encrypt_api_key(key)
        if provider.api_key_encrypted != plain:
            provider.api_key_encrypted = plain
            changed = True
    if changed:
        logger.info("Repaired provider API keys for development plaintext storage")


app = create_app()
