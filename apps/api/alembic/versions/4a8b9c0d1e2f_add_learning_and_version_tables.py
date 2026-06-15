"""add learning and version tables

Revision ID: 4a8b9c0d1e2f
Revises: 3f2c1d4a5b6c
Create Date: 2026-06-13 14:25:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4a8b9c0d1e2f"
down_revision: Union[str, Sequence[str], None] = "3f2c1d4a5b6c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "thought_versions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("thought_id", sa.String(length=36), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("final_content_native", sa.Text(), nullable=False),
        sa.Column("final_content_target", sa.Text(), nullable=False),
        sa.Column("freeze_payload", sa.JSON(), nullable=False),
        sa.Column("mind_graph", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["thought_id"], ["thoughts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_thought_versions_thought_id", "thought_versions", ["thought_id"])

    op.add_column(
        "expression_assets",
        sa.Column("current_version", sa.Integer(), nullable=False, server_default="1"),
    )

    op.create_table(
        "expression_asset_versions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("asset_id", sa.String(length=36), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("variants", sa.JSON(), nullable=False),
        sa.Column("keywords", sa.JSON(), nullable=False),
        sa.Column("patterns", sa.JSON(), nullable=False),
        sa.Column("note", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["asset_id"], ["expression_assets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_expression_asset_versions_asset_id", "expression_asset_versions", ["asset_id"]
    )

    op.create_table(
        "vocabulary_items",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("word", sa.String(length=120), nullable=False),
        sa.Column("meaning", sa.Text(), nullable=False),
        sa.Column("topic", sa.String(length=120), nullable=False),
        sa.Column("language_code", sa.String(length=20), nullable=False),
        sa.Column("mastery_status", sa.String(length=40), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("source_conversation_id", sa.String(length=36), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["source_conversation_id"], ["conversations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_vocabulary_items_user_id", "vocabulary_items", ["user_id"])
    op.create_index("ix_vocabulary_items_word", "vocabulary_items", ["word"])


def downgrade() -> None:
    op.drop_index("ix_vocabulary_items_word", table_name="vocabulary_items")
    op.drop_index("ix_vocabulary_items_user_id", table_name="vocabulary_items")
    op.drop_table("vocabulary_items")
    op.drop_index("ix_expression_asset_versions_asset_id", table_name="expression_asset_versions")
    op.drop_table("expression_asset_versions")
    op.drop_column("expression_assets", "current_version")
    op.drop_index("ix_thought_versions_thought_id", table_name="thought_versions")
    op.drop_table("thought_versions")
