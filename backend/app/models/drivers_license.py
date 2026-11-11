from sqlalchemy import Column, BigInteger, DateTime, ForeignKey, String, Enum
from app.database.database import Base
from sqlalchemy.orm import relationship

class DriverLicense(Base):
    __tablename__ = "driver's_license"
    drivers_license_id = Column(BigInteger,primary_key=True,autoincrement=True)
    user_id = Column(BigInteger,ForeignKey("users.user_id"),unique=True)
    license_number = Column(String(255),unique=True)
    license_class = Column(Enum("A","A1","B1","C"))
    issue_date = Column(DateTime)
    expiry_date = Column(DateTime)
    verification_status = (
        Enum(
            "Đang chờ",
            "Đã xác thực",
            "Bị từ chối",
            "Đã hết hạn"
        )
    )
    rejected_reason = Column(String(255))
    verified_at = Column(DateTime)

    user = relationship("User", back_populates="drivers_license")