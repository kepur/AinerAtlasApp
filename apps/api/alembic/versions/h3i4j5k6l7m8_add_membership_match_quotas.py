"""add membership match quota fields

Revision ID: h3i4j5k6l7m8
Revises: g2h3i4j5k6l7
Create Date: 2026-06-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h3i4j5k6l7m8"
down_revision: Union[str, Sequence[str], None] = "g2h3i4j5k6l7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("membership_plans", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("daily_match_cards", sa.Integer(), nullable=False, server_default="1")
        )
        batch_op.add_column(
            sa.Column("match_batch_size", sa.Integer(), nullable=False, server_default="1")
        )

    op.execute(
        "UPDATE membership_plans SET daily_match_cards=1, match_batch_size=1 WHERE level='free'"
    )
    op.execute(
        "UPDATE membership_plans SET daily_match_cards=3, match_batch_size=3 WHERE level='vip'"
    )
    op.execute(
        "UPDATE membership_plans SET daily_match_cards=5, match_batch_size=5 WHERE level='pro'"
    )
    op.execute(
        "UPDATE membership_plans SET daily_match_cards=-1, match_batch_size=-1 WHERE level='premium'"
    )


def downgrade() -> None:
    with op.batch_alter_table("membership_plans", schema=None) as batch_op:
        batch_op.drop_column("match_batch_size")
        batch_op.drop_column("daily_match_cards")
