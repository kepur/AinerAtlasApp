"""add personal fields to user_profiles

Revision ID: e7f8a9b0c1d2
Revises: d1e2f3a4b5c6
Create Date: 2026-06-18 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = (
    ("birthday", sa.Column("birthday", sa.Date(), nullable=True)),
    ("avatar_url", sa.Column("avatar_url", sa.String(length=512), nullable=False, server_default="")),
    ("gender_identity", sa.Column("gender_identity", sa.String(length=40), nullable=False, server_default="")),
    ("gender_custom", sa.Column("gender_custom", sa.String(length=120), nullable=False, server_default="")),
    ("sexual_orientation", sa.Column("sexual_orientation", sa.String(length=40), nullable=False, server_default="")),
    ("orientation_custom", sa.Column("orientation_custom", sa.String(length=120), nullable=False, server_default="")),
    ("lgbtq_visible", sa.Column("lgbtq_visible", sa.Boolean(), nullable=False, server_default=sa.false())),
)


def upgrade() -> None:
    existing = {c["name"] for c in inspect(op.get_bind()).get_columns("user_profiles")}
    with op.batch_alter_table("user_profiles", schema=None) as batch_op:
        for name, column in _COLUMNS:
            if name not in existing:
                batch_op.add_column(column)


def downgrade() -> None:
    with op.batch_alter_table("user_profiles", schema=None) as batch_op:
        for name, _column in reversed(_COLUMNS):
            batch_op.drop_column(name)
