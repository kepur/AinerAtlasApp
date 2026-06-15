"""add thought freeze payload

Revision ID: 3f2c1d4a5b6c
Revises: 62c29e271eca
Create Date: 2026-06-13 13:50:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3f2c1d4a5b6c"
down_revision: Union[str, Sequence[str], None] = "62c29e271eca"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "thoughts",
        sa.Column("freeze_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )


def downgrade() -> None:
    op.drop_column("thoughts", "freeze_payload")