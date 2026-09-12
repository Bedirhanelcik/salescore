from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import SupportCategory, SupportStatus
from app.schemas.user import UserBrief


class SupportTicketCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    subject: str = Field(min_length=4, max_length=200)
    category: SupportCategory = SupportCategory.GENERAL
    message: str = Field(min_length=10, max_length=4000)


class SupportTicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    subject: str
    category: SupportCategory
    message: str
    status: SupportStatus
    email_sent: bool
    user: UserBrief | None
    created_at: datetime
    updated_at: datetime


class SupportTicketStatusUpdate(BaseModel):
    status: SupportStatus
