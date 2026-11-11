from sqlalchemy import Column, BigInteger, String, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship

class Store(Base):
    __tablename__ = "stores"
    store_id = Column(BigInteger, primary_key=True, autoincrement=True)
    owner_id = Column(BigInteger, ForeignKey("users.user_id"))
    store_name = Column(String(255))
    address = Column(String(255))
    contact = Column(String(255))
    status = Column(String(255))
    city_id = Column(BigInteger, ForeignKey("cities.city_id"))

    owner = relationship("User", back_populates="stores")
    city = relationship("City", back_populates="stores")
    vehicles = relationship("Vehicle", back_populates="store")