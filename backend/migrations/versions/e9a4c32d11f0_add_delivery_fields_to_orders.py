"""add delivery fields to orders

Revision ID: e9a4c32d11f0
Revises: d8f3a21b90e1
Create Date: 2026-11-19 11:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e9a4c32d11f0'
down_revision: Union[str, Sequence[str], None] = 'd8f3a21b90e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.add_column('orders', sa.Column('delivery_method', sa.String(length=50), nullable=True, server_default='Nhận tại cửa hàng'))
    except Exception:
        pass
    try:
        op.add_column('orders', sa.Column('delivery_address', sa.String(length=255), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('orders', sa.Column('delivery_distance_km', sa.Numeric(precision=6, scale=2), nullable=True, server_default='0.00'))
    except Exception:
        pass
    try:
        op.add_column('orders', sa.Column('delivery_fee', sa.Numeric(precision=12, scale=2), nullable=True, server_default='0.00'))
    except Exception:
        pass


def downgrade() -> None:
    for col in ('delivery_fee', 'delivery_distance_km', 'delivery_address', 'delivery_method'):
        try:
            op.drop_column('orders', col)
        except Exception:
            pass
