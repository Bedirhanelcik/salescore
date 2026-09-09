from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import ActivityStatus, ActivityType


class Activity(Base, TimestampMixin):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[ActivityType] = mapped_column(Enum(ActivityType, native_enum=False, length=20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ActivityStatus] = mapped_column(
        Enum(ActivityStatus, native_enum=False, length=20), default=ActivityStatus.PLANNED, nullable=False
    )
    activity_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True)
    contact_id: Mapped[int | None] = mapped_column(ForeignKey("contacts.id"), nullable=True)
    deal_id: Mapped[int | None] = mapped_column(ForeignKey("deals.id"), nullable=True)

    owner = relationship("User", foreign_keys=[owner_id])
    company = relationship("Company", foreign_keys=[company_id])
    contact = relationship("Contact", foreign_keys=[contact_id])
    deal = relationship("Deal", back_populates="activities")
