from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.pagination import Page
from app.db.session import get_db
from app.models.enums import CompanyStatus
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyRead, CompanyUpdate, Customer360
from app.services import company_service

router = APIRouter(prefix="/companies", tags=["CRM - Companies"])


@router.get("", response_model=Page[CompanyRead])
def list_companies(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    industry: str | None = None,
    country: str | None = None,
    status: CompanyStatus | None = None,
    owner_id: int | None = None,
    sort_by: str = "created_at",
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return company_service.list_companies(db, current_user, page, page_size, search, industry, country, status, owner_id, sort_by, sort_dir)


@router.post("", response_model=CompanyRead, status_code=201)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return company_service.create_company(db, current_user, payload)


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return company_service.get_company_or_404(db, current_user, company_id)


@router.get("/{company_id}/360", response_model=Customer360)
def get_company_360(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return company_service.get_customer_360(db, current_user, company_id)


@router.patch("/{company_id}", response_model=CompanyRead)
def update_company(company_id: int, payload: CompanyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return company_service.update_company(db, current_user, company_id, payload)


@router.delete("/{company_id}", status_code=204)
def delete_company(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company_service.delete_company(db, current_user, company_id)
