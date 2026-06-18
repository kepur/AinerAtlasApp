"""add personal fields to user_profiles

Revision ID: e7f8a9b0c1d2
Revises: d1e2f3a4b5c6
Create Date: 2026-06-18 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_profiles", schema=None) as batch_op:
        batch_op.add_column(sa.Column("birthday", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("avatar_url", sa.String(length=512), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("gender_identity", sa.String(length=40), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("gender_custom", sa.String(length=120), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("sexual_orientation", sa.String(length=40), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("orientation_custom", sa.String(length=120), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("lgbtq_visible", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("user_profiles", schema=None) as batch_op:
        batch_op.drop_column("lgbtq_visible")
        batch_op.drop_column("orientation_custom")
        batch_op.drop_column("sexual_orientation")
        batch_op.drop_column("gender_custom")
        batch_op.drop_column("gender_identity")
        batch_op.drop_column("avatar_url")
        batch_op.drop_column("birthday")
