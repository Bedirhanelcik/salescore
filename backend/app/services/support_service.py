import re

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.cache import get_cache
from app.core.config import settings
from app.core.email import send_email
from app.core.exceptions import AppException, ForbiddenError, NotFoundError
from app.core.pagination import paginate
from app.models.enums import SupportStatus, UserRole
from app.models.support_ticket import SupportTicket
from app.models.user import User
from app.schemas.support import SupportTicketCreate

TICKET_LOAD_OPTIONS = [joinedload(SupportTicket.user)]

# Strips CR/LF so user-supplied text can never smuggle extra headers or forge a
# multi-message body when it's placed into an email Subject/body (classic header/
# SMTP injection via a crafted "subject\r\nBcc: attacker@...").
_CRLF = re.compile(r"[\r\n]+")


def _clean(value: str) -> str:
    return _CRLF.sub(" ", value).strip()


def _rate_limit_key(user_id: int) -> str:
    return f"support_rate:{user_id}"


def _check_rate_limit(user: User) -> None:
    cache = get_cache()
    key = _rate_limit_key(user.id)
    count = cache.get(key) or 0
    if count >= settings.SUPPORT_TICKETS_PER_HOUR:
        raise AppException(
            code="RATE_LIMITED",
            message=f"You can submit up to {settings.SUPPORT_TICKETS_PER_HOUR} support requests per hour. "
            "Please try again later.",
            status_code=429,
        )
    cache.set(key, count + 1, ttl_seconds=3600)


def create_ticket(db: Session, user: User, data: SupportTicketCreate) -> SupportTicket:
    _check_rate_limit(user)

    name = _clean(data.name)
    subject = _clean(data.subject)
    message = data.message.strip()

    ticket = SupportTicket(
        user_id=user.id,
        name=name,
        email=data.email,
        subject=subject,
        category=data.category,
        message=message,
        status=SupportStatus.OPEN,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    if settings.SUPPORT_EMAIL:
        body = (
            f"New SalesCore support ticket #{ticket.id}\n\n"
            f"From: {name} <{data.email}>\n"
            f"Category: {data.category.value}\n"
            f"Submitted by user: {user.full_name} (id {user.id})\n\n"
            f"Subject: {subject}\n\n"
            f"{message}\n"
        )
        ticket.email_sent = send_email(to=settings.SUPPORT_EMAIL, subject=f"[SalesCore Support] {subject}", body=body)
        db.commit()
        db.refresh(ticket)

    return ticket


def list_my_tickets(db: Session, user: User, page: int, page_size: int):
    stmt = (
        select(SupportTicket)
        .options(*TICKET_LOAD_OPTIONS)
        .where(SupportTicket.user_id == user.id)
        .order_by(SupportTicket.created_at.desc())
    )
    return paginate(db, stmt, page, page_size)


def list_all_tickets(db: Session, page: int, page_size: int, status: SupportStatus | None = None):
    stmt = select(SupportTicket).options(*TICKET_LOAD_OPTIONS).order_by(SupportTicket.created_at.desc())
    if status:
        stmt = stmt.where(SupportTicket.status == status)
    return paginate(db, stmt, page, page_size)


def get_ticket_or_404(db: Session, user: User, ticket_id: int) -> SupportTicket:
    ticket = db.execute(
        select(SupportTicket).options(*TICKET_LOAD_OPTIONS).where(SupportTicket.id == ticket_id)
    ).scalar_one_or_none()
    if not ticket:
        raise NotFoundError("Support ticket", ticket_id)
    # Support tickets are a personal channel to the SalesCore team, not a CRM business
    # record - only the submitter and an Admin may view it (deliberately narrower than
    # app.core.rbac.has_full_visibility, which would also let Manager/Analyst/Viewer in).
    if user.role != UserRole.ADMIN and ticket.user_id != user.id:
        raise ForbiddenError("You can only access your own support tickets.")
    return ticket


def update_status(db: Session, ticket_id: int, status: SupportStatus) -> SupportTicket:
    ticket = db.execute(
        select(SupportTicket).options(*TICKET_LOAD_OPTIONS).where(SupportTicket.id == ticket_id)
    ).scalar_one_or_none()
    if not ticket:
        raise NotFoundError("Support ticket", ticket_id)
    ticket.status = status
    db.commit()
    db.refresh(ticket)
    return ticket
