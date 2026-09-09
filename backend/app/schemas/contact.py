from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserBrief


class CompanyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ContactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    job_title: str | None
    company: CompanyBrief | None
    owner: UserBrief | None
    created_at: datetime
    updated_at: datetime


class ContactCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str | None = None
    phone: str | None = None
    job_title: str | None = None
    company_id: int | None = None
    owner_id: int | None = None


class ContactUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = None
    phone: str | None = None
    job_title: str | None = None
    company_id: int | None = None
    owner_id: int | None = None
