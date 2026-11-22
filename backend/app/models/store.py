from sqlalchemy import Column, BigInteger, String, ForeignKey, Enum
from app.database.database import Base
from sqlalchemy.orm import relationship

class Store(Base):
    __tablename__ = "stores"
    store_id = Column(BigInteger, primary_key=True, autoincrement=True)
    owner_id = Column(BigInteger, ForeignKey("users.user_id"))
    store_name = Column(String(255))
    address = Column(String(255))
    contact = Column(String(255))
    status = Column(
        Enum(
            "Đang chờ duyệt",
            "Đã duyệt",
            "Bị từ chối"
        ),
        nullable=False,
        default="Đang chờ duyệt"
    )
    city_id = Column(BigInteger, ForeignKey("cities.city_id"))
    business_license = Column(String(255), nullable=True)
    bank_account_number = Column(String(50), nullable=True)
    bank_name = Column(String(100), nullable=True)
    account_holder = Column(String(150), nullable=True)

    owner = relationship("User", back_populates="stores")
    city = relationship("City", back_populates="stores")
    vehicles = relationship("Vehicle", back_populates="store")