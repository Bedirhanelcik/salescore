from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import LeadSource, LeadStatus


class Lead(Base, TimestampMixin):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    source: Mapped[LeadSource] = mapped_column(Enum(LeadSource, native_enum=False, length=20), nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, native_enum=False, length=20), default=LeadStatus.NEW, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    converted_deal_id: Mapped[int | None] = mapped_column(ForeignKey("deals.id"), nullable=True)

    owner = relationship("User", foreign_keys=[owner_id])
    converted_deal = relationship("Deal", foreign_keys=[converted_deal_id])
