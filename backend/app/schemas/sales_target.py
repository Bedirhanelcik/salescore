from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TargetPeriod
from app.schemas.department import DepartmentBrief
from app.schemas.user import UserBrief


class SalesTargetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    period: TargetPeriod
    period_start: date
    period_end: date
    target_amount: float
    employee: UserBrief | None
    department: DepartmentBrief | None
    actual_amount: float = 0
    achievement_pct: float = 0


class SalesTargetCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    period: TargetPeriod
    period_start: date
    period_end: date
    target_amount: float = Field(gt=0)
    employee_id: int | None = None
    department_id: int | None = None
