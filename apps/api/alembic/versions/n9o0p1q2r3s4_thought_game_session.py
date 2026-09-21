"""Let a frozen thought come from a game session, not only a conversation.

Revision ID: n9o0p1q2r3s4
Revises: m8n9o0p1q2r3
"""

from alembic import op
import sqlalchemy as sa


revision = "n9o0p1q2r3s4"
down_revision = "m8n9o0p1q2r3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("thoughts")}
    if "game_session_id" not in cols:
        op.add_column(
            "thoughts",
            sa.Column("game_session_id", sa.String(length=36), nullable=True),
        )
        op.create_index(
            "ix_thoughts_game_session_id", "thoughts", ["game_session_id"]
        )


def downgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("thoughts")}
    if "game_session_id" in cols:
        op.drop_index("ix_thoughts_game_session_id", table_name="thoughts")
        op.drop_column("thoughts", "game_session_id")
