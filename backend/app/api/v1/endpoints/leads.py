from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.pagination import Page
from app.db.session import get_db
from app.models.enums import LeadSource, LeadStatus
from app.models.user import User
from app.schemas.deal import DealRead
from app.schemas.lead import LeadConvertRequest, LeadCreate, LeadRead, LeadUpdate
from app.services import lead_service

router = APIRouter(prefix="/leads", tags=["CRM - Leads"])


@router.get("", response_model=Page[LeadRead])
def list_leads(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    status: LeadStatus | None = None,
    source: LeadSource | None = None,
    owner_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lead_service.list_leads(db, current_user, page, page_size, search, status, source, owner_id)


@router.post("", response_model=LeadRead, status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return lead_service.create_lead(db, current_user, payload)


@router.get("/{lead_id}", response_model=LeadRead)
def get_lead(lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return lead_service.get_lead_or_404(db, current_user, lead_id)


@router.patch("/{lead_id}", response_model=LeadRead)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return lead_service.update_lead(db, current_user, lead_id, payload)


@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead_service.delete_lead(db, current_user, lead_id)


@router.post("/{lead_id}/convert", response_model=DealRead, status_code=201)
def convert_lead(lead_id: int, payload: LeadConvertRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return lead_service.convert_lead(db, current_user, lead_id, payload)
