from sqlalchemy import Column, BigInteger, DateTime, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship

class UserRole(Base):
    __tablename__ = "user_role"
    user_id = Column(BigInteger,ForeignKey("users.user_id"),primary_key=True)
    role_id = Column(BigInteger,ForeignKey("roles.role_id"),primary_key=True)
    assigned_at = Column(DateTime)

    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")