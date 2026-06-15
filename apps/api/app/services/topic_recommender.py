from __future__ import annotations

import random

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Conversation,
    Topic,
    TopicRecommendation,
    UserProfile,
    UserXP,
)

DAILY_TOPIC_POOL = [
    {"title": "AI 会替代人类创造吗？", "tags": ["AI", "哲学", "创造"]},
    {"title": "远程办公 vs 办公室：效率之争", "tags": ["工作", "效率", "生活"]},
    {"title": "你更看重稳定还是自由？", "tags": ["人生", "价值观", "选择"]},
    {"title": "学习外语最好的方法是什么？", "tags": ["学习", "语言", "方法"]},
    {"title": "未来十年最大的机遇在哪？", "tags": ["未来", "机遇", "趋势"]},
    {"title": "社交媒体让距离更近还是更远？", "tags": ["社交", "科技", "关系"]},
    {"title": "城市还是乡村，你选哪种生活？", "tags": ["生活", "环境", "选择"]},
    {"title": "如何保持每天的学习动力？", "tags": ["学习", "成长", "习惯"]},
    {"title": "你最想改变的坏习惯是什么？", "tags": ["自我", "习惯", "改变"]},
    {"title": "环保生活方式真的有用吗？", "tags": ["环境", "生活", "责任"]},
    {"title": "早起真的能改变人生吗？", "tags": ["习惯", "效率", "生活"]},
    {"title": "钱和自由，你优先要哪个？", "tags": ["金钱", "自由", "人生"]},
    {"title": "你觉得爱与理解的界限在哪？", "tags": ["情感", "关系", "哲学"]},
    {"title": "科技越发展人越孤独？", "tags": ["科技", "心理", "社会"]},
    {"title": "旅行比读书更有价值吗？", "tags": ["旅行", "学习", "体验"]},
]


def generate_daily_topics(db: Session) -> list[dict]:
    existing_trending = list(
        db.scalars(
            select(Topic)
            .where(Topic.status == "published")
            .order_by(Topic.created_at.desc())
            .limit(5)
        )
    )

    existing_titles = {t.title for t in existing_trending}
    available_pool = [t for t in DAILY_TOPIC_POOL if t["title"] not in existing_titles]
    selected = random.sample(available_pool, min(6, len(available_pool)))

    for item in selected:
        exists = db.scalar(
            select(Topic).where(Topic.title == item["title"])
        )
        if not exists:
            topic = Topic(
                title=item["title"],
                tags=item["tags"],
                category="daily",
                status="published",
                language="zh",
                author_id=None,
            )
            db.add(topic)

    for t in existing_trending:
        if t.title not in {s["title"] for s in selected}:
            selected.append({"title": t.title, "tags": t.tags or []})

    return selected


def recommend_for_user(db: Session, user_id: str, limit: int = 6) -> list[dict]:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    user_topics = set(profile.topic_interests or []) if profile else set()
    target_lang = (profile.target_languages or ["en"])[0] if profile else "en"

    conversations = list(
        db.scalars(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(10)
        )
    )
    history_topics = {c.topic for c in conversations if c.topic}

    all_topics = list(
        db.scalars(
            select(Topic)
            .where(Topic.status == "published")
            .order_by(Topic.created_at.desc())
            .limit(30)
        )
    )

    scored = []
    for topic in all_topics:
        score = 0
        topic_tags = set(topic.tags or [])
        tag_overlap = len(user_topics & topic_tags)
        score += tag_overlap * 20
        if topic.title in history_topics:
            score -= 10
        if topic.heat:
            try:
                score += int(float(topic.heat)) // 10
            except (ValueError, TypeError):
                pass
        scored.append((score, topic))

    scored.sort(key=lambda x: x[0], reverse=True)
    recommended = [
        {
            "id": t.id,
            "title": t.title,
            "tags": t.tags,
            "category": t.category or "general",
            "language": target_lang,
            "reason": _reason_text(user_topics, set(t.tags or [])),
        }
        for score, t in scored[:limit]
    ]

    if len(recommended) < limit:
        fallback = random.sample(
            [t for t in DAILY_TOPIC_POOL if t["title"] not in {r["title"] for r in recommended}],
            min(limit - len(recommended), len(DAILY_TOPIC_POOL)),
        )
        for item in fallback:
            recommended.append({
                "id": "",
                "title": item["title"],
                "tags": item["tags"],
                "category": "daily",
                "language": target_lang,
                "reason": "每日推荐",
            })

    return recommended[:limit]


def auto_discover_topic(db: Session, threshold: int = 5) -> Topic | None:
    from sqlalchemy import func

    results = db.execute(
        select(Conversation.topic, func.count(Conversation.id).label("cnt"))
        .group_by(Conversation.topic)
        .having(func.count(Conversation.id) >= threshold)
        .order_by(func.count(Conversation.id).desc())
    ).all()

    for topic_name, count in results:
        if not topic_name or topic_name in {"free-talk", "general"}:
            continue
        exists = db.scalar(
            select(Topic).where(Topic.title == topic_name)
        )
        if not exists:
            new_topic = Topic(
                title=topic_name,
                category="discovered",
                status="published",
                heat=str(count),
                language="zh",
                tags=["自动发现"],
            )
            db.add(new_topic)
            return new_topic

    return None


def _reason_text(user_tags: set, topic_tags: set) -> str:
    overlap = user_tags & topic_tags
    if overlap:
        return f"与你的兴趣 {', '.join(list(overlap)[:3])} 相关"
    return "为你推荐"
