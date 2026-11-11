from sqlalchemy import Column, BigInteger, DateTime, Numeric, String, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship

class PriceTable(Base):
    __tablename__ = "price_tables"
    price_id = Column(BigInteger, primary_key=True, autoincrement=True)
    vehicle_id = Column(BigInteger, ForeignKey("vehicles.vehicle_id"))
    effective_from = Column(DateTime)
    effective_to = Column(DateTime)
    amount = Column(Numeric(12, 2))
    price_type = Column(String(255))

    vehicle = relationship("Vehicle", back_populates="price_tables")
    orders = relationship("Order", back_populates="price_table")