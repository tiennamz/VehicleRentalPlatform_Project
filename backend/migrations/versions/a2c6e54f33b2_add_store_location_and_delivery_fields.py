"""add store location and delivery fields

Revision ID: a2c6e54f33b2
Revises: f1b5d43e22a1
Create Date: 2026-11-25 15:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a2c6e54f33b2'
down_revision: Union[str, Sequence[str], None] = 'f1b5d43e22a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.add_column('stores', sa.Column('latitude', sa.Float(), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('stores', sa.Column('longitude', sa.Float(), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('stores', sa.Column('allow_store_pickup', sa.Boolean(), nullable=False, server_default=sa.true()))
    except Exception:
        pass
    try:
        op.add_column('stores', sa.Column('allow_home_delivery', sa.Boolean(), nullable=False, server_default=sa.true()))
    except Exception:
        pass


def downgrade() -> None:
    for col in ('allow_home_delivery', 'allow_store_pickup', 'longitude', 'latitude'):
        try:
            op.drop_column('stores', col)
        except Exception:
            pass
