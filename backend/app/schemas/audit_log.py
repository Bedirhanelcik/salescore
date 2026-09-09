from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserBrief


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user: UserBrief | None
    action: str
    entity_type: str
    entity_id: int | None
    entity_label: str | None
    log_metadata: dict | None
    created_at: datetime
