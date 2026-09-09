from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.pagination import Page
from app.db.session import get_db
from app.models.enums import ActivityType
from app.models.user import User
from app.schemas.activity import ActivityCreate, ActivityRead, ActivityUpdate
from app.services import activity_service

router = APIRouter(prefix="/activities", tags=["CRM - Activities"])


@router.get("", response_model=Page[ActivityRead])
def list_activities(
    page: int = 1,
    page_size: int = 20,
    type: ActivityType | None = None,
    company_id: int | None = None,
    deal_id: int | None = None,
    owner_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return activity_service.list_activities(db, current_user, page, page_size, type, company_id, deal_id, owner_id)


@router.post("", response_model=ActivityRead, status_code=201)
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return activity_service.create_activity(db, current_user, payload)


@router.get("/{activity_id}", response_model=ActivityRead)
def get_activity(activity_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return activity_service.get_activity_or_404(db, current_user, activity_id)


@router.patch("/{activity_id}", response_model=ActivityRead)
def update_activity(activity_id: int, payload: ActivityUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return activity_service.update_activity(db, current_user, activity_id, payload)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    activity_service.delete_activity(db, current_user, activity_id)
