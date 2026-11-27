from sqlalchemy import Column, BigInteger, Integer, DateTime, Numeric, String, Text, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship


class Order(Base):
    __tablename__ = "orders"
    order_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    renter_id = Column(BigInteger, ForeignKey("users.user_id"))
    vehicle_id = Column(BigInteger, ForeignKey("vehicles.vehicle_id"))
    price_id = Column(BigInteger, ForeignKey("price_tables.price_id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    delivery_method = Column(String(50), default="Nhận tại cửa hàng")
    delivery_address = Column(String(255), nullable=True)
    delivery_distance_km = Column(Numeric(6, 2), default=0)
    delivery_fee = Column(Numeric(12, 2), default=0)
    rental_amount = Column(Numeric(12, 2), default=0)
    deposit_amount = Column(Numeric(12, 2), default=0)
    remaining_amount = Column(Numeric(12, 2), default=0)
    total_amount = Column(Numeric(12, 2))
    note = Column(Text, nullable=True)
    order_status = Column(String(255))
    created_at = Column(DateTime)
    confirmation_deadline = Column(DateTime, nullable=True)
    store_responded_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    escalated_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancel_reason = Column(Text, nullable=True)
    refund_rate = Column(Numeric(5, 2), default=0)
    refund_amount = Column(Numeric(12, 2), default=0)
    commission_rate = Column(Numeric(5, 2), default=12)
    commission_amount = Column(Numeric(12, 2), default=0)

    renter = relationship("User", back_populates="rented_orders", foreign_keys=[renter_id])
    vehicle = relationship("Vehicle", back_populates="orders")
    price_table = relationship("PriceTable", back_populates="orders")
    transactions = relationship("Transaction", back_populates="order")
    handover_records = relationship("HandoverRecord", back_populates="order")
    review = relationship("Review", back_populates="order", uselist=False)
    complaints = relationship("Complaint", back_populates="order")
