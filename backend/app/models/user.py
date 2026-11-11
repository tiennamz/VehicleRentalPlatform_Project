from sqlalchemy import Column, BigInteger, String, DateTime, Text
from app.database.database import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"
    user_id = Column(BigInteger,primary_key=True,autoincrement=True)
    fullname = Column(String(255))
    email = Column(String(255),unique=True)
    phone_number  = Column(String(15),unique=True)
    status = Column(String(255))
    created_at = Column(DateTime)

    stores = relationship("Store", back_populates="owner")
    user_roles = relationship("UserRole", back_populates="user")
    rented_orders = relationship("Order",back_populates="renter",foreign_keys="Order.renter_id")
    handover_records = relationship("HandoverRecord", back_populates="staff")
    reviews = relationship("Review", back_populates="reviewer")
    complaints = relationship("Complaint", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    verifiable_information = relationship("VerifiableInformation",back_populates="user",uselist=False)
    favorite_vehicles = relationship("FavoriteVehicle",back_populates="user")
    drivers_license = relationship("DriverLicense",back_populates="user")