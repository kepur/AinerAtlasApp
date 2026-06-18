"""Tests for admin match radar service and endpoints."""

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.models import MatchAnalysisReport, MatchRecommendation, User, UserMatchProfile, UserProfile
from app.services.admin_match_service import admin_one_click_match, extract_ai_tags


def _admin_token(client: TestClient) -> str:
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _create_user(db: Session, prefix: str) -> User:
    user = User(
        email=f"{prefix}-{uuid4().hex[:8]}@test.com",
        username=f"{prefix}",
        password_hash="x",
        status="active",
    )
    db.add(user)
    db.flush()
    db.add(
        UserProfile(
            user_id=user.id,
            favorite_topics=["科技", "旅行"],
        )
    )
    db.add(
        UserMatchProfile(
            user_id=user.id,
            bio=f"{prefix} bio",
            interests=["科技", "哲学"],
            tags=["理性", "深度对话"],
        )
    )
    return user


def test_extract_ai_tags_from_report() -> None:
    with SessionLocal() as db:
        user = _create_user(db, "tags")
        db.add(
            MatchAnalysisReport(
                user_id=user.id,
                report_type="manual",
                summary="测试摘要",
                match_score=80,
                details={
                    "personality_type": "理性探索者",
                    "mbti": "INTJ",
                    "age_group": "25-34",
                    "hobbies": ["阅读", "摄影"],
                    "match_tags": ["跨文化", "深度对话"],
                },
            )
        )
        db.commit()

        tags = extract_ai_tags(db, user.id)
        assert tags["mbti"] == "INTJ"
        assert tags["age_group"] == "25-34"
        assert "阅读" in tags["hobbies"]
        assert tags["has_analysis"] is True


def test_admin_one_click_match_random_and_history() -> None:
    with SessionLocal() as db:
        user_a = _create_user(db, "match_a")
        _create_user(db, "match_b")
        _create_user(db, "match_c")
        db.commit()

        result = admin_one_click_match(db, user_a.id, min_score=0)
        assert result["matched"] is True
        db.commit()

        rows = list(
            db.scalars(select(MatchRecommendation).where(MatchRecommendation.user_id == user_a.id))
        )
        assert len(rows) == 1
        assert rows[0].status == "admin_matched"

        first_target = result["target_user_id"]
        result2 = admin_one_click_match(db, user_a.id, min_score=0)
        assert result2["matched"] is True
        assert result2["target_user_id"] != first_target


def test_match_radar_list_includes_ai_tags() -> None:
    with TestClient(app) as client:
        token = _admin_token(client)
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get("/api/admin/match-radar/users", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        if data:
            assert "ai_tags" in data[0]
            assert "match_history" in data[0]
