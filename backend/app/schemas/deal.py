from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DealStage, LeadSource
from app.schemas.contact import CompanyBrief, ContactRead
from app.schemas.user import UserBrief


class DealRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    company: CompanyBrief | None
    contact: ContactRead | None
    owner: UserBrief | None
    value: float
    currency: str
    probability: int
    stage: DealStage
    source: LeadSource | None
    expected_close_date: date | None
    actual_close_date: date | None
    lost_reason: str | None
    last_activity_at: datetime | None
    created_at: datetime
    updated_at: datetime


class DealListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    company: CompanyBrief | None
    owner: UserBrief | None
    value: float
    currency: str
    probability: int
    stage: DealStage
    expected_close_date: date | None
    updated_at: datetime


class DealCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    company_id: int | None = None
    contact_id: int | None = None
    owner_id: int | None = None
    value: float = Field(default=0, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    probability: int = Field(default=20, ge=0, le=100)
    stage: DealStage = DealStage.LEAD
    source: LeadSource | None = None
    expected_close_date: date | None = None


class DealUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    company_id: int | None = None
    contact_id: int | None = None
    owner_id: int | None = None
    value: float | None = Field(default=None, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    source: LeadSource | None = None
    expected_close_date: date | None = None


class DealStageUpdate(BaseModel):
    stage: DealStage
    note: str | None = None
    lost_reason: str | None = None


class DealStageHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    from_stage: DealStage | None
    to_stage: DealStage
    changed_by: UserBrief | None
    changed_at: datetime
    note: str | None


class PipelineStageColumn(BaseModel):
    stage: DealStage
    label: str
    count: int
    total_value: float
    deals: list[DealListItem]


class PipelineBoard(BaseModel):
    columns: list[PipelineStageColumn]
