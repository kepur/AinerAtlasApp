"""add demo mode settings

Revision ID: 9d2e3f4a5b6c
Revises: 8c1d2e3f4a5b
Create Date: 2026-06-13 14:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "9d2e3f4a5b6c"
down_revision: Union[str, None] = "8c1d2e3f4a5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("auth_settings")}

    if "demo_mode_enabled" not in columns:
        op.add_column(
            "auth_settings",
            sa.Column("demo_mode_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
    if "demo_user_email" not in columns:
        op.add_column(
            "auth_settings",
            sa.Column(
                "demo_user_email",
                sa.String(length=255),
                nullable=False,
                server_default="demo@ainerspeak.com",
            ),
        )
    if "demo_user_password_encrypted" not in columns:
        op.add_column(
            "auth_settings",
            sa.Column("demo_user_password_encrypted", sa.String(length=500), nullable=False, server_default=""),
        )


def downgrade() -> None:
    op.drop_column("auth_settings", "demo_user_password_encrypted")
    op.drop_column("auth_settings", "demo_user_email")
    op.drop_column("auth_settings", "demo_mode_enabled")
