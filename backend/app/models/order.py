from sqlalchemy import Column, BigInteger, DateTime, Numeric, String, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship

class Order(Base):
    __tablename__ = "orders"
    order_id = Column(BigInteger, primary_key=True, autoincrement=True)
    renter_id = Column(BigInteger, ForeignKey("users.user_id"))
    vehicle_id = Column(BigInteger, ForeignKey("vehicles.vehicle_id"))
    price_id = Column(BigInteger, ForeignKey("price_tables.price_id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    total_amount = Column(Numeric(12, 2))
    order_status = Column(String(255))
    created_at = Column(DateTime)

    renter = relationship("User",back_populates="rented_orders",foreign_keys=[renter_id])
    vehicle = relationship("Vehicle", back_populates="orders")
    price_table = relationship("PriceTable", back_populates="orders")
    transactions = relationship("Transaction", back_populates="order")
    handover_records = relationship("HandoverRecord", back_populates="order")
    review = relationship("Review",back_populates="order",uselist=False)
    complaints = relationship("Complaint", back_populates="order")