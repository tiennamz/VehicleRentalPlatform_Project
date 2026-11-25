"""add dual handover confirmation fields to handover_records

Revision ID: e6a1c98d77f6
Revises: d5f9b87c66e5
Create Date: 2026-11-25 22:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Mã định danh phiên bản Alembic
revision: str = 'e6a1c98d77f6'
down_revision: Union[str, Sequence[str], None] = 'd5f9b87c66e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Bổ sung 4 cột xác nhận bàn giao 2 chiều (nhân viên & khách hàng) vào bảng handover_records."""
    op.add_column('handover_records', sa.Column('staff_confirmed', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('handover_records', sa.Column('staff_confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('handover_records', sa.Column('customer_confirmed', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('handover_records', sa.Column('customer_confirmed_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Gỡ bỏ 4 cột xác nhận bàn giao 2 chiều khỏi bảng handover_records."""
    op.drop_column('handover_records', 'customer_confirmed_at')
    op.drop_column('handover_records', 'customer_confirmed')
    op.drop_column('handover_records', 'staff_confirmed_at')
    op.drop_column('handover_records', 'staff_confirmed')
