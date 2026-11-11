from sqlalchemy import Column, BigInteger, DateTime, String, ForeignKey, Enum
from app.database.database import Base
from sqlalchemy.orm import relationship

class HandoverRecord(Base):
    __tablename__ = "handover_records"
    handover_id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("orders.order_id"))
    staff_id = Column(BigInteger, ForeignKey("users.user_id"))
    handover_type = Column(String(255))
    condition_note = Column(String(255))
    handover_at = Column(DateTime)
    handover_in_out = Column(Enum("OUT", "IN"))

    order = relationship("Order", back_populates="handover_records")
    staff = relationship("User", back_populates="handover_records")
    images = relationship("Image", back_populates="handover_record")