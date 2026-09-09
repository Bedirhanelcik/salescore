from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow
from app.models.enums import DealStage, LeadSource


class Deal(Base, TimestampMixin):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)

    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True)
    contact_id: Mapped[int | None] = mapped_column(ForeignKey("contacts.id"), nullable=True)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    value: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    probability: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    stage: Mapped[DealStage] = mapped_column(
        Enum(DealStage, native_enum=False, length=20), default=DealStage.LEAD, nullable=False, index=True
    )
    source: Mapped[LeadSource | None] = mapped_column(Enum(LeadSource, native_enum=False, length=20), nullable=True)

    expected_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    lost_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    company = relationship("Company", back_populates="deals")
    contact = relationship("Contact", foreign_keys=[contact_id])
    owner = relationship("User", foreign_keys=[owner_id])
    stage_history = relationship(
        "DealStageHistory", back_populates="deal", cascade="all, delete-orphan", order_by="DealStageHistory.changed_at"
    )
    activities = relationship("Activity", back_populates="deal")


class DealStageHistory(Base):
    __tablename__ = "deal_stage_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    deal_id: Mapped[int] = mapped_column(ForeignKey("deals.id"), nullable=False, index=True)
    from_stage: Mapped[DealStage | None] = mapped_column(Enum(DealStage, native_enum=False, length=20), nullable=True)
    to_stage: Mapped[DealStage] = mapped_column(Enum(DealStage, native_enum=False, length=20), nullable=False)
    changed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    deal = relationship("Deal", back_populates="stage_history")
    changed_by = relationship("User", foreign_keys=[changed_by_id])
