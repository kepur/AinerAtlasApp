"""add auth settings

Revision ID: 8c1d2e3f4a5b
Revises: 7ed1aa45b393
Create Date: 2026-06-13 13:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "8c1d2e3f4a5b"
down_revision: Union[str, None] = "7ed1aa45b393"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("auth_settings"):
        op.create_table(
            "auth_settings",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("smtp_host", sa.String(length=255), nullable=False),
            sa.Column("smtp_port", sa.Integer(), nullable=False),
            sa.Column("smtp_username", sa.String(length=255), nullable=False),
            sa.Column("smtp_password_encrypted", sa.String(length=500), nullable=False),
            sa.Column("smtp_from_email", sa.String(length=255), nullable=False),
            sa.Column("smtp_use_tls", sa.Boolean(), nullable=False),
            sa.Column("email_verification_enabled", sa.Boolean(), nullable=False),
            sa.Column("verification_code_ttl_seconds", sa.Integer(), nullable=False),
            sa.Column("google_trial_enabled", sa.Boolean(), nullable=False),
            sa.Column("google_trial_days", sa.Integer(), nullable=False),
            sa.Column("google_trial_membership_level", sa.String(length=40), nullable=False),
            sa.Column("google_email_domains", sa.JSON(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    op.drop_table("auth_settings")
