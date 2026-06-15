from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse, Response
from jose import JWTError
from loguru import logger
from redis import Redis
from redis.exceptions import RedisError
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_access_token
from app.db.redis import get_redis
from app.db.session import SessionLocal
from app.models import User

EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}
DEFAULT_IP_LIMITS_PER_MINUTE = {
    "anonymous": 60,
    "authenticated": 1200,
}
DEFAULT_USER_LIMITS_PER_MINUTE = {
    "free": 60,
    "vip": 300,
    "pro": 600,
    "premium": 1200,
    "admin": 5000,
    "super_admin": 5000,
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method == "OPTIONS" or request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        redis_client = self._get_redis_client(request)
        if redis_client is None:
            return await call_next(request)

        limiter = RateLimiter(
            redis_client=redis_client,
            ip_limits=getattr(request.app.state, "rate_limit_ip_limits", DEFAULT_IP_LIMITS_PER_MINUTE),
            user_limits=getattr(request.app.state, "rate_limit_user_limits", DEFAULT_USER_LIMITS_PER_MINUTE),
        )

        try:
            user = self._get_authenticated_user(request)
            limiter.consume_ip_limit(
                client_ip=self._get_client_ip(request),
                authenticated=user is not None,
            )
            if user is not None:
                limiter.consume_user_limit(user)
        except HTTPException as exc:
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        except RedisError as exc:
            logger.warning("Rate limiting skipped because Redis is unavailable: {}", exc)

        return await call_next(request)

    @staticmethod
    def _get_redis_client(request: Request) -> Redis | None:
        if hasattr(request.app.state, "rate_limit_redis"):
            return request.app.state.rate_limit_redis
        try:
            return get_redis()
        except RedisError as exc:
            logger.warning("Rate limiting skipped because Redis client creation failed: {}", exc)
            return None

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        forwarded_for = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
        if forwarded_for:
            return forwarded_for
        if request.client and request.client.host:
            return request.client.host
        return "unknown"

    @staticmethod
    def _get_authenticated_user(request: Request) -> User | None:
        authorization = request.headers.get("authorization", "")
        if not authorization.startswith("Bearer "):
            return None

        token = authorization.removeprefix("Bearer ").strip()
        try:
            payload = decode_access_token(token)
        except JWTError:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        with SessionLocal() as db:
            user = db.get(User, user_id)
            if not user or user.status != "active":
                return None
            return user


class RateLimiter:
    def __init__(
        self,
        redis_client: Redis,
        ip_limits: dict[str, int],
        user_limits: dict[str, int],
    ):
        self.redis = redis_client
        self.ip_limits = ip_limits
        self.user_limits = user_limits

    def consume_ip_limit(self, client_ip: str, authenticated: bool) -> None:
        bucket = "authenticated" if authenticated else "anonymous"
        limit = self.ip_limits.get(bucket, self.ip_limits["anonymous"])
        self._consume(
            key=f"rate-limit:ip:{bucket}:{self._window_key()}:{client_ip}",
            limit=limit,
            message=f"IP rate limit exceeded for {bucket} traffic",
        )

    def consume_user_limit(self, user: User) -> None:
        membership = user.role if user.role in {"admin", "super_admin"} else user.membership_level
        limit = self.user_limits.get(membership, self.user_limits["free"])
        self._consume(
            key=f"rate-limit:user:{membership}:{self._window_key()}:{user.id}",
            limit=limit,
            message=f"User rate limit exceeded for membership level '{membership}'",
        )

    def _consume(self, key: str, limit: int, message: str) -> None:
        used = int(self.redis.incrby(key, 1))
        self.redis.expire(key, 120)
        if used > limit:
            self.redis.decrby(key, 1)
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=message)

    @staticmethod
    def _window_key() -> str:
        return datetime.now(UTC).strftime("%Y%m%d%H%M")