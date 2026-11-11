from sqlalchemy import Column, BigInteger, String, Enum, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship

class Vehicle(Base):
    __tablename__ = "vehicles"
    vehicle_id = Column(BigInteger, primary_key=True, autoincrement=True)
    store_id = Column(BigInteger, ForeignKey("stores.store_id"))
    brand = Column(String(255))
    license_plate = Column(String(255), unique=True)
    type = Column(
        Enum(
            "Xe tay ga",
            "Xe số",
            "Ô tô 4 chỗ",
            "Ô tô 7 chỗ",
            "Ô tô 16 chỗ"
        )
    )
    status = Column(String(255))

    store = relationship("Store", back_populates="vehicles")
    price_tables = relationship("PriceTable", back_populates="vehicle")
    orders = relationship("Order", back_populates="vehicle")
    images = relationship("Image", back_populates="vehicle")
    favorite_vehicles = relationship("FavoriteVehicle",back_populates="vehicle")