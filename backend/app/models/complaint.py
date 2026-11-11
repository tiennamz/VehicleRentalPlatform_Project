from sqlalchemy import Column, BigInteger, DateTime, String, Text, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship

class Complaint(Base):
    __tablename__ = "complaints"
    complaint_id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("orders.order_id"))
    user_id = Column(BigInteger, ForeignKey("users.user_id"))
    complaint_type = Column(String(255))
    content = Column(Text)
    complaint_status = Column(String(255))
    created_at = Column(DateTime)

    order = relationship("Order", back_populates="complaints")
    user = relationship("User", back_populates="complaints")
    images = relationship("Image", back_populates="complaint")