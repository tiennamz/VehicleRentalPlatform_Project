from sqlalchemy import Column, BigInteger, String, Text, DateTime, UniqueConstraint
from app.database.database import Base


class SystemConfig(Base):
    __tablename__ = "system_config"
    config_id = Column(BigInteger, primary_key=True, autoincrement=True)
    config_key = Column(String(255),unique=True)
    config_value = Column(String(255))
    description = Column(Text)
    created_at = Column(DateTime)