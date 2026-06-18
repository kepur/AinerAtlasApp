from fastapi import APIRouter

from app.api.deps import CurrentUser, DBSession
from app.schemas import PrivacySettingsRead, PrivacySettingsUpdate
from app.services.user_data_purge import purge_user_owned_content

from sqlalchemy import select

from app.models import UserMatchSettings, UserPrivacySettings

router = APIRouter(prefix="/privacy", tags=["privacy"])


def _get_or_create_privacy(user_id: str, db: DBSession) -> UserPrivacySettings:
    settings = db.scalar(
        select(UserPrivacySettings).where(UserPrivacySettings.user_id == user_id)
    )
    if not settings:
        settings = UserPrivacySettings(user_id=user_id)
        db.add(settings)
        db.flush()
    return settings


@router.get("/settings", response_model=PrivacySettingsRead)
def get_privacy_settings(current_user: CurrentUser, db: DBSession) -> PrivacySettingsRead:
    privacy = _get_or_create_privacy(current_user.id, db)
    match_settings = db.scalar(
        select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
    )
    db.commit()
    return PrivacySettingsRead(
        match_profile_visible=privacy.match_profile_visible,
        data_retention_days=privacy.data_retention_days,
        allow_analytics=privacy.allow_analytics,
        public_scope=privacy.public_scope,
        match_enabled=match_settings.enabled if match_settings else False,
    )


@router.put("/settings", response_model=PrivacySettingsRead)
def update_privacy_settings(
    payload: PrivacySettingsUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> PrivacySettingsRead:
    privacy = _get_or_create_privacy(current_user.id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "match_enabled":
            match_settings = db.scalar(
                select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
            )
            if not match_settings:
                match_settings = UserMatchSettings(user_id=current_user.id)
                db.add(match_settings)
            match_settings.enabled = value
        else:
            setattr(privacy, field, value)
    db.commit()
    return get_privacy_settings(current_user, db)


@router.post("/delete-data")
def delete_personal_data(current_user: CurrentUser, db: DBSession) -> dict:
    """Erase all data owned by the requesting user."""
    counts = purge_user_owned_content(db, current_user.id)
    db.commit()
    return {"message": "个人数据已清除", "deleted": True, "counts": counts}


@router.post("/disable-matching")
def disable_matching_profile(current_user: CurrentUser, db: DBSession) -> dict:
    match_settings = db.scalar(
        select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
    )
    if match_settings:
        match_settings.enabled = False
    privacy = _get_or_create_privacy(current_user.id, db)
    privacy.match_profile_visible = False
    db.commit()
    return {"message": "匹配画像已关闭", "match_enabled": False}
