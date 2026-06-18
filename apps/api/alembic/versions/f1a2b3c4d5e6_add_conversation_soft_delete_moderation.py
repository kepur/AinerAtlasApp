"""add conversation soft delete and moderation fields

Revision ID: f1a2b3c4d5e6
Revises: e7f8a9b0c1d2
Create Date: 2026-06-18 12:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("conversations", schema=None) as batch_op:
        batch_op.add_column(sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("deleted_by", sa.String(length=40), nullable=False, server_default=""))
        batch_op.add_column(
            sa.Column("moderation_status", sa.String(length=40), nullable=False, server_default="clean")
        )
        batch_op.add_column(
            sa.Column("moderation_reason", sa.String(length=512), nullable=False, server_default="")
        )
    op.create_index("ix_conversations_deleted_at", "conversations", ["deleted_at"])
    op.create_index("ix_conversations_moderation_status", "conversations", ["moderation_status"])


def downgrade() -> None:
    op.drop_index("ix_conversations_moderation_status", table_name="conversations")
    op.drop_index("ix_conversations_deleted_at", table_name="conversations")
    with op.batch_alter_table("conversations", schema=None) as batch_op:
        batch_op.drop_column("moderation_reason")
        batch_op.drop_column("moderation_status")
        batch_op.drop_column("deleted_by")
        batch_op.drop_column("deleted_at")
