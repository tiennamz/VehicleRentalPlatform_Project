from sqlalchemy import Column, BigInteger, Integer, String, Text, DateTime
from app.database.database import Base


class SystemConfig(Base):
    __tablename__ = "system_config"
    config_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    config_key = Column(String(255), unique=True)
    config_value = Column(String(255))
    description = Column(Text)
    created_at = Column(DateTime)
