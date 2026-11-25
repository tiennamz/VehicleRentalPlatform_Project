"""add order note and BR-03 pricing amounts

Revision ID: b3d7f65a44c3
Revises: a2c6e54f33b2
Create Date: 2026-11-25 16:06:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b3d7f65a44c3'
down_revision: Union[str, Sequence[str], None] = 'a2c6e54f33b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    columns = [
        ('rental_amount', sa.Numeric(precision=12, scale=2), '0.00'),
        ('deposit_amount', sa.Numeric(precision=12, scale=2), '0.00'),
        ('remaining_amount', sa.Numeric(precision=12, scale=2), '0.00'),
    ]
    for name, col_type, default in columns:
        try:
            op.add_column('orders', sa.Column(name, col_type, nullable=True, server_default=default))
        except Exception:
            pass
    try:
        op.add_column('orders', sa.Column('note', sa.Text(), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    for col in ('note', 'remaining_amount', 'deposit_amount', 'rental_amount'):
        try:
            op.drop_column('orders', col)
        except Exception:
            pass
