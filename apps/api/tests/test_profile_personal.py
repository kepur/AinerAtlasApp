"""Tests for personal profile fields, avatar upload, and admin visibility."""

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import User

# 1x1 PNG
_TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _register_and_login(client: TestClient) -> tuple[str, str]:
    email = f"profile-{uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "testpass123", "username": "tester"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": "testpass123"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        user_id = user.id
    return token, user_id


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _admin_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _tiny_png() -> bytes:
    return _TINY_PNG


def test_profile_personal_fields_and_avatar() -> None:
    with TestClient(app) as client:
        token, _user_id = _register_and_login(client)
        headers = _auth(token)

        update = client.put(
            "/api/profile",
            headers=headers,
            json={
                "native_language": "zh",
                "primary_target_language": "en",
                "birthday": "1998-05-20",
                "gender_identity": "non_binary",
                "sexual_orientation": "queer",
                "lgbtq_visible": True,
                "username": "Rainbow Learner",
            },
        )
        assert update.status_code == 200, update.text
        data = update.json()
        assert data["birthday"] == "1998-05-20"
        assert data["gender_identity"] == "non_binary"
        assert data["sexual_orientation"] == "queer"
        assert data["lgbtq_visible"] is True

        me = client.get("/api/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["username"] == "Rainbow Learner"

        upload = client.post(
            "/api/profile/avatar",
            headers=headers,
            files={"file": ("avatar.png", _tiny_png(), "image/png")},
        )
        assert upload.status_code == 200, upload.text
        assert upload.json()["avatar_url"].startswith("/uploads/avatars/")


def test_admin_user_detail_includes_personal_fields() -> None:
    with TestClient(app) as client:
        token, user_id = _register_and_login(client)
        headers = _auth(token)

        client.put(
            "/api/profile",
            headers=headers,
            json={
                "native_language": "zh",
                "primary_target_language": "en",
                "birthday": "1998-05-20",
                "gender_identity": "non_binary",
                "sexual_orientation": "queer",
                "lgbtq_visible": True,
            },
        )
        client.post(
            "/api/profile/avatar",
            headers=headers,
            files={"file": ("avatar.png", _tiny_png(), "image/png")},
        )

        detail = client.get(
            f"/api/admin/users/{user_id}",
            headers=_admin_headers(client),
        )
        assert detail.status_code == 200, detail.text
        profile = detail.json()["profile"]
        assert profile is not None
        assert profile["birthday"] == "1998-05-20"
        assert profile["gender_identity"] == "non_binary"
        assert profile["sexual_orientation"] == "queer"
        assert profile["lgbtq_visible"] is True
        assert profile["avatar_url"].startswith("/uploads/avatars/")
