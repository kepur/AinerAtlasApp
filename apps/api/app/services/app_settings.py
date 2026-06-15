from sqlalchemy.orm import Session

from app.models import AppSettings
from app.services.languages import DEFAULT_ENABLED_LOCALES, DEFAULT_LOCALE, DEFAULT_THEME, filter_enabled_locales

DEFAULT_APP_SETTINGS_ID = "default"


def get_app_settings(db: Session) -> AppSettings:
    settings = db.get(AppSettings, DEFAULT_APP_SETTINGS_ID)
    if not settings:
        settings = AppSettings(id=DEFAULT_APP_SETTINGS_ID)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def resolved_enabled_locales(settings: AppSettings) -> list[str]:
    return filter_enabled_locales(settings.enabled_locales)


def resolved_default_locale(settings: AppSettings) -> str:
    enabled = resolved_enabled_locales(settings)
    candidate = (settings.default_locale or DEFAULT_LOCALE).lower().strip()
    return candidate if candidate in enabled else enabled[0]


def resolved_default_theme(settings: AppSettings) -> str:
    theme = (settings.default_theme or DEFAULT_THEME).lower().strip()
    return theme if theme in {"dark", "light"} else DEFAULT_THEME
