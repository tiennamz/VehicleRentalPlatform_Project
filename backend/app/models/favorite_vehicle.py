from sqlalchemy import Column, BigInteger, DateTime, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship

class FavoriteVehicle(Base):
    __tablename__ = "favorite_vehicles"
    favorite_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"))
    vehicle_id = Column(BigInteger, ForeignKey("vehicles.vehicle_id"))
    created_at = Column(DateTime)

    user = relationship("User", back_populates="favorite_vehicles")
    vehicle = relationship("Vehicle", back_populates="favorite_vehicles")