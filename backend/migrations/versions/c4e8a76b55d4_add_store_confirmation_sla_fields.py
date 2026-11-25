"""add store confirmation 15-min SLA and rejection fields to orders

Revision ID: c4e8a76b55d4
Revises: b3d7f65a44c3
Create Date: 2026-11-25 20:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e8a76b55d4'
down_revision: Union[str, Sequence[str], None] = 'b3d7f65a44c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add confirmation_deadline, store_responded_at, rejection_reason, escalated_at to orders."""
    op.add_column('orders', sa.Column('confirmation_deadline', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('store_responded_at', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.add_column('orders', sa.Column('escalated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove store confirmation SLA columns from orders."""
    op.drop_column('orders', 'escalated_at')
    op.drop_column('orders', 'rejection_reason')
    op.drop_column('orders', 'store_responded_at')
    op.drop_column('orders', 'confirmation_deadline')
