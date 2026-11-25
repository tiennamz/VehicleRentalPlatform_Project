"""Model lưu kết quả tổng hợp đối soát doanh thu & hoa hồng BR-09 theo tuần cho từng cửa hàng (TF149EA)."""

from sqlalchemy import Column, BigInteger, Integer, Date, DateTime, Numeric, String, ForeignKey
from app.database.database import Base


class WeeklyReconciliation(Base):
    __tablename__ = "weekly_reconciliations"

    reconciliation_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    store_id = Column(BigInteger, ForeignKey("stores.store_id"), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    order_count = Column(Integer, default=0)
    total_rental_amount = Column(Numeric(12, 2), default=0)
    total_delivery_fee = Column(Numeric(12, 2), default=0)
    gross_revenue = Column(Numeric(12, 2), default=0)
    commission_rate = Column(Numeric(5, 2), default=12)
    commission_amount = Column(Numeric(12, 2), default=0)
    net_payout = Column(Numeric(12, 2), default=0)
    status = Column(String(50), default="Đã chốt")
    generated_at = Column(DateTime, nullable=True)
