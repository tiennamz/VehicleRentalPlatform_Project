from sqlalchemy import Column, BigInteger, Integer, DateTime, ForeignKey, String, Enum
from app.database.database import Base
from sqlalchemy.orm import relationship

class DriverLicense(Base):
    __tablename__ = "driver_license"
    drivers_license_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), unique=True)
    license_number = Column(String(255), unique=True)
    license_class = Column(Enum("A", "A1", "B1", "C"))
    issue_date = Column(DateTime)
    expiry_date = Column(DateTime)
    verification_status = Column(
        Enum(
            "Đang chờ",
            "Đã xác thực",
            "Bị từ chối",
            "Đã hết hạn"
        ),
        default="Đang chờ"
    )
    rejected_reason = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(BigInteger, ForeignKey("users.user_id"), nullable=True)

    user = relationship("User", back_populates="drivers_license", foreign_keys=[user_id])
    verifier = relationship("User", foreign_keys=[verified_by])
