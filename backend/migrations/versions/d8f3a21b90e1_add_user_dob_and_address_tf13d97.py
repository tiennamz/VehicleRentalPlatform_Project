"""add user date_of_birth and address for TF13D97

Revision ID: d8f3a21b90e1
Revises: c7e2b10a45f9
Create Date: 2026-11-18 16:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd8f3a21b90e1'
down_revision: Union[str, Sequence[str], None] = 'c7e2b10a45f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.add_column('users', sa.Column('date_of_birth', sa.Date(), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('users', sa.Column('address', sa.String(length=255), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_column('users', 'address')
    except Exception:
        pass
    try:
        op.drop_column('users', 'date_of_birth')
    except Exception:
        pass
