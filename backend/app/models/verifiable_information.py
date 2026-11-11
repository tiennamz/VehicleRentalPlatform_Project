from sqlalchemy import Column, BigInteger, String, Enum, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship

class VerifiableInformation(Base):
    __tablename__ = "verifiable_information"
    information_id = Column(BigInteger,ForeignKey("users.user_id"),primary_key=True,autoincrement=False)
    img_id_card_before = Column(String(255), unique=True)
    img_id_card_after = Column(String(255), unique=True)
    status = Column(
        Enum(
            "Đang chờ",
            "Bị từ chối",
            "Đã xác thực"
        )
    )

    user = relationship("User", back_populates="verifiable_information")