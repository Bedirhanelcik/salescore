from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ActivityType, CompanySize, CompanyStatus
from app.schemas.user import UserBrief


class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    industry: str | None
    size: CompanySize | None
    country: str | None
    website: str | None
    annual_revenue: float | None
    status: CompanyStatus
    owner: UserBrief | None
    created_at: datetime
    updated_at: datetime


class CompanyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    industry: str | None = None
    size: CompanySize | None = None
    country: str | None = None
    website: str | None = None
    annual_revenue: float | None = Field(default=None, ge=0)
    status: CompanyStatus = CompanyStatus.PROSPECT
    owner_id: int | None = None


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    industry: str | None = None
    size: CompanySize | None = None
    country: str | None = None
    website: str | None = None
    annual_revenue: float | None = Field(default=None, ge=0)
    status: CompanyStatus | None = None
    owner_id: int | None = None


class Customer360(BaseModel):
    company: CompanyRead
    customer_since: datetime | None
    lifetime_value: float
    total_deals: int
    won_deals: int
    open_deals: int
    lost_deals: int
    contact_count: int
    last_communication_at: datetime | None
    last_communication_type: ActivityType | None
