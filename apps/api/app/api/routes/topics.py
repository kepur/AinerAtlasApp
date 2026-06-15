from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, desc, func

from app.api.deps import CurrentUser, DBSession
from app.models import ModerationEvent, Thought, Topic, TopicRecommendation, TopicVersion, UserProfile, utc_now
from app.schemas import TopicCreate, TopicForkCreate, TopicRead, TopicRecommendationRead, TopicVersionRead
from app.services.moderation import moderate_text

router = APIRouter(prefix="/topics", tags=["topics"])


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
        title=payload.title,
        background=payload.background,
        pro_view=payload.pro_view,
        con_view=payload.con_view,
        tags=payload.tags,
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


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
    return topics


@router.get("/trending", response_model=list[TopicRead])
def trending_topics(db: DBSession) -> list[Topic]:
    stmt = (
        select(Topic)
        .where(Topic.status == "active")
        .order_by(desc(Topic.view_count), desc(Topic.created_at))
        .limit(10)
    )
    return list(db.scalars(stmt))


@router.get("/recommended", response_model=list[TopicRead])
def recommended_topics(
    current_user: CurrentUser,
    db: DBSession,
) -> list[Topic]:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    if not profile or not profile.favorite_topics:
        return list(
            db.scalars(
                select(Topic)
                .where(Topic.status == "active")
                .order_by(desc(Topic.view_count))
                .limit(10)
            )
        )

    all_topics = list(
        db.scalars(
            select(Topic)
            .where(Topic.status == "active")
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
    return results


@router.get("/{topic_id}", response_model=TopicRead)
def get_topic(topic_id: str, db: DBSession) -> Topic:
    topic = db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    topic.view_count += 1
    db.commit()
    db.refresh(topic)
    return topic


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
    return forked


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
            .where(Topic.status == "published")
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
