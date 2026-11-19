from datetime import datetime
from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base

class PersonalDataAccessLog(Base):
    __tablename__ = "personal_data_access_logs"

    log_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    accessor_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    target_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    data_type = Column(String(50), nullable=False)  # 'DRIVERS_LICENSE', 'CCCD'
    action = Column(String(50), nullable=False)     # 'VIEW', 'APPROVE', 'REJECT'
    reason = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    accessed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    accessor = relationship("User", foreign_keys=[accessor_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
