import smtplib
import ssl
from email.message import EmailMessage

from loguru import logger
from sqlalchemy.orm import Session

from app.models import AuthSettings
from app.services.auth_settings import get_auth_settings, get_smtp_password


def smtp_configured(settings: AuthSettings) -> bool:
    return bool(
        settings.smtp_host
        and settings.smtp_from_email
        and settings.smtp_password_encrypted
    )


def _smtp_login_user(settings: AuthSettings) -> str:
    return settings.smtp_username or settings.smtp_from_email


def _use_ssl(settings: AuthSettings) -> bool:
    # Port 465 uses implicit SSL; STARTTLS is for 587/25.
    return settings.smtp_port == 465 or not settings.smtp_use_tls


def _send_message(settings: AuthSettings, message: EmailMessage) -> None:
    password = get_smtp_password(settings)
    login_user = _smtp_login_user(settings)
    if _use_ssl(settings):
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            timeout=30,
            context=context,
        ) as server:
            if login_user and password:
                server.login(login_user, password)
            server.send_message(message)
        return

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
        server.ehlo()
        server.starttls(context=ssl.create_default_context())
        server.ehlo()
        if login_user and password:
            server.login(login_user, password)
        server.send_message(message)


def send_verification_email(
    db: Session,
    *,
    to_email: str,
    code: str,
    ttl_minutes: int,
) -> None:
    settings = get_auth_settings(db)
    subject = "AinerSpeak 邮箱验证码"
    body = (
        f"你的 AinerSpeak 注册验证码是：{code}\n\n"
        f"验证码 {ttl_minutes} 分钟内有效，请勿泄露给他人。\n\n"
        "如果这不是你本人的操作，请忽略此邮件。"
    )

    if not smtp_configured(settings):
        logger.info(
            "SMTP not configured — verification code for {}: {} (valid {} min)",
            to_email,
            code,
            ttl_minutes,
        )
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message.set_content(body, charset="utf-8")

    _send_message(settings, message)
    logger.info("Verification email sent to {}", to_email)


def send_password_reset_email(
    db: Session,
    *,
    to_email: str,
    token: str,
) -> None:
    settings = get_auth_settings(db)
    reset_link = f"https://ainerspeak.com/reset-password?token={token}"
    subject = "AinerSpeak 密码重置"
    body = (
        "你请求了 AinerSpeak 账号的密码重置。\n\n"
        f"请点击以下链接重置密码（30 分钟内有效）：\n{reset_link}\n\n"
        "如果你没有请求密码重置，请忽略此邮件。"
    )

    if not smtp_configured(settings):
        logger.info(
            "SMTP not configured — password reset token for {}: {} (valid 30 min)",
            to_email,
            token,
        )
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message.set_content(body, charset="utf-8")

    _send_message(settings, message)
    logger.info("Password reset email sent to {}", to_email)
