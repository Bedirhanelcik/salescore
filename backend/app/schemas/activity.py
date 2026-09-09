from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ActivityStatus, ActivityType
from app.schemas.contact import CompanyBrief
from app.schemas.user import UserBrief


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: ActivityType
    title: str
    description: str | None
    status: ActivityStatus
    activity_date: datetime
    owner: UserBrief | None
    company: CompanyBrief | None
    contact_id: int | None
    deal_id: int | None
    created_at: datetime


class ActivityCreate(BaseModel):
    type: ActivityType
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    status: ActivityStatus = ActivityStatus.PLANNED
    activity_date: datetime
    owner_id: int | None = None
    company_id: int | None = None
    contact_id: int | None = None
    deal_id: int | None = None


class ActivityUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    status: ActivityStatus | None = None
    activity_date: datetime | None = None
