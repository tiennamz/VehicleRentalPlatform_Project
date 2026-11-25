"""add commission BR-09 columns to orders and create weekly_reconciliations table

Revision ID: f7b2d09e88a7
Revises: e6a1c98d77f6
Create Date: 2026-11-25 23:12:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Mã định danh phiên bản Alembic
revision: str = 'f7b2d09e88a7'
down_revision: Union[str, Sequence[str], None] = 'e6a1c98d77f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Bổ sung cột hoa hồng BR-09 vào orders và tạo bảng weekly_reconciliations."""
    op.add_column('orders', sa.Column('commission_rate', sa.Numeric(5, 2), nullable=True, server_default='12'))
    op.add_column('orders', sa.Column('commission_amount', sa.Numeric(12, 2), nullable=True, server_default='0'))

    op.create_table(
        'weekly_reconciliations',
        sa.Column('reconciliation_id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('store_id', sa.BigInteger(), sa.ForeignKey('stores.store_id'), nullable=False),
        sa.Column('week_start', sa.Date(), nullable=False),
        sa.Column('week_end', sa.Date(), nullable=False),
        sa.Column('order_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_rental_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('total_delivery_fee', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('gross_revenue', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('commission_rate', sa.Numeric(5, 2), nullable=False, server_default='12'),
        sa.Column('commission_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('net_payout', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.String(50), nullable=False, server_default='Đã chốt'),
        sa.Column('generated_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    """Xóa bảng weekly_reconciliations và gỡ bỏ cột hoa hồng khỏi orders."""
    op.drop_table('weekly_reconciliations')
    op.drop_column('orders', 'commission_amount')
    op.drop_column('orders', 'commission_rate')
