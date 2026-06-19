from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.api.router import api_router
from app.core.config import get_cors_origins, get_settings
from app.core.logging import ErrorHandlingMiddleware, RequestLoggerMiddleware, setup_logging
from app.core.rate_limit import RateLimitMiddleware
from app.core.security import decrypt_api_key, encrypt_api_key, hash_password
from app.db.session import Base, SessionLocal, engine
from app.models import AIProvider, AppSettings, AuthSettings, GameTemplate, MembershipPlan, PromptTemplate, User, UserProfile
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

    uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    (uploads_dir / "avatars").mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "ainerspeak-api"}

    return app


def _disable_legacy_membership_plans(db) -> None:
    """Hide retired tiers (premium/business) — product now uses free + vip + pro only."""
    for legacy in ("premium", "business", "super_vip"):
        plan = db.scalar(select(MembershipPlan).where(MembershipPlan.level == legacy))
        if plan and plan.enabled:
            plan.enabled = False
            logger.info("Disabled legacy membership plan: {}", legacy)


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
                    membership_level="pro",
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
                        daily_match_cards=1,
                        match_batch_size=1,
                    ),
                    MembershipPlan(
                        level="vip",
                        display_name="VIP",
                        daily_ai_dialogue=50,
                        daily_voice_minutes=10,
                        daily_freeze_count=5,
                        asset_limit=100,
                        daily_match_cards=3,
                        match_batch_size=3,
                    ),
                    MembershipPlan(
                        level="pro",
                        display_name="Pro",
                        daily_ai_dialogue=200,
                        daily_voice_minutes=30,
                        daily_freeze_count=20,
                        asset_limit=500,
                        daily_match_cards=5,
                        match_batch_size=5,
                    ),
                ]
            )
            logger.info("Seeded membership plans")

        _disable_legacy_membership_plans(db)

        auth_settings = db.get(AuthSettings, "default")
        if not auth_settings:
            db.add(AuthSettings(id="default"))
            logger.info("Seeded auth settings")

        sync_demo_user_from_settings(db)
        seed_aliyun_providers(db, settings)
        _repair_provider_api_keys(db, settings)
        _repair_conversation_schema(db)
        _repair_conversation_activity_schema(db)
        _repair_user_profile_schema(db)
        _repair_app_settings_schema(db)
        app_settings = db.get(AppSettings, "default")
        if not app_settings:
            db.add(AppSettings(id="default"))
            logger.info("Seeded app settings")
        else:
            from app.services.languages import DEFAULT_ENABLED_LOCALES, filter_enabled_locales

            current = filter_enabled_locales(app_settings.enabled_locales)
            if set(DEFAULT_ENABLED_LOCALES) - set(current):
                app_settings.enabled_locales = list(DEFAULT_ENABLED_LOCALES)
                logger.info("Upgraded app_settings.enabled_locales to %s", DEFAULT_ENABLED_LOCALES)

        _seed_game_templates(db)
        _seed_romance_templates_if_missing(db)
        try:
            from app.services.game_assets import seed_assets
            n = seed_assets(db)
            if n:
                logger.info(f"Seeded {n} game assets")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Game asset seed skipped: {exc}")
        try:
            from app.services.game_prompts import seed_game_prompts
            n = seed_game_prompts(db)
            if n:
                logger.info(f"Seeded {n} game prompt slots")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Game prompt seed skipped: {exc}")
        db.commit()


def _seed_game_templates(db) -> None:
    existing = db.scalar(select(GameTemplate).limit(1))
    if existing:
        return
    templates = [
        GameTemplate(
            slug="passenger", game_type="turtle_soup",
            title="消失的乘客", subtitle="海龟汤 · Situation Puzzle",
            description="一名男子上了火车，在旅途中神秘消失。没人看到他下车。发生了什么？",
            difficulty="B1", estimated_minutes=10,
            learning_focus=["提问句", "推理表达", "过去时", "Yes/No Questions"],
            tags=["solo", "推理", "悬疑"],
            config={"case_id": "passenger"},
            sort_order=10,
        ),
        GameTemplate(
            slug="turtle_soup_classic", game_type="turtle_soup",
            title="经典海龟汤", subtitle="海龟汤 · 经典",
            description="一个男人走进餐厅，点了一碗海龟汤，喝了一口后突然崩溃自杀。为什么？",
            difficulty="B1", estimated_minutes=10,
            learning_focus=["提问句", "因果推理", "过去时"],
            tags=["solo", "推理", "经典"],
            config={"case_id": "turtle_soup_classic"},
            sort_order=11,
        ),
        GameTemplate(
            slug="qingyun", game_type="roleplay",
            title="青云重生", subtitle="仙侠 · 角色扮演",
            description="你在青云门修炼多年，一次意外让你重生回到入门之初。面对熟悉的师兄弟和未知的命运...",
            difficulty="B1", estimated_minutes=20,
            learning_focus=["情绪表达", "保持距离", "委婉拒绝", "描述感受"],
            tags=["solo", "仙侠", "角色扮演"],
            config={"story_id": "qingyun"},
            sort_order=20,
        ),
        GameTemplate(
            slug="cafe_encounter", game_type="roleplay",
            title="咖啡馆奇遇", subtitle="现代 · 日常社交",
            description="你在一家咖啡馆遇到一个有趣的陌生人。一段意想不到的对话即将展开...",
            difficulty="A2", estimated_minutes=15,
            learning_focus=["自我介绍", "提问技巧", "表达兴趣", "礼貌用语"],
            tags=["solo", "社交", "日常"],
            config={"story_id": "cafe_encounter"},
            sort_order=21,
        ),
        GameTemplate(
            slug="cafe_lie", game_type="detective",
            title="咖啡馆的谎言", subtitle="AI侦探 · 谋杀案",
            description="咖啡馆老板被杀，4名嫌疑人各有说辞。谁在说谎？",
            difficulty="B2", estimated_minutes=15,
            learning_focus=["审问技巧", "推理表达", "因果分析", "质疑句型"],
            tags=["solo", "推理", "侦探"],
            config={"case_id": "cafe_lie"},
            sort_order=30,
        ),
        GameTemplate(
            slug="werewolf_easy", game_type="social_logic",
            title="狼人杀 Lite", subtitle="阵营推理 · 社交推理",
            description="天黑请闭眼...体验完整的狼人杀对决流程。",
            difficulty="B2", estimated_minutes=12,
            learning_focus=["辩论表达", "质疑句型", "逻辑推理", "社交用语"],
            tags=["solo", "推理", "社交"],
            config={"difficulty": "easy"},
            sort_order=40,
        ),
    ]
    db.add_all(templates)
    logger.info("Seeded {} game templates", len(templates))


def _seed_romance_templates_if_missing(db) -> None:
    """Ensure romance character templates exist even in older databases."""
    romance_exists = db.scalar(select(GameTemplate).where(GameTemplate.game_type == "romance").limit(1))
    if romance_exists:
        return
    romance_templates = [
        GameTemplate(
            slug="romance-mia", game_type="romance",
            title="Mia", subtitle="恋爱社交",
            description="咖啡店常客，适合轻松开场与表达好感。",
            cover_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300",
            difficulty="B1", estimated_minutes=12,
            tags=["恋爱社交", "轻松", "B1-B2"],
            config={
                "target_id": "mia",
                "name": "Mia",
                "name_en": "Mia",
                "age": 25,
                "role": "咖啡店常客",
                "gender": "female",
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300",
                "category": "恋爱社交",
                "personality": "轻松外向，说话温柔，喜欢旅行和摄影，容易害羞",
                "chat_style": "温柔自然、偏口语化，鼓励用户多表达感受",
                "identity_background": "自由摄影师，常在咖啡店工作。",
                "initial_scene": "咖啡店初次见面，你发现她正坐在窗边看书...",
                "prompt_override": "",
                "tags": ["恋爱社交", "轻松", "B1-B2"],
            },
            sort_order=16,
        ),
        GameTemplate(
            slug="biz-leo", game_type="romance",
            title="Leo", subtitle="商务谈判",
            description="欧洲客户，适合价值解释、反驳与让步表达训练。",
            cover_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300&h=300",
            difficulty="B2", estimated_minutes=15,
            tags=["商务谈判", "正式", "B2-C1"],
            config={
                "target_id": "leo",
                "name": "Leo",
                "name_en": "Leo",
                "age": 32,
                "role": "欧洲客户",
                "gender": "male",
                "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300&h=300",
                "category": "商务谈判",
                "personality": "直接、谨慎、喜欢砍价，但私下里幽默且体贴",
                "chat_style": "正式、结构化、结果导向",
                "identity_background": "跨境采购负责人，关注ROI与风险。",
                "initial_scene": "项目商务谈判后的酒会，你们在吧台碰面...",
                "prompt_override": "",
                "tags": ["商务谈判", "正式", "B2-C1"],
            },
            sort_order=17,
        ),
        GameTemplate(
            slug="immigration-amy", game_type="romance",
            title="Amy", subtitle="移民生活",
            description="移民顾问同伴，适合材料、租房、求职等生活对话。",
            cover_url="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=300&h=300",
            difficulty="B1", estimated_minutes=12,
            tags=["移民生活", "实用", "B1-B2"],
            config={
                "target_id": "amy",
                "name": "Amy",
                "name_en": "Amy",
                "age": 28,
                "role": "移民顾问同伴",
                "gender": "female",
                "avatar_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=300&h=300",
                "category": "移民生活",
                "personality": "理性耐心，擅长解释流程，也会照顾对方情绪",
                "chat_style": "分步骤说明，强调可执行建议",
                "identity_background": "刚完成技术移民申请，熟悉初到当地的生活流程。",
                "initial_scene": "社区中心的新移民分享会后，你们继续交流经验...",
                "prompt_override": "",
                "tags": ["移民生活", "实用", "B1-B2"],
            },
            sort_order=18,
        ),
        GameTemplate(
            slug="campus-junior-sister", game_type="romance",
            title="小师妹", subtitle="旅游出差",
            description="久别重逢场景，适合情绪表达和关系边界训练。",
            cover_url="https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=300&h=300",
            difficulty="B1", estimated_minutes=12,
            tags=["旅游出差", "情感", "B1"],
            config={
                "target_id": "junior_sister",
                "name": "小师妹",
                "name_en": "Junior Sister",
                "age": 19,
                "role": "青云宗弟子",
                "gender": "female",
                "avatar_url": "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=300&h=300",
                "category": "旅游出差",
                "personality": "温柔、善良、试探心意，一直暗恋你",
                "chat_style": "含蓄细腻，偏古风情绪表达",
                "identity_background": "青云宗内门弟子，与你有旧日同门羁绊。",
                "initial_scene": "后山重逢，你离开宗门多年后第一次回来...",
                "prompt_override": "",
                "tags": ["旅游出差", "情感", "B1"],
            },
            sort_order=19,
        ),
    ]
    db.add_all(romance_templates)
    logger.info("Seeded {} romance templates", len(romance_templates))


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


def _repair_conversation_schema(db) -> None:
    """Ensure conversation moderation/soft-delete columns exist (PostgreSQL dev safety)."""
    if db.bind is None or db.bind.dialect.name != "postgresql":
        return
    db.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ"))
    db.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(40) NOT NULL DEFAULT ''"))
    db.execute(
        text(
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS moderation_status "
            "VARCHAR(40) NOT NULL DEFAULT 'clean'"
        )
    )
    db.execute(
        text(
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS moderation_reason "
            "VARCHAR(512) NOT NULL DEFAULT ''"
        )
    )
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_deleted_at ON conversations (deleted_at)"))
    db.execute(
        text("CREATE INDEX IF NOT EXISTS ix_conversations_moderation_status ON conversations (moderation_status)")
    )


def _repair_conversation_activity_schema(db) -> None:
    if db.bind is None or db.bind.dialect.name != "postgresql":
        return
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS conversation_activity_logs (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES users(id),
                conversation_id VARCHAR(36) NOT NULL,
                message_id VARCHAR(36),
                action VARCHAR(60) NOT NULL,
                details JSON NOT NULL DEFAULT '{}',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    db.execute(
        text("CREATE INDEX IF NOT EXISTS ix_conversation_activity_logs_conversation_id ON conversation_activity_logs (conversation_id)")
    )
    db.execute(
        text("CREATE INDEX IF NOT EXISTS ix_conversation_activity_logs_user_id ON conversation_activity_logs (user_id)")
    )
    db.execute(
        text("CREATE INDEX IF NOT EXISTS ix_conversation_activity_logs_action ON conversation_activity_logs (action)")
    )


def _repair_user_profile_schema(db) -> None:
    if db.bind is None or db.bind.dialect.name != "postgresql":
        return
    db.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS birthday DATE"))
    db.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NOT NULL DEFAULT ''"))
    db.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender_identity VARCHAR(40) NOT NULL DEFAULT ''"))
    db.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender_custom VARCHAR(120) NOT NULL DEFAULT ''"))
    db.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sexual_orientation VARCHAR(40) NOT NULL DEFAULT ''"))
    db.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS orientation_custom VARCHAR(120) NOT NULL DEFAULT ''"))
    db.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS lgbtq_visible BOOLEAN NOT NULL DEFAULT FALSE"))


def _repair_app_settings_schema(db) -> None:
    """Ensure app_settings routing column exists."""
    bind = db.bind
    if bind is None:
        return
    from sqlalchemy import inspect
    inspector = inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("app_settings")]
    if "llm_routing" not in columns:
        try:
            if bind.dialect.name == "postgresql":
                db.execute(text("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS llm_routing JSONB DEFAULT '{}'"))
            else:
                db.execute(text("ALTER TABLE app_settings ADD COLUMN llm_routing JSON DEFAULT '{}'"))
            db.commit()
            logger.info("Successfully added llm_routing column to app_settings table")
        except Exception as e:
            logger.error("Failed to add llm_routing column to app_settings: {}", e)


app = create_app()
