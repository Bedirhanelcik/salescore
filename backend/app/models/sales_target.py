from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import TargetPeriod


class SalesTarget(Base, TimestampMixin):
    __tablename__ = "sales_targets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    period: Mapped[TargetPeriod] = mapped_column(Enum(TargetPeriod, native_enum=False, length=20), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    target_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    employee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)

    employee = relationship("User", foreign_keys=[employee_id])
    department = relationship("Department", foreign_keys=[department_id])
