
from sqlalchemy import Column, BigInteger, Integer, DateTime, Numeric, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base

class Receipt(Base):
    __tablename__ = "receipts"
    receipt_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True
    )
    order_id = Column(
        BigInteger,
        ForeignKey("orders.order_id"),
        nullable=False,
        unique=True
    )
    transaction_id = Column(
        BigInteger,
        ForeignKey("transactions.transaction_id"),
        nullable=False,
        unique=True
    )
    receipt_number = Column(String(50), nullable=False, unique=True)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(100), nullable=False)
    issued_at = Column(DateTime, nullable=False)

    order = relationship("Order")
    transaction = relationship("Transaction")
