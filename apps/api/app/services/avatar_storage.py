from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, UploadFile

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"
AVATAR_DIR = UPLOAD_ROOT / "avatars"


def ensure_avatar_dir() -> Path:
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    return AVATAR_DIR


async def save_user_avatar(user_id: str, upload: UploadFile) -> str:
    content_type = (upload.content_type or "").lower().split(";")[0].strip()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed")

    raw = await upload.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(raw) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 2 MB or smaller")

    ext = ALLOWED_CONTENT_TYPES[content_type]
    ensure_avatar_dir()

    for old in AVATAR_DIR.glob(f"{user_id}.*"):
        if old.is_file():
            old.unlink()

    path = AVATAR_DIR / f"{user_id}{ext}"
    path.write_bytes(raw)
    return f"/uploads/avatars/{user_id}{ext}"
