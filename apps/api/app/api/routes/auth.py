from fastapi import APIRouter, HTTPException, Query, Request, status
from loguru import logger
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_access_token,
    decode_refresh_token,
    decode_reset_token,
    hash_password,
    verify_password,
)
from app.models import LoginLog, User, UserProfile
from app.schemas import (
    APIMessage,
    AuthToken,
    DemoConfigRead,
    ForgotPasswordRequest,
    RefreshTokenRequest,
    RegistrationPreview,
    ResetPasswordRequest,
    SendVerificationCodeRequest,
    SendVerificationCodeResponse,
    UserCreate,
    UserLogin,
    UserRead,
)
from app.services.auth_settings import get_auth_settings
from app.services.demo_user import resolve_demo_credentials, sync_demo_user_from_settings
from app.services.email_service import send_password_reset_email, send_verification_email, smtp_configured
from app.services.trial import apply_registration_benefits, expire_user_if_needed, registration_preview
from app.services.verification_code import generate_verification_code, get_code_store

router = APIRouter(prefix="/auth", tags=["auth"])


def _record_login(db: DBSession, user_id: str, request: Request, success: bool, failure_reason: str = "") -> None:
    ip = request.client.host if request.client else ""
    ua = request.headers.get("User-Agent", "")
    db.add(LoginLog(user_id=user_id, ip_address=ip, user_agent=ua, success=success, failure_reason=failure_reason))
    db.commit()


@router.get("/demo-config", response_model=DemoConfigRead)
def demo_config(db: DBSession) -> DemoConfigRead:
    settings = get_auth_settings(db)
    if not settings.demo_mode_enabled:
        return DemoConfigRead(
            enabled=False,
            message="演示模式已关闭，请注册或登录你的账号。",
        )

    email, password = resolve_demo_credentials(settings)
    sync_demo_user_from_settings(db, settings)
    db.commit()
    return DemoConfigRead(
        enabled=True,
        email=email,
        password=password,
        message="演示模式已开启，可使用测试账号直接登录。",
    )


@router.get("/registration-preview", response_model=RegistrationPreview)
def preview_registration(db: DBSession, email: str = Query(...)) -> RegistrationPreview:
    return RegistrationPreview(**registration_preview(db, email))


@router.post("/send-verification-code", response_model=SendVerificationCodeResponse)
def send_verification_code(payload: SendVerificationCodeRequest, db: DBSession) -> SendVerificationCodeResponse:
    email = str(payload.email).lower().strip()
    settings = get_auth_settings(db)

    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    code = generate_verification_code()
    ttl = settings.verification_code_ttl_seconds
    store = get_code_store()
    store.save(email, code, ttl)

    send_verification_email(
        db,
        to_email=email,
        code=code,
        ttl_minutes=max(1, ttl // 60),
    )

    dev_code = code if not smtp_configured(settings) else None
    return SendVerificationCodeResponse(
        message="验证码已发送，请查收邮箱",
        email=email,
        expires_in_seconds=ttl,
        dev_code=dev_code,
    )


@router.post("/register", response_model=AuthToken, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: DBSession, request: Request) -> AuthToken:
    email = str(payload.email).lower().strip()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    settings = get_auth_settings(db)
    if settings.email_verification_enabled:
        if not payload.verification_code.strip():
            raise HTTPException(status_code=400, detail="Verification code is required")
        store = get_code_store()
        if not store.verify(email, payload.verification_code.strip()):
            raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        store.delete(email)

    user = User(
        email=email,
        username=payload.username or email.split("@")[0],
        password_hash=hash_password(payload.password),
    )
    apply_registration_benefits(db, user)
    db.add(user)
    db.flush()
    db.add(UserProfile(user_id=user.id))
    db.commit()
    db.refresh(user)

    logger.info(
        "User registered: {} membership={} expires={}",
        user.email,
        user.membership_level,
        user.membership_expires_at,
    )
    _record_login(db, user.id, request, True)
    token = create_access_token(user.id, {"role": user.role})
    refresh_token = create_refresh_token(user.id)
    return AuthToken(access_token=token, refresh_token=refresh_token, user=UserRead.model_validate(user))


@router.post("/login", response_model=AuthToken)
def login(payload: UserLogin, db: DBSession, request: Request) -> AuthToken:
    email = str(payload.email).lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(payload.password, user.password_hash):
        logger.warning("Authentication failed for email={}", payload.email)
        if user:
            _record_login(db, user.id, request, False, "invalid_credentials")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if expire_user_if_needed(user):
        db.commit()
        _record_login(db, user.id, request, False, "trial_expired")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="试用已到期，账号已停用。请联系客服开通会员。",
        )

    if user.status != "active":
        _record_login(db, user.id, request, False, "account_disabled")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已停用，请联系客服。",
        )

    _record_login(db, user.id, request, True)
    token = create_access_token(user.id, {"role": user.role})
    refresh_token = create_refresh_token(user.id)
    return AuthToken(access_token=token, refresh_token=refresh_token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser, db: DBSession) -> User:
    if expire_user_if_needed(current_user):
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="试用已到期，账号已停用。请联系客服开通会员。",
        )
    return current_user


@router.post("/refresh", response_model=AuthToken)
def refresh_token(payload: RefreshTokenRequest, db: DBSession) -> AuthToken:
    try:
        claims = decode_refresh_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.scalar(select(User).where(User.id == user_id))
    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled")

    if expire_user_if_needed(user):
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Trial expired")

    access_token = create_access_token(user.id, {"role": user.role})
    new_refresh_token = create_refresh_token(user.id)
    return AuthToken(access_token=access_token, refresh_token=new_refresh_token, user=UserRead.model_validate(user))


@router.post("/forgot-password", response_model=APIMessage)
def forgot_password(payload: ForgotPasswordRequest, db: DBSession) -> APIMessage:
    email = str(payload.email).lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if not user or user.status != "active":
        return APIMessage(message="如果该邮箱已注册，重置密码邮件已发送")

    reset_token = create_reset_token(user.id)
    send_password_reset_email(db, to_email=email, token=reset_token)
    return APIMessage(message="如果该邮箱已注册，重置密码邮件已发送")


@router.post("/reset-password", response_model=APIMessage)
def reset_password(payload: ResetPasswordRequest, db: DBSession) -> APIMessage:
    try:
        claims = decode_reset_token(payload.token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    logger.info("Password reset for user {}", user.email)
    return APIMessage(message="密码已重置，请使用新密码登录")


@router.post("/logout", response_model=APIMessage)
def logout(current_user: CurrentUser) -> APIMessage:
    logger.info("User {} logged out", current_user.email)
    return APIMessage(message="已退出登录")
