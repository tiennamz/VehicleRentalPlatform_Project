"""add personal data access logs and kyc verification fields

Revision ID: c7e2b10a45f9
Revises: bf69f1bd7df7
Create Date: 2026-11-16 20:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c7e2b10a45f9'
down_revision: Union[str, Sequence[str], None] = 'bf69f1bd7df7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Tạo bảng personal_data_access_logs
    op.create_table(
        'personal_data_access_logs',
        sa.Column('log_id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('accessor_id', sa.BigInteger(), nullable=False),
        sa.Column('target_user_id', sa.BigInteger(), nullable=False),
        sa.Column('data_type', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('accessed_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['accessor_id'], ['users.user_id'], name='fk_audit_accessor_user'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.user_id'], name='fk_audit_target_user'),
        sa.PrimaryKeyConstraint('log_id')
    )

    # 2. Thêm verified_by vào driver_license
    try:
        op.add_column('driver_license', sa.Column('verified_by', sa.BigInteger(), nullable=True))
        op.create_foreign_key('fk_driver_license_verified_by', 'driver_license', 'users', ['verified_by'], ['user_id'])
    except Exception:
        pass

    # 3. Thêm các trường duyệt vào verifiable_information
    try:
        op.add_column('verifiable_information', sa.Column('rejected_reason', sa.String(length=255), nullable=True))
        op.add_column('verifiable_information', sa.Column('verified_at', sa.DateTime(), nullable=True))
        op.add_column('verifiable_information', sa.Column('verified_by', sa.BigInteger(), nullable=True))
        op.create_foreign_key('fk_verifiable_info_verified_by', 'verifiable_information', 'users', ['verified_by'], ['user_id'])
    except Exception:
        pass

def downgrade() -> None:
    op.drop_table('personal_data_access_logs')
    try:
        op.drop_constraint('fk_verifiable_info_verified_by', 'verifiable_information', type_='foreignkey')
        op.drop_column('verifiable_information', 'verified_by')
        op.drop_column('verifiable_information', 'verified_at')
        op.drop_column('verifiable_information', 'rejected_reason')
    except Exception:
        pass

    try:
        op.drop_constraint('fk_driver_license_verified_by', 'driver_license', type_='foreignkey')
        op.drop_column('driver_license', 'verified_by')
    except Exception:
        pass

