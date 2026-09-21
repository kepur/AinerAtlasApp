"""Per-language TTS voice overrides, grouped by provider.

Revision ID: o0p1q2r3s4t5
Revises: n9o0p1q2r3s4
"""

from alembic import op
import sqlalchemy as sa


revision = "o0p1q2r3s4t5"
down_revision = "n9o0p1q2r3s4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("app_settings")}
    if "tts_voice_overrides" not in cols:
        op.add_column(
            "app_settings",
            sa.Column(
                "tts_voice_overrides",
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'{}'"),
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("app_settings")}
    if "tts_voice_overrides" in cols:
        op.drop_column("app_settings", "tts_voice_overrides")
