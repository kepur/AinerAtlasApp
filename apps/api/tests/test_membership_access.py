from app.models import User
from app.services.membership_access import has_voice_coach_access


def _user(level: str, role: str = "user", status: str = "active") -> User:
    return User(email="a@b.c", username="u", membership_level=level, role=role, status=status)


def test_free_user_no_voice():
    assert has_voice_coach_access(_user("free")) is False


def test_vip_user_has_voice():
    assert has_voice_coach_access(_user("vip")) is True


def test_admin_has_voice():
    assert has_voice_coach_access(_user("free", role="admin")) is True


def test_legacy_premium_maps_to_pro_voice():
    assert has_voice_coach_access(_user("premium")) is True


def test_expired_user_no_voice():
    assert has_voice_coach_access(_user("vip", status="expired")) is False


def test_normalize_membership_level():
    from app.db.redis import normalize_membership_level

    assert normalize_membership_level("premium") == "pro"
    assert normalize_membership_level("business") == "pro"
    assert normalize_membership_level("VIP") == "vip"
