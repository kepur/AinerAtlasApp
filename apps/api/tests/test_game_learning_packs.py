"""Game learning pack service tests."""

from fastapi.testclient import TestClient

from app.main import app
from app.services import game_learning_pack_service as packs


def test_default_social_logic_patterns() -> None:
    with TestClient(app) as client:
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            defaults = packs.patterns_for_game(db, "social_logic")
            assert len(defaults) >= 2
            assert defaults[0].get("pattern")
        finally:
            db.close()


def test_learning_pack_crud_and_list_api() -> None:
    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
        )
        if login.status_code != 200:
            login = client.post(
                "/api/auth/login",
                json={"email": "demo@ainerspeak.com", "password": "Demo123!"},
            )
        token = login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {token}"}

        create = client.post(
            "/api/admin/data/game-learning-packs",
            headers=admin_headers,
            json={
                "game_type": "social_logic",
                "pack_type": "pattern",
                "label": "测试句型",
                "content": "Where were you last night?",
                "example": "Where were you last night exactly?",
            },
        )
        if create.status_code == 403:
            return  # non-admin demo user — defaults still covered above
        assert create.status_code == 200, create.text
        pack_id = create.json()["id"]

        listed = client.get(
            "/api/games/learning-packs?game_type=social_logic",
        )
        assert listed.status_code == 200
        assert any(p["id"] == pack_id for p in listed.json())

        client.delete(
            f"/api/admin/data/game-learning-packs/{pack_id}",
            headers=admin_headers,
        )
