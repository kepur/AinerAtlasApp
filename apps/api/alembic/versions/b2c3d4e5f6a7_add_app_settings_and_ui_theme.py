"""add app settings and ui theme

Revision ID: b2c3d4e5f6a7
Revises: 9d2e3f4a5b6c
Create Date: 2026-06-13 15:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "9d2e3f4a5b6c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("app_settings"):
        op.create_table(
            "app_settings",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("default_theme", sa.String(length=20), nullable=False, server_default="dark"),
            sa.Column("enabled_locales", sa.JSON(), nullable=False),
            sa.Column("default_locale", sa.String(length=20), nullable=False, server_default="zh"),
            sa.Column("allow_user_theme_override", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("allow_user_locale_override", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    user_profile_columns = {column["name"] for column in inspector.get_columns("user_profiles")}
    if "ui_theme" not in user_profile_columns:
        op.add_column(
            "user_profiles",
            sa.Column("ui_theme", sa.String(length=20), nullable=False, server_default="dark"),
        )


def downgrade() -> None:
    op.drop_column("user_profiles", "ui_theme")
    op.drop_table("app_settings")
