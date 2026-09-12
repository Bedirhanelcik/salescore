from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import SupportCategory, SupportStatus


class SupportTicket(Base, TimestampMixin):
    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[SupportCategory] = mapped_column(
        Enum(SupportCategory, native_enum=False, length=20), default=SupportCategory.GENERAL, nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[SupportStatus] = mapped_column(
        Enum(SupportStatus, native_enum=False, length=20), default=SupportStatus.OPEN, nullable=False
    )
    # Whether the notification email to SUPPORT_EMAIL actually went out - kept separate from
    # `status` (which tracks support-team triage) so a misconfigured/unavailable email provider
    # never blocks ticket creation; see app.core.email.
    email_sent: Mapped[bool] = mapped_column(default=False, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
