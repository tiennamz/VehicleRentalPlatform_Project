"""add driver license image columns for cloudinary kyc

Revision ID: f1b5d43e22a1
Revises: e9a4c32d11f0
Create Date: 2026-11-25 01:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f1b5d43e22a1'
down_revision: Union[str, Sequence[str], None] = 'e9a4c32d11f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.add_column("driver's_license", sa.Column('img_license_front', sa.String(length=255), nullable=True))
    except Exception:
        pass
    try:
        op.add_column("driver's_license", sa.Column('img_license_back', sa.String(length=255), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    for col in ('img_license_back', 'img_license_front'):
        try:
            op.drop_column("driver's_license", col)
        except Exception:
            pass
