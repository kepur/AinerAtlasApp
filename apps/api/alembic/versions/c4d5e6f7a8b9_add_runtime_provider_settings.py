"""add runtime provider settings to app_settings

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a7
Create Date: 2026-06-13 16:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("app_settings"):
        return

    columns = {column["name"] for column in inspector.get_columns("app_settings")}
    if "default_llm_provider" not in columns:
        op.add_column(
            "app_settings",
            sa.Column("default_llm_provider", sa.String(length=64), nullable=False, server_default=""),
        )
    if "default_voice_provider" not in columns:
        op.add_column(
            "app_settings",
            sa.Column("default_voice_provider", sa.String(length=64), nullable=False, server_default=""),
        )
    if "realtime_asr_provider" not in columns:
        op.add_column(
            "app_settings",
            sa.Column("realtime_asr_provider", sa.String(length=32), nullable=False, server_default="auto"),
        )
    if "default_embedding_provider" not in columns:
        op.add_column(
            "app_settings",
            sa.Column("default_embedding_provider", sa.String(length=64), nullable=False, server_default=""),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("app_settings"):
        return

    columns = {column["name"] for column in inspector.get_columns("app_settings")}
    for name in (
        "default_embedding_provider",
        "realtime_asr_provider",
        "default_voice_provider",
        "default_llm_provider",
    ):
        if name in columns:
            op.drop_column("app_settings", name)
