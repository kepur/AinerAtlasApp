"""add mastery_score and examples to vocabulary_items

Revision ID: d1e2f3a4b5c6
Revises: 6736a5fde22f
Create Date: 2026-06-15 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "6736a5fde22f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("vocabulary_items", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("mastery_score", sa.Float(), nullable=False, server_default="20.0")
        )
        batch_op.add_column(
            sa.Column("examples", sa.JSON(), nullable=False, server_default="[]")
        )


def downgrade() -> None:
    with op.batch_alter_table("vocabulary_items", schema=None) as batch_op:
        batch_op.drop_column("examples")
        batch_op.drop_column("mastery_score")
