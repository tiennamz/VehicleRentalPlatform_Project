from sqlalchemy import Column, BigInteger, String, Enum, ForeignKey, DateTime
from app.database.database import Base
from sqlalchemy.orm import relationship

class VerifiableInformation(Base):
    __tablename__ = "verifiable_information"
    information_id = Column(BigInteger, ForeignKey("users.user_id"), primary_key=True, autoincrement=False)
    img_id_card_before = Column(String(255), unique=True)
    img_id_card_after = Column(String(255), unique=True)
    status = Column(
        Enum(
            "Đang chờ",
            "Bị từ chối",
            "Đã xác thực"
        ),
        default="Đang chờ"
    )
    rejected_reason = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(BigInteger, ForeignKey("users.user_id"), nullable=True)

    user = relationship("User", back_populates="verifiable_information", foreign_keys=[information_id])
    verifier = relationship("User", foreign_keys=[verified_by])
