from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class AuditLogResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_id: int
    accessor_id: int
    target_user_id: int
    data_type: str
    action: str
    reason: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    accessed_at: datetime

class AuditLogFilterSchema(BaseModel):
    target_user_id: Optional[int] = None
    accessor_id: Optional[int] = None
    action: Optional[str] = None
    data_type: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    limit: int = 100
    offset: int = 0

