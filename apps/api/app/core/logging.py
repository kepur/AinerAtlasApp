import sys
import time
from uuid import uuid4
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings

SENSITIVE_PATHS = {"/api/auth/login", "/api/auth/register"}
SENSITIVE_HEADERS = {"authorization", "cookie"}


def setup_logging() -> None:
    settings = get_settings()
    logger.remove()

    if settings.is_production:
        logger.add(sys.stderr, level="INFO", serialize=True)
    else:
        logger.add(
            sys.stderr,
            level="DEBUG" if settings.debug else "INFO",
            colorize=True,
            format=(
                "<green>{time:HH:mm:ss}</green> | "
                "<level>{level: <8}</level> | "
                "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
                "<level>{message}</level>"
            ),
        )

    logger.info("Logging configured for {} environment", settings.app_env)


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = getattr(request.state, "request_id", None) or request.headers.get(
            "x-request-id", uuid4().hex
        )
        request.state.request_id = request_id

        start = time.perf_counter()
        method = request.method
        path = request.url.path

        response: Response | None = None
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            elapsed_ms = round((time.perf_counter() - start) * 1000)
            status = response.status_code if response else 500

            log_data = {
                "method": method,
                "path": path,
                "status": status,
                "duration_ms": elapsed_ms,
                "client": request.client.host if request.client else "unknown",
                "request_id": request_id,
            }

            if path in SENSITIVE_PATHS:
                log_data["note"] = "body redacted"

            if status >= 500:
                logger.error("HTTP {method} {path} → {status} ({duration_ms}ms)", **log_data)
            elif status >= 400:
                logger.warning("HTTP {method} {path} → {status} ({duration_ms}ms)", **log_data)
            else:
                logger.info("HTTP {method} {path} → {status} ({duration_ms}ms)", **log_data)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = getattr(request.state, "request_id", None) or request.headers.get(
            "x-request-id", uuid4().hex
        )
        request.state.request_id = request_id

        try:
            return await call_next(request)
        except Exception:
            logger.exception(
                "Unhandled exception on {method} {path} [request_id={request_id}]",
                method=request.method,
                path=request.url.path,
                request_id=request_id,
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
                headers={"X-Request-ID": request_id},
            )
