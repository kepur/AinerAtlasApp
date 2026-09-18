"""Use server-side Microsoft Edge TTS as the default player.

Revision ID: l7m8n9o0p1q2
Revises: k6l7m8n9o0p1
"""

from alembic import op
import sqlalchemy as sa


revision = "l7m8n9o0p1q2"
down_revision = "k6l7m8n9o0p1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("app_settings")}
    if "tts_provider" not in columns:
        op.add_column(
            "app_settings",
            sa.Column(
                "tts_provider",
                sa.String(length=32),
                nullable=False,
                server_default="edge",
            ),
        )
    if "tts_voice" not in columns:
        op.add_column(
            "app_settings",
            sa.Column(
                "tts_voice",
                sa.String(length=80),
                nullable=False,
                server_default="zh-CN-XiaoxiaoNeural",
            ),
        )
    if "tts_speed" not in columns:
        op.add_column(
            "app_settings",
            sa.Column("tts_speed", sa.Float(), nullable=False, server_default="0.9"),
        )
    if "tts_pitch" not in columns:
        op.add_column(
            "app_settings",
            sa.Column("tts_pitch", sa.Float(), nullable=False, server_default="1.1"),
        )
    if "global_api_keys" not in columns:
        op.add_column(
            "app_settings",
            sa.Column(
                "global_api_keys",
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'[]'"),
            ),
        )

    # Existing installations created from ORM metadata already have these
    # columns. Widen only that legacy voice column before writing the new name.
    if "tts_voice" in columns:
        with op.batch_alter_table("app_settings") as batch_op:
            batch_op.alter_column(
                "tts_voice",
                existing_type=sa.String(length=40),
                type_=sa.String(length=80),
                server_default="zh-CN-XiaoxiaoNeural",
                existing_nullable=False,
            )
    if "tts_provider" in columns:
        with op.batch_alter_table("app_settings") as batch_op:
            batch_op.alter_column(
                "tts_provider",
                existing_type=sa.String(length=32),
                server_default="edge",
                existing_nullable=False,
            )
    op.execute(
        "UPDATE app_settings SET tts_provider = 'edge', "
        "tts_voice = 'zh-CN-XiaoxiaoNeural' "
        "WHERE tts_provider = 'browser' OR tts_provider IS NULL OR tts_provider = ''"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE app_settings SET tts_provider = 'browser', tts_voice = 'Xiaoxiao' "
        "WHERE tts_provider = 'edge'"
    )
    # Keep the columns because older installations may have created them from
    # ORM metadata before Alembic tracked them. Downgrade only restores values
    # and defaults, avoiding destructive column removal.
    with op.batch_alter_table("app_settings") as batch_op:
        batch_op.alter_column(
            "tts_voice",
            existing_type=sa.String(length=80),
            server_default="longanhuan",
            existing_nullable=False,
        )
        batch_op.alter_column(
            "tts_provider",
            existing_type=sa.String(length=32),
            server_default="browser",
            existing_nullable=False,
        )
