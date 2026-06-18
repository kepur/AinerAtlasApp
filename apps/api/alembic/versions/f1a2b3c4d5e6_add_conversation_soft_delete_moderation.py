"""add conversation soft delete and moderation fields

Revision ID: f1a2b3c4d5e6
Revises: e7f8a9b0c1d2
Create Date: 2026-06-18 12:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = (
    ("deleted_at", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)),
    ("deleted_by", sa.Column("deleted_by", sa.String(length=40), nullable=False, server_default="")),
    (
        "moderation_status",
        sa.Column("moderation_status", sa.String(length=40), nullable=False, server_default="clean"),
    ),
    (
        "moderation_reason",
        sa.Column("moderation_reason", sa.String(length=512), nullable=False, server_default=""),
    ),
)


def upgrade() -> None:
    existing = {c["name"] for c in inspect(op.get_bind()).get_columns("conversations")}
    with op.batch_alter_table("conversations", schema=None) as batch_op:
        for name, column in _COLUMNS:
            if name not in existing:
                batch_op.add_column(column)
    indexes = {idx["name"] for idx in inspect(op.get_bind()).get_indexes("conversations")}
    if "ix_conversations_deleted_at" not in indexes:
        op.create_index("ix_conversations_deleted_at", "conversations", ["deleted_at"])
    if "ix_conversations_moderation_status" not in indexes:
        op.create_index("ix_conversations_moderation_status", "conversations", ["moderation_status"])


def downgrade() -> None:
    op.drop_index("ix_conversations_moderation_status", table_name="conversations")
    op.drop_index("ix_conversations_deleted_at", table_name="conversations")
    with op.batch_alter_table("conversations", schema=None) as batch_op:
        for name, _column in reversed(_COLUMNS):
            batch_op.drop_column(name)
