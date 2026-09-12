from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.core.pagination import Page
from app.db.session import get_db
from app.models.enums import SupportStatus, UserRole
from app.models.user import User
from app.schemas.support import SupportTicketCreate, SupportTicketRead, SupportTicketStatusUpdate
from app.services import support_service

router = APIRouter(prefix="/support", tags=["Support"])


@router.post("/tickets", response_model=SupportTicketRead, status_code=201)
def create_ticket(
    payload: SupportTicketCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return support_service.create_ticket(db, current_user, payload)


@router.get("/tickets", response_model=Page[SupportTicketRead])
def list_my_tickets(
    page: int = 1, page_size: int = 20, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return support_service.list_my_tickets(db, current_user, page, page_size)


@router.get("/tickets/{ticket_id}", response_model=SupportTicketRead)
def get_ticket(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return support_service.get_ticket_or_404(db, current_user, ticket_id)


@router.get("/admin/tickets", response_model=Page[SupportTicketRead])
def list_all_tickets(
    status: SupportStatus | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    return support_service.list_all_tickets(db, page, page_size, status)


@router.patch("/admin/tickets/{ticket_id}/status", response_model=SupportTicketRead)
def update_ticket_status(
    ticket_id: int,
    payload: SupportTicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    return support_service.update_status(db, ticket_id, payload.status)
