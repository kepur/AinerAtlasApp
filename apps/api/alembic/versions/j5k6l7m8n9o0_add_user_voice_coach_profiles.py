"""Add user_voice_coach_profiles for daily Voice Coach personalization."""

from alembic import op
import sqlalchemy as sa


revision = "j5k6l7m8n9o0"
down_revision = "i4j5k6l7m8n9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "user_voice_coach_profiles" in inspector.get_table_names():
        return

    op.create_table(
        "user_voice_coach_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("user_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("coach_identity", sa.Text(), nullable=False, server_default=""),
        sa.Column("user_context_prompt", sa.Text(), nullable=False, server_default=""),
        sa.Column("ability_snapshot", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("strengths", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("weaknesses_to_improve", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("interests", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("focus_topics", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("opening_greeting", sa.Text(), nullable=False, server_default=""),
        sa.Column("opening_questions", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("session_directives", sa.Text(), nullable=False, server_default=""),
        sa.Column("session_instructions", sa.Text(), nullable=False, server_default=""),
        sa.Column("analysis_source", sa.String(length=40), nullable=False, server_default="daily"),
        sa.Column("analyzed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        "ix_user_voice_coach_profiles_user_id",
        "user_voice_coach_profiles",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_user_voice_coach_profiles_user_id", table_name="user_voice_coach_profiles")
    op.drop_table("user_voice_coach_profiles")
