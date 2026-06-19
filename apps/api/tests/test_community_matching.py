"""Tests for community, matching, privacy, and voice endpoints."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps import get_quota_manager
from app.main import app
from tests.test_quota import override_quota_manager, shared_quota_manager


def _register_and_login(client: TestClient, prefix: str = "community") -> str:
    email = f"{prefix}-{uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "testpass123", "username": "tester"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": "testpass123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_topics_crud() -> None:
    with TestClient(app) as client:
        token = _register_and_login(client, "topics")
        headers = _auth_headers(token)

        create = client.post(
            "/api/topics",
            json={
                "title": "远程工作更好吗？",
                "background": "疫情后远程办公成为常态",
                "pro_view": "更自由",
                "con_view": "缺乏社交",
                "tags": ["工作", "生活方式"],
            },
            headers=headers,
        )
        assert create.status_code == 201
        topic_id = create.json()["id"]

        listing = client.get("/api/topics")
        assert listing.status_code == 200
        assert any(t["id"] == topic_id for t in listing.json())

        filtered = client.get("/api/topics?tag=工作")
        assert filtered.status_code == 200
        assert len(filtered.json()) >= 1

        detail = client.get(f"/api/topics/{topic_id}")
        assert detail.status_code == 200
        assert detail.json()["title"] == "远程工作更好吗？"


def test_circles_flow() -> None:
    with TestClient(app) as client:
        token = _register_and_login(client, "circles")
        headers = _auth_headers(token)

        room = client.post(
            "/api/circles",
            json={"title": "测试讨论室", "max_members": 4},
            headers=headers,
        )
        assert room.status_code == 201
        room_id = room.json()["id"]

        join = client.post(f"/api/circles/{room_id}/join", headers=headers)
        assert join.status_code == 200

        msg = client.post(
            f"/api/circles/{room_id}/messages",
            json={"content": "我认为远程工作提高了效率", "content_language": "zh"},
            headers=headers,
        )
        assert msg.status_code == 200
        assert msg.json()["content"] == "我认为远程工作提高了效率"


def test_join_topic_discussion_shared_room() -> None:
    """Two users joining the same topic must land in one public room."""
    with TestClient(app) as client:
        token_a = _register_and_login(client, "topic_join_a")
        token_b = _register_and_login(client, "topic_join_b")
        headers_a = _auth_headers(token_a)
        headers_b = _auth_headers(token_b)

        topic = client.post(
            "/api/topics",
            json={
                "title": "AI 会取代创意工作吗？",
                "background": "生成式 AI 快速发展",
                "pro_view": "提升效率",
                "con_view": "削弱原创",
                "tags": ["AI"],
            },
            headers=headers_a,
        )
        assert topic.status_code == 201, topic.text
        topic_id = topic.json()["id"]

        room_a = client.post(
            "/api/circles/join-topic",
            json={"topic_id": topic_id},
            headers=headers_a,
        )
        assert room_a.status_code == 200, room_a.text
        room_id = room_a.json()["id"]

        room_b = client.post(
            "/api/circles/join-topic",
            json={"topic_id": topic_id},
            headers=headers_b,
        )
        assert room_b.status_code == 200, room_b.text
        assert room_b.json()["id"] == room_id
        assert len(room_b.json()["members"]) >= 2

        listing = client.get("/api/topics", headers=headers_a)
        assert listing.status_code == 200
        row = next(t for t in listing.json() if t["id"] == topic_id)
        assert row["active_room_id"] == room_id
        assert row["member_count"] >= 2


def test_circle_message_uses_chat_v2_hud(monkeypatch) -> None:
    """Circle messages should store full chat_v2 analysis shape."""
    from unittest.mock import AsyncMock, patch

    from app.schemas import ChatV2NextQuestion, ChatV2Response

    mock_v2 = ChatV2Response(
        main_expression="I believe remote work improves focus.",
        meaning_native="我认为远程工作能提高专注力。",
        variants={"natural_spoken": "I believe remote work improves focus."},
        vocabulary=["remote work", "focus"],
    )
    mock_data = {
        "user_input_translated": "I believe remote work improves focus.",
        "conversational_reply": "",
        **mock_v2.model_dump(),
    }

    mock_provider = AsyncMock()
    mock_provider.chat_v2 = AsyncMock(return_value=mock_data)

    with patch("app.services.circle_learning.require_llm_provider", return_value=mock_provider):
        with TestClient(app) as client:
            token = _register_and_login(client, "circle_v2")
            headers = _auth_headers(token)

            topic = client.post(
                "/api/topics",
                json={"title": "远程工作", "background": "test"},
                headers=headers,
            )
            topic_id = topic.json()["id"]
            room = client.post(
                "/api/circles/join-topic",
                json={"topic_id": topic_id},
                headers=headers,
            )
            room_id = room.json()["id"]

            msg = client.post(
                f"/api/circles/{room_id}/messages",
                json={"content": "我觉得远程办公更高效", "content_language": "zh"},
                headers=headers,
            )
            assert msg.status_code == 200, msg.text
            analysis = msg.json()["analysis"]
            assert analysis.get("v2") is True
            assert analysis.get("main_expression")
            assert "patterns_v2" in analysis


def test_topic_analyze_returns_tags() -> None:
    from unittest.mock import AsyncMock, patch

    mock_provider = AsyncMock()
    mock_provider.complete_json = AsyncMock(
        return_value={
            "title": "远程办公更好吗",
            "background": "疫情后远程办公成为常态。",
            "pro_view": "更灵活",
            "con_view": "协作变难",
            "suggested_tags": ["职场", "远程", "辩论"],
        }
    )

    with patch("app.services.topic_compose.require_llm_provider", return_value=mock_provider):
        with TestClient(app) as client:
            token = _register_and_login(client, "topic_analyze")
            headers = _auth_headers(token)
            resp = client.post(
                "/api/topics/analyze",
                json={"title": "远程办公更好吗"},
                headers=headers,
            )
            assert resp.status_code == 200, resp.text
            body = resp.json()
            assert body["title"]
            assert "远程" in body["suggested_tags"] or len(body["suggested_tags"]) >= 1


def test_matching_enable_and_recommendations() -> None:
    with TestClient(app) as client:
        token_a = _register_and_login(client, "match_a")
        token_b = _register_and_login(client, "match_b")

        client.put(
            "/api/connect/profile",
            json={"bio": "爱学习", "interests": ["科技", "哲学"], "target_languages": ["en"]},
            headers=_auth_headers(token_a),
        )
        client.put(
            "/api/connect/profile",
            json={"bio": "爱表达", "interests": ["科技", "旅行"], "target_languages": ["en"]},
            headers=_auth_headers(token_b),
        )

        enable = client.post(
            "/api/connect/enable",
            json={"enabled": True, "match_mode": "language_partner"},
            headers=_auth_headers(token_a),
        )
        assert enable.status_code == 200
        assert enable.json()["enabled"] is True

        recs = client.get("/api/connect/recommendations", headers=_auth_headers(token_a))
        assert recs.status_code == 200


def test_free_user_match_card_quota() -> None:
    shared_quota_manager.reset()
    app.dependency_overrides[get_quota_manager] = override_quota_manager

    with TestClient(app) as client:
        token_a = _register_and_login(client, "match_quota_a")
        token_b = _register_and_login(client, "match_quota_b")
        headers_a = _auth_headers(token_a)

        client.put(
            "/api/connect/profile",
            json={"bio": "test", "interests": ["tech"], "target_languages": ["en"]},
            headers=headers_a,
        )
        client.put(
            "/api/connect/profile",
            json={"bio": "test2", "interests": ["tech"], "target_languages": ["en"]},
            headers=_auth_headers(token_b),
        )
        client.post(
            "/api/connect/enable",
            json={"enabled": True, "match_mode": "language_partner"},
            headers=headers_a,
        )

        quota = client.get("/api/connect/quota", headers=headers_a)
        assert quota.status_code == 200
        assert quota.json()["daily_match_cards"] == 1
        assert quota.json()["match_batch_size"] == 1

        first = client.get("/api/connect/recommendations", headers=headers_a)
        assert first.status_code == 200
        assert len(first.json()) <= 1

        exhausted = client.get("/api/connect/recommendations", headers=headers_a)
        assert exhausted.status_code == 429

    app.dependency_overrides.clear()


def test_soulmate_readiness() -> None:
    with TestClient(app) as client:
        token = _register_and_login(client, "soulmate")
        headers = _auth_headers(token)

        readiness = client.get("/api/connect/readiness", headers=headers)
        assert readiness.status_code == 200
        data = readiness.json()
        assert "completeness" in data
        assert "soulmate_ready" in data

        enable = client.post(
            "/api/connect/enable",
            json={"enabled": True, "match_mode": "soulmate"},
            headers=headers,
        )
        assert enable.status_code == 400


def test_privacy_settings() -> None:
    with TestClient(app) as client:
        token = _register_and_login(client, "privacy")
        headers = _auth_headers(token)

        settings = client.get("/api/privacy/settings", headers=headers)
        assert settings.status_code == 200

        updated = client.put(
            "/api/privacy/settings",
            json={"match_profile_visible": False, "public_scope": "private"},
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["match_profile_visible"] is False


def test_reports_and_block() -> None:
    with TestClient(app) as client:
        token = _register_and_login(client, "reports")
        headers = _auth_headers(token)

        report = client.post(
            "/api/reports",
            json={
                "target_type": "user",
                "target_id": "fake-user-id",
                "reason": "spam",
                "description": "测试举报",
            },
            headers=headers,
        )
        assert report.status_code == 201

        block = client.post("/api/reports/block/fake-user-id", headers=headers)
        assert block.status_code == 200


def test_grammar_language_filter() -> None:
    with TestClient(app) as client:
        token = _register_and_login(client, "grammar_lang")
        headers = _auth_headers(token)

        queue = client.get("/api/grammar/queue?language_code=en", headers=headers)
        assert queue.status_code == 200

        patterns = client.get("/api/grammar/patterns?language_code=en")
        assert patterns.status_code == 200


def test_target_language_switch() -> None:
    with TestClient(app) as client:
        token = _register_and_login(client, "lang_switch")
        headers = _auth_headers(token)

        conv = client.post(
            "/api/conversations",
            json={"title": "语言切换测试", "target_language": "en"},
            headers=headers,
        )
        assert conv.status_code == 200
        conv_id = conv.json()["id"]

        switch = client.patch(
            f"/api/conversations/{conv_id}/target-language",
            json={"target_language": "ja"},
            headers=headers,
        )
        assert switch.status_code == 200
        assert switch.json()["target_language"] == "ja"


def test_realtime_session() -> None:
    with TestClient(app) as client:
        resp = client.post(
            "/api/voice/realtime/session",
            json={"mode": "realtime", "target_language": "en"},
        )
        assert resp.status_code == 200
        assert "provider" in resp.json()
