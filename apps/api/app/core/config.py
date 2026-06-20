import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    debug: bool = False
    app_name: str = "AinerSpeak API"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = "postgresql+psycopg2://ainerspeak:ainerspeak@localhost:5432/ainerspeak"
    database_fallback_url: str = "sqlite:///./ainerspeak.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24
    jwt_refresh_token_expire_days: int = 30
    jwt_reset_token_expire_minutes: int = 30
    cors_origins: str = "http://localhost:7075,http://localhost:7072,http://localhost:7076"
    cors_allow_lan: bool = True
    default_llm_provider: str = "auto"
    default_voice_provider: str = "auto"
    dashscope_api_key: str = ""
    dashscope_asr_model: str = "fun-asr-realtime"
    dashscope_ws_url: str = "wss://dashscope.aliyuncs.com/api-ws/v1/inference"
    dashscope_compatible_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    dashscope_http_base_url: str = "https://dashscope.aliyuncs.com/api/v1"
    dashscope_workspace_id: str = ""
    dashscope_embedding_model: str = "text-embedding-v4"
    dashscope_embedding_dimension: int = 1024
    default_embedding_provider: str = "dashscope-embedding"
    dashscope_asr_sample_rate: int = 16000
    dashscope_asr_semantic_punctuation: bool = False
    dashscope_asr_max_sentence_silence: int = 800
    realtime_asr_provider: str = "auto"
    initial_admin_email: str = "admin@ainerspeak.com"
    initial_admin_password: str = "ChangeMe123!"
    initial_demo_email: str = "demo@ainerspeak.com"
    initial_demo_password: str = "Demo123!"
    encryption_key: str = ""
    plaintext_api_keys: bool = False
    storage_backend: str = "local"
    storage_local_path: str = "./storage"
    s3_endpoint_url: str = ""
    s3_bucket_name: str = "ainerspeak"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "auto"
    tts_cache_enabled: bool = True
    tts_cache_max_entries: int = 5000
    monitoring_enabled: bool = False
    prometheus_metrics_port: int = 9090
    backup_retention_days: int = 30
    backup_retention_weekly: int = 12

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def store_plaintext_api_keys(self) -> bool:
        return self.plaintext_api_keys or not self.is_production


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_database_url() -> str:
    settings = get_settings()
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        return database_url
    if settings.is_production:
        return settings.database_url
    return settings.database_fallback_url


def get_cors_origins() -> list[str]:
    return [origin.strip() for origin in get_settings().cors_origins.split(",") if origin.strip()]


# Private LAN / loopback origins for development (phones on same Wi‑Fi, etc.)
_LAN_ORIGIN_REGEX = (
    r"https?://("
    r"localhost|"
    r"127\.0\.0\.1|"
    r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"192\.168\.\d{1,3}\.\d{1,3}|"
    r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}"
    r")(:\d+)?$"
)


def get_cors_origin_regex() -> str | None:
    """In development, allow any private-network origin so LAN devices work without editing CORS."""
    settings = get_settings()
    if settings.is_production or not settings.cors_allow_lan:
        return None
    return _LAN_ORIGIN_REGEX
