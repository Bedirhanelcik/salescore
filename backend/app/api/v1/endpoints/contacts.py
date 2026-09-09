from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.pagination import Page
from app.db.session import get_db
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactRead, ContactUpdate
from app.services import contact_service

router = APIRouter(prefix="/contacts", tags=["CRM - Contacts"])


@router.get("", response_model=Page[ContactRead])
def list_contacts(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    company_id: int | None = None,
    owner_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return contact_service.list_contacts(db, current_user, page, page_size, search, company_id, owner_id)


@router.post("", response_model=ContactRead, status_code=201)
def create_contact(
    payload: ContactCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return contact_service.create_contact(db, current_user, payload)


@router.get("/{contact_id}", response_model=ContactRead)
def get_contact(contact_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return contact_service.get_contact_or_404(db, current_user, contact_id)


@router.patch("/{contact_id}", response_model=ContactRead)
def update_contact(
    contact_id: int,
    payload: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return contact_service.update_contact(db, current_user, contact_id, payload)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contact_service.delete_contact(db, current_user, contact_id)
