from sqlalchemy import Column, BigInteger, Integer, String
from app.database.database import Base
from sqlalchemy.orm import relationship

class City(Base):
    __tablename__ = "cities"
    city_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    city_name = Column(String(255), unique=True)

    stores = relationship("Store", back_populates="city")