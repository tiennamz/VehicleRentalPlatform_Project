from sqlalchemy import Column, BigInteger, DateTime, String, Text, Boolean, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship
    
class Notification(Base):
    __tablename__ = "notifications"
    notification_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"))
    title = Column(String(255))
    content = Column(Text)
    notification_type = Column(String(255))
    send_at = Column(DateTime)

    user = relationship("User", back_populates="notifications")