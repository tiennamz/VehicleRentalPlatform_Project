"""add order cancellation and BR-04 refund fields

Revision ID: d5f9b87c66e5
Revises: c4e8a76b55d4
Create Date: 2026-11-25 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Mã định danh phiên bản Alembic
revision: str = 'd5f9b87c66e5'
down_revision: Union[str, Sequence[str], None] = 'c4e8a76b55d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Bổ sung 4 cột phục vụ hủy đơn và hoàn cọc theo quy tắc BR-04."""
    op.add_column('orders', sa.Column('cancelled_at', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('cancel_reason', sa.Text(), nullable=True))
    op.add_column('orders', sa.Column('refund_rate', sa.Numeric(5, 2), nullable=True, server_default='0'))
    op.add_column('orders', sa.Column('refund_amount', sa.Numeric(12, 2), nullable=True, server_default='0'))


def downgrade() -> None:
    """Gỡ bỏ 4 cột hủy đơn và hoàn cọc BR-04 khỏi bảng orders."""
    op.drop_column('orders', 'refund_amount')
    op.drop_column('orders', 'refund_rate')
    op.drop_column('orders', 'cancel_reason')
    op.drop_column('orders', 'cancelled_at')
