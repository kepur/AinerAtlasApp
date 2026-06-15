from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from redis import Redis
from sqlalchemy.orm import Session

from app.core.security import decode_access_token, decode_refresh_token
from app.db.redis import QuotaManager, get_redis
from app.db.session import get_db
from app.models import User

from app.services.trial import expire_user_if_needed

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

DBSession = Annotated[Session, Depends(get_db)]


def get_redis_client() -> Redis:
    return get_redis()


RedisClient = Annotated[Redis, Depends(get_redis_client)]


def get_quota_manager(redis_client: RedisClient, db: DBSession) -> QuotaManager:
    try:
        redis_client.ping()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis unavailable",
        ) from exc
    return QuotaManager(redis_client, db)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DBSession,
) -> User:
    try:
        payload = decode_access_token(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if expire_user_if_needed(user):
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="试用已到期，账号已停用。请联系客服开通会员。",
        )
    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return user


def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if current_user.role not in {"admin", "super_admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user


CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
QuotaManagerDep = Annotated[QuotaManager, Depends(get_quota_manager)]
