from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import LeadSource, LeadStatus
from app.schemas.user import UserBrief


class LeadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    company_name: str | None
    email: str | None
    phone: str | None
    source: LeadSource
    score: int
    status: LeadStatus
    notes: str | None
    owner: UserBrief | None
    converted_deal_id: int | None
    created_at: datetime
    updated_at: datetime


class LeadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    company_name: str | None = None
    email: str | None = None
    phone: str | None = None
    source: LeadSource
    score: int = Field(default=50, ge=0, le=100)
    status: LeadStatus = LeadStatus.NEW
    notes: str | None = None
    owner_id: int | None = None


class LeadUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    company_name: str | None = None
    email: str | None = None
    phone: str | None = None
    source: LeadSource | None = None
    score: int | None = Field(default=None, ge=0, le=100)
    status: LeadStatus | None = None
    notes: str | None = None
    owner_id: int | None = None


class LeadConvertRequest(BaseModel):
    deal_title: str | None = None
    deal_value: float = Field(default=0, ge=0)
    expected_close_date: date | None = None
