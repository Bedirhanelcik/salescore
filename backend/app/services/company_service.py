from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.audit import record_audit
from app.core.exceptions import NotFoundError
from app.core.pagination import paginate
from app.core.rbac import (
    assert_can_access_owned_record,
    assert_can_modify_owned_record,
    require_write_access,
    scope_to_owner_only,
)
from app.models.company import Company
from app.models.enums import CompanyStatus
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyUpdate


def list_companies(
    db: Session,
    user: User,
    page: int,
    page_size: int,
    search: str | None = None,
    industry: str | None = None,
    country: str | None = None,
    status: CompanyStatus | None = None,
    owner_id: int | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
):
    stmt = select(Company).options(joinedload(Company.owner))

    if scope_to_owner_only(user):
        stmt = stmt.where(Company.owner_id == user.id)
    elif owner_id:
        stmt = stmt.where(Company.owner_id == owner_id)

    if search:
        stmt = stmt.where(Company.name.ilike(f"%{search}%"))
    if industry:
        stmt = stmt.where(Company.industry == industry)
    if country:
        stmt = stmt.where(Company.country == country)
    if status:
        stmt = stmt.where(Company.status == status)

    sort_column = getattr(Company, sort_by, Company.created_at)
    stmt = stmt.order_by(sort_column.desc() if sort_dir == "desc" else sort_column.asc())

    return paginate(db, stmt, page, page_size)


def get_company_or_404(db: Session, user: User, company_id: int) -> Company:
    company = db.execute(
        select(Company).options(joinedload(Company.owner)).where(Company.id == company_id)
    ).scalar_one_or_none()
    if not company:
        raise NotFoundError("Company", company_id)
    assert_can_access_owned_record(user, company.owner_id)
    return company


def create_company(db: Session, user: User, data: CompanyCreate) -> Company:
    require_write_access(user)
    company = Company(**data.model_dump(exclude={"owner_id"}), owner_id=data.owner_id or user.id)
    db.add(company)
    db.flush()
    record_audit(
        db, user_id=user.id, action="create", entity_type="company", entity_id=company.id, entity_label=company.name
    )
    db.commit()
    db.refresh(company)
    return company


def update_company(db: Session, user: User, company_id: int, data: CompanyUpdate) -> Company:
    company = get_company_or_404(db, user, company_id)
    assert_can_modify_owned_record(user, company.owner_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    record_audit(
        db, user_id=user.id, action="update", entity_type="company", entity_id=company.id, entity_label=company.name
    )
    db.commit()
    db.refresh(company)
    return company


def delete_company(db: Session, user: User, company_id: int) -> None:
    company = get_company_or_404(db, user, company_id)
    assert_can_modify_owned_record(user, company.owner_id)
    record_audit(
        db, user_id=user.id, action="delete", entity_type="company", entity_id=company.id, entity_label=company.name
    )
    db.delete(company)
    db.commit()


def search_companies(db: Session, query: str, limit: int = 5) -> list[Company]:
    stmt = select(Company).where(Company.name.ilike(f"%{query}%")).limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_customer_360(db: Session, user: User, company_id: int) -> dict:
    from app.models.deal import Deal
    from app.models.enums import DealStage

    company = get_company_or_404(db, user, company_id)
    deals = list(db.execute(select(Deal).where(Deal.company_id == company_id)).scalars().all())

    won = [d for d in deals if d.stage == DealStage.WON]
    lost = [d for d in deals if d.stage == DealStage.LOST]
    open_deals = [d for d in deals if d.stage not in (DealStage.WON, DealStage.LOST)]
    lifetime_value = sum(float(d.value) for d in won)

    return {
        "company": company,
        "customer_since": company.created_at,
        "lifetime_value": lifetime_value,
        "total_deals": len(deals),
        "won_deals": len(won),
        "open_deals": len(open_deals),
        "lost_deals": len(lost),
    }
