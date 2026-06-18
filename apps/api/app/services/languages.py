LOCALE_CATALOG: dict[str, dict[str, str]] = {
    "en": {"code": "en", "name": "English", "native_name": "English"},
    "zh": {"code": "zh", "name": "Chinese (Simplified)", "native_name": "简体中文"},
    "hi": {"code": "hi", "name": "Hindi", "native_name": "हिन्दी"},
    "es": {"code": "es", "name": "Spanish", "native_name": "Español"},
    "fr": {"code": "fr", "name": "French", "native_name": "Français"},
    "ar": {"code": "ar", "name": "Arabic", "native_name": "العربية"},
    "bn": {"code": "bn", "name": "Bengali", "native_name": "বাংলা"},
    "pt": {"code": "pt", "name": "Portuguese", "native_name": "Português"},
    "ru": {"code": "ru", "name": "Russian", "native_name": "Русский"},
    "ja": {"code": "ja", "name": "Japanese", "native_name": "日本語"},
    "sr": {"code": "sr", "name": "Serbian", "native_name": "Srpski"},
    "ko": {"code": "ko", "name": "Korean", "native_name": "한국어"},
}

DEFAULT_ENABLED_LOCALES = [
    "en",
    "zh",
    "hi",
    "es",
    "fr",
    "ar",
    "bn",
    "pt",
    "ru",
    "sr",
]
DEFAULT_LOCALE = "zh"
DEFAULT_THEME = "dark"


def normalize_locale(code: str) -> str:
    return code.lower().strip().split("-")[0]


def locale_info(code: str) -> dict[str, str] | None:
    return LOCALE_CATALOG.get(normalize_locale(code))


def filter_enabled_locales(enabled: list[str] | None) -> list[str]:
    codes = [normalize_locale(item) for item in (enabled or DEFAULT_ENABLED_LOCALES)]
    valid = [code for code in codes if code in LOCALE_CATALOG]
    return valid or list(DEFAULT_ENABLED_LOCALES)


def locale_catalog(enabled: list[str] | None) -> list[dict[str, str]]:
    return [
        LOCALE_CATALOG[code]
        for code in filter_enabled_locales(enabled)
        if code in LOCALE_CATALOG
    ]
