from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import DBSession
from app.schemas import AppConfigRead, LocaleInfo
from app.services.app_settings import (
    get_app_settings,
    resolved_default_locale,
    resolved_default_theme,
    resolved_enabled_locales,
)
from app.services.languages import locale_catalog

router = APIRouter(prefix="/config", tags=["config"])


class TTSConfigRead(BaseModel):
    tts_provider: str = "edge"
    # Empty = pick per content language (app/services/tts_profile.py).
    tts_voice: str = ""
    tts_speed: float = 0.9
    tts_pitch: float = 1.1

    model_config = {"from_attributes": True}


@router.get("/tts", response_model=TTSConfigRead)
def read_tts_config(db: DBSession) -> TTSConfigRead:
    settings = get_app_settings(db)
    return TTSConfigRead(
        tts_provider=getattr(settings, "tts_provider", "edge") or "edge",
        tts_voice=getattr(settings, "tts_voice", "") or "",
        tts_speed=float(getattr(settings, "tts_speed", 0.9) or 0.9),
        tts_pitch=float(getattr(settings, "tts_pitch", 1.1) or 1.1),
    )


@router.get("/app", response_model=AppConfigRead)
def read_app_config(db: DBSession) -> AppConfigRead:
    settings = get_app_settings(db)
    enabled = resolved_enabled_locales(settings)
    return AppConfigRead(
        default_theme=resolved_default_theme(settings),
        default_locale=resolved_default_locale(settings),
        enabled_locales=enabled,
        locales=[LocaleInfo(**item) for item in locale_catalog(enabled)],
        allow_user_theme_override=settings.allow_user_theme_override,
        allow_user_locale_override=settings.allow_user_locale_override,
    )


@router.get("/features")
def read_feature_availability(db: DBSession) -> dict:
    """Public, non-secret feature flags used to hide unavailable UI paths."""
    from app.services.realtime_availability import realtime_dialogue_status

    return {"realtime_dialogue": realtime_dialogue_status(db)}
