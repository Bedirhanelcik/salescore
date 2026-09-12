"""add notification params column

Revision ID: a1b2c3d4e5f6
Revises: b734e3af1414
Create Date: 2026-09-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'b734e3af1414'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('notifications', sa.Column('params', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('notifications', 'params')
