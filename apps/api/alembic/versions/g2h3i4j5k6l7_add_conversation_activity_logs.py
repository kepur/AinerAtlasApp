"""add conversation_activity_logs table

Revision ID: g2h3i4j5k6l7
Revises: f1a2b3c4d5e6
Create Date: 2026-06-18 14:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g2h3i4j5k6l7"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversation_activity_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("message_id", sa.String(length=36), nullable=True),
        sa.Column("action", sa.String(length=60), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_conversation_activity_logs_conversation_id", "conversation_activity_logs", ["conversation_id"])
    op.create_index("ix_conversation_activity_logs_user_id", "conversation_activity_logs", ["user_id"])
    op.create_index("ix_conversation_activity_logs_action", "conversation_activity_logs", ["action"])


def downgrade() -> None:
    op.drop_index("ix_conversation_activity_logs_action", table_name="conversation_activity_logs")
    op.drop_index("ix_conversation_activity_logs_user_id", table_name="conversation_activity_logs")
    op.drop_index("ix_conversation_activity_logs_conversation_id", table_name="conversation_activity_logs")
    op.drop_table("conversation_activity_logs")
