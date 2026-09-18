"""Add persistent multilingual course progress and practice attempts.

Revision ID: m8n9o0p1q2r3
Revises: l7m8n9o0p1q2
"""

from alembic import op
import sqlalchemy as sa


revision = "m8n9o0p1q2r3"
down_revision = "l7m8n9o0p1q2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "language_course_progress" not in tables:
        op.create_table(
            "language_course_progress",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("course_code", sa.String(length=80), nullable=False, server_default="survival-sprint"),
            sa.Column("language_code", sa.String(length=20), nullable=False),
            sa.Column("current_step", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("scenario_index", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("turn_index", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("completed_steps", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
            sa.Column("correct_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("mistake_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_sessions", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("streak_days", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_practice_on", sa.Date(), nullable=True),
            sa.Column("mistake_items", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("state", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint(
                "user_id",
                "course_code",
                "language_code",
                name="uq_language_course_progress_user_course_language",
            ),
        )
        op.create_index("ix_language_course_progress_user_id", "language_course_progress", ["user_id"])
        op.create_index("ix_language_course_progress_course_code", "language_course_progress", ["course_code"])
        op.create_index("ix_language_course_progress_language_code", "language_course_progress", ["language_code"])

    if "language_practice_attempts" not in tables:
        op.create_table(
            "language_practice_attempts",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
            sa.Column(
                "progress_id",
                sa.String(length=36),
                sa.ForeignKey("language_course_progress.id"),
                nullable=False,
            ),
            sa.Column("course_code", sa.String(length=80), nullable=False, server_default="survival-sprint"),
            sa.Column("language_code", sa.String(length=20), nullable=False),
            sa.Column("activity_type", sa.String(length=40), nullable=False, server_default="scenario"),
            sa.Column("item_id", sa.String(length=160), nullable=False),
            sa.Column("correct", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("user_answer", sa.Text(), nullable=False, server_default=""),
            sa.Column("expected_answer", sa.Text(), nullable=False, server_default=""),
            sa.Column("details", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("practiced_on", sa.Date(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_language_practice_attempts_user_id", "language_practice_attempts", ["user_id"])
        op.create_index("ix_language_practice_attempts_progress_id", "language_practice_attempts", ["progress_id"])
        op.create_index("ix_language_practice_attempts_course_code", "language_practice_attempts", ["course_code"])
        op.create_index("ix_language_practice_attempts_language_code", "language_practice_attempts", ["language_code"])
        op.create_index("ix_language_practice_attempts_item_id", "language_practice_attempts", ["item_id"])
        op.create_index("ix_language_practice_attempts_practiced_on", "language_practice_attempts", ["practiced_on"])


def downgrade() -> None:
    op.drop_table("language_practice_attempts")
    op.drop_table("language_course_progress")
