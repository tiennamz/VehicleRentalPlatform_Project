from sqlalchemy import Column, BigInteger,Enum , Text
from app.database.database import Base
from sqlalchemy.orm import relationship

class Role(Base):
    __tablename__ = "roles"
    role_id = Column(BigInteger, primary_key=True)
    role_name = Column(
        Enum(
            "Admin",
            "Khách hàng",
            "Nhân viên",
            "Chủ cửa hàng",
        )
    )
    description = Column(Text, nullable=False)
    
    user_roles = relationship("UserRole", back_populates="role")