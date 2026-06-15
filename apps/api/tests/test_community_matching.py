"""Tests for community, matching, privacy, and voice endpoints."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


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
