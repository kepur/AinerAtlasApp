from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, desc, func

from app.api.deps import CurrentUser, DBSession
from app.models import CircleMember, CircleRoom, ModerationEvent, Thought, Topic, TopicRecommendation, TopicVersion, UserProfile, utc_now
from app.schemas import TopicAnalyzeRequest, TopicCreate, TopicDraftRead, TopicForkCreate, TopicRead, TopicRecommendationRead, TopicVersionRead
from app.services.moderation import moderate_text
from app.services.topic_compose import analyze_topic_fields, draft_topic_from_thought

router = APIRouter(prefix="/topics", tags=["topics"])

_TOPIC_OPEN_STATUSES = {"active", "published", "open"}


def _discussion_stats_for_topics(db: DBSession, topic_ids: list[str]) -> dict[str, dict[str, int | str]]:
    if not topic_ids:
        return {}
    rooms = list(
        db.scalars(
            select(CircleRoom)
            .where(CircleRoom.topic_id.in_(topic_ids), CircleRoom.status == "active")
            .order_by(CircleRoom.created_at.asc())
        )
    )
    room_by_topic: dict[str, CircleRoom] = {}
    for room in rooms:
        if room.topic_id and room.topic_id not in room_by_topic:
            room_by_topic[room.topic_id] = room

    stats: dict[str, dict[str, int | str]] = {}
    for topic_id, room in room_by_topic.items():
        member_count = db.scalar(
            select(func.count())
            .select_from(CircleMember)
            .where(CircleMember.room_id == room.id)
        )
        stats[topic_id] = {"room_id": room.id, "member_count": int(member_count or 0)}
    return stats


def _topic_to_read(topic: Topic, stats: dict[str, dict[str, int | str]] | None = None) -> TopicRead:
    read = TopicRead.model_validate(topic)
    if stats and topic.id in stats:
        read.active_room_id = str(stats[topic.id]["room_id"])
        read.member_count = int(stats[topic.id]["member_count"])
    return read


@router.post("", response_model=TopicRead, status_code=201)
def create_topic(
    payload: TopicCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> Topic:
    mod = moderate_text(payload.title + " " + payload.background, "topic")
    if mod["flagged"]:
        db.add(
            ModerationEvent(
                user_id=current_user.id,
                content_type="topic",
                content_id="pending",
                action=mod["action"],
                reason=mod["reason"],
                details=mod["details"],
            )
        )

    topic = Topic(
        creator_id=current_user.id,
        thought_id=payload.thought_id,
        title=payload.title.strip(),
        background=payload.background.strip(),
        pro_view=payload.pro_view.strip(),
        con_view=payload.con_view.strip(),
        tags=payload.tags[:6],
        status="published",
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return _topic_to_read(topic)


@router.post("/analyze", response_model=TopicDraftRead)
async def analyze_topic(
    payload: TopicAnalyzeRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> TopicDraftRead:
    draft = await analyze_topic_fields(
        db,
        title=payload.title,
        background=payload.background,
        pro_view=payload.pro_view,
        con_view=payload.con_view,
    )
    return TopicDraftRead.model_validate(draft)


@router.get("/from-thought/{thought_id}/draft", response_model=TopicDraftRead)
async def topic_draft_from_thought(
    thought_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> TopicDraftRead:
    thought = db.scalar(
        select(Thought).where(Thought.id == thought_id, Thought.user_id == current_user.id)
    )
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")
    if thought.status not in {"frozen", "draft", "published"}:
        raise HTTPException(status_code=400, detail="Only frozen thoughts can be published as topics")
    draft = await draft_topic_from_thought(db, thought)
    return TopicDraftRead.model_validate(draft)


@router.get("", response_model=list[TopicRead])
def list_topics(
    db: DBSession,
    tag: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, le=100),
) -> list[Topic]:
    stmt = select(Topic).order_by(Topic.created_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(Topic.status == status)
    topics = list(db.scalars(stmt))
    if tag:
        topics = [t for t in topics if tag in (t.tags or [])]
    stats = _discussion_stats_for_topics(db, [t.id for t in topics])
    return [_topic_to_read(t, stats) for t in topics]


@router.get("/trending", response_model=list[TopicRead])
def trending_topics(db: DBSession) -> list[TopicRead]:
    stmt = (
        select(Topic)
        .where(Topic.status.in_(_TOPIC_OPEN_STATUSES))
        .order_by(desc(Topic.view_count), desc(Topic.created_at))
        .limit(10)
    )
    topics = list(db.scalars(stmt))
    stats = _discussion_stats_for_topics(db, [t.id for t in topics])
    return [_topic_to_read(t, stats) for t in topics]


@router.get("/recommended", response_model=list[TopicRead])
def recommended_topics(
    current_user: CurrentUser,
    db: DBSession,
) -> list[TopicRead]:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    if not profile or not profile.favorite_topics:
        topics = list(
            db.scalars(
                select(Topic)
                .where(Topic.status.in_(_TOPIC_OPEN_STATUSES))
                .order_by(desc(Topic.view_count))
                .limit(10)
            )
        )
        stats = _discussion_stats_for_topics(db, [t.id for t in topics])
        return [_topic_to_read(t, stats) for t in topics]

    all_topics = list(
        db.scalars(
            select(Topic)
            .where(Topic.status.in_(_TOPIC_OPEN_STATUSES))
            .order_by(desc(Topic.created_at))
            .limit(100)
        )
    )
    scored: list[tuple[float, Topic]] = []
    for topic in all_topics:
        overlap = len(set(profile.favorite_topics) & set(topic.tags or []))
        score = overlap + topic.view_count * 0.01
        if overlap > 0:
            scored.append((score, topic))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = [t for _, t in scored[:10]]

    for s, topic in scored[:10]:
        existing = db.scalar(
            select(TopicRecommendation).where(
                TopicRecommendation.user_id == current_user.id,
                TopicRecommendation.topic_id == topic.id,
            )
        )
        if not existing:
            db.add(TopicRecommendation(
                user_id=current_user.id,
                topic_id=topic.id,
                reason="topic_tag_match",
                score=s,
            ))

    db.commit()
    stats = _discussion_stats_for_topics(db, [t.id for t in results])
    return [_topic_to_read(t, stats) for t in results]


@router.get("/{topic_id}", response_model=TopicRead)
def get_topic(topic_id: str, db: DBSession) -> TopicRead:
    topic = db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    topic.view_count += 1
    db.commit()
    db.refresh(topic)
    stats = _discussion_stats_for_topics(db, [topic.id])
    return _topic_to_read(topic, stats)


@router.post("/{topic_id}/fork", response_model=TopicRead, status_code=201)
def fork_topic(
    topic_id: str,
    payload: TopicForkCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> Topic:
    original = db.get(Topic, topic_id)
    if not original:
        raise HTTPException(status_code=404, detail="Topic not found")

    forked = Topic(
        creator_id=current_user.id,
        thought_id=original.thought_id,
        parent_topic_id=topic_id,
        title=payload.title,
        background=payload.background or original.background,
        pro_view=payload.pro_view or original.pro_view,
        con_view=payload.con_view or original.con_view,
        tags=original.tags,
    )
    db.add(forked)
    db.flush()

    latest_version = db.scalar(
        select(func.max(TopicVersion.version)).where(TopicVersion.topic_id == topic_id)
    )
    new_version_num = (latest_version or 0) + 1
    db.add(TopicVersion(
        topic_id=topic_id,
        version=new_version_num,
        title=payload.title,
        background=payload.background or original.background,
        pro_view=payload.pro_view or original.pro_view,
        con_view=payload.con_view or original.con_view,
        creator_user_id=current_user.id,
        parent_topic_id=topic_id,
    ))

    db.commit()
    db.refresh(forked)
    return _topic_to_read(forked)


@router.get("/{topic_id}/versions", response_model=list[TopicVersionRead])
def get_topic_versions(topic_id: str, db: DBSession) -> list[TopicVersion]:
    topic = db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return list(
        db.scalars(
            select(TopicVersion)
            .where(TopicVersion.topic_id == topic_id)
            .order_by(TopicVersion.version.desc())
        )
    )


@router.get("/recommended/daily")
def get_daily_topics(db: DBSession) -> list[dict]:
    from app.services.topic_recommender import generate_daily_topics
    return generate_daily_topics(db)


@router.get("/recommended/for-me")
def get_recommended_for_me(current_user: CurrentUser, db: DBSession) -> list[dict]:
    from app.services.topic_recommender import recommend_for_user
    return recommend_for_user(db, current_user.id)


@router.get("/recommended/trending")
def get_trending(db: DBSession) -> list[dict]:
    topics = list(
        db.scalars(
            select(Topic)
            .where(Topic.status.in_(_TOPIC_OPEN_STATUSES))
            .order_by(Topic.created_at.desc())
            .limit(10)
        )
    )
    return [
        {
            "id": t.id,
            "title": t.title,
            "tags": t.tags,
            "category": t.category or "general",
            "heat": t.heat or "0",
        }
        for t in topics
    ]


@router.post("/auto-discover")
def trigger_auto_discover(
    current_user: CurrentUser,
    db: DBSession,
    threshold: int = 5,
) -> dict:
    from app.services.topic_recommender import auto_discover_topic
    topic = auto_discover_topic(db, threshold)
    if topic:
        db.commit()
        return {"discovered": True, "title": topic.title, "id": topic.id}
    return {"discovered": False, "reason": "No topic met the conversation threshold"}
