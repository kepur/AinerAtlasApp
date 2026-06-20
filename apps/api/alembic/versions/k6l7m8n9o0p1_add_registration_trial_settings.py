"""add registration trial settings to auth_settings"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k6l7m8n9o0p1"
down_revision: Union[str, None] = "j5k6l7m8n9o0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("auth_settings")}

    if "registration_trial_enabled" not in columns:
        op.add_column(
            "auth_settings",
            sa.Column(
                "registration_trial_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            ),
        )
    if "registration_trial_days" not in columns:
        op.add_column(
            "auth_settings",
            sa.Column(
                "registration_trial_days",
                sa.Integer(),
                nullable=False,
                server_default="30",
            ),
        )
    if "registration_trial_membership_level" not in columns:
        op.add_column(
            "auth_settings",
            sa.Column(
                "registration_trial_membership_level",
                sa.String(length=40),
                nullable=False,
                server_default="vip",
            ),
        )


def downgrade() -> None:
    op.drop_column("auth_settings", "registration_trial_membership_level")
    op.drop_column("auth_settings", "registration_trial_days")
    op.drop_column("auth_settings", "registration_trial_enabled")
