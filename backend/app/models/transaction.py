from sqlalchemy import Column, BigInteger, DateTime, Numeric, String, ForeignKey, Enum
from app.database.database import Base
from sqlalchemy.orm import relationship

class Transaction(Base):
    __tablename__ = "transactions"
    transaction_id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("orders.order_id"))
    transaction_code = Column(String(255))
    payment_method = Column(
        Enum(
            "Tiền mặt",
            "Thẻ tín dụng",
            "Chuyển khoản ngân hàng"
        )
    )
    amount = Column(Numeric(12, 2))
    transaction_type = Column(String(255))
    status = Column(String(255))
    paid_at = Column(DateTime)

    order = relationship("Order", back_populates="transactions")