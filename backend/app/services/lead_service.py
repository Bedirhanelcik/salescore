from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.audit import record_audit
from app.core.exceptions import ConflictError, NotFoundError
from app.core.pagination import paginate
from app.core.rbac import assert_can_access_owned_record, assert_can_modify_owned_record, require_write_access, scope_to_owner_only
from app.models.company import Company
from app.models.deal import Deal, DealStageHistory
from app.models.enums import DealStage, LeadSource, LeadStatus
from app.models.lead import Lead
from app.models.user import User
from app.schemas.lead import LeadConvertRequest, LeadCreate, LeadUpdate
from app.services.notification_service import notify


def list_leads(
    db: Session,
    user: User,
    page: int,
    page_size: int,
    search: str | None = None,
    status: LeadStatus | None = None,
    source: LeadSource | None = None,
    owner_id: int | None = None,
):
    stmt = select(Lead).options(joinedload(Lead.owner))

    if scope_to_owner_only(user):
        stmt = stmt.where(Lead.owner_id == user.id)
    elif owner_id:
        stmt = stmt.where(Lead.owner_id == owner_id)

    if search:
        stmt = stmt.where(Lead.name.ilike(f"%{search}%"))
    if status:
        stmt = stmt.where(Lead.status == status)
    if source:
        stmt = stmt.where(Lead.source == source)

    stmt = stmt.order_by(Lead.created_at.desc())
    return paginate(db, stmt, page, page_size)


def get_lead_or_404(db: Session, user: User, lead_id: int) -> Lead:
    lead = db.execute(select(Lead).options(joinedload(Lead.owner)).where(Lead.id == lead_id)).scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead", lead_id)
    assert_can_access_owned_record(user, lead.owner_id)
    return lead


def create_lead(db: Session, user: User, data: LeadCreate) -> Lead:
    require_write_access(user)
    lead = Lead(**data.model_dump(exclude={"owner_id"}), owner_id=data.owner_id or user.id)
    db.add(lead)
    db.flush()
    record_audit(db, user_id=user.id, action="create", entity_type="lead", entity_id=lead.id, entity_label=lead.name)
    if lead.owner_id:
        notify(
            db,
            user_id=lead.owner_id,
            type_="new_lead",
            title="New lead assigned",
            message=f"You have a new lead: {lead.name}.",
            related_entity_type="lead",
            related_entity_id=lead.id,
        )
    db.commit()
    db.refresh(lead)
    return lead


def update_lead(db: Session, user: User, lead_id: int, data: LeadUpdate) -> Lead:
    lead = get_lead_or_404(db, user, lead_id)
    assert_can_modify_owned_record(user, lead.owner_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    record_audit(db, user_id=user.id, action="update", entity_type="lead", entity_id=lead.id, entity_label=lead.name)
    db.commit()
    db.refresh(lead)
    return lead


def delete_lead(db: Session, user: User, lead_id: int) -> None:
    lead = get_lead_or_404(db, user, lead_id)
    assert_can_modify_owned_record(user, lead.owner_id)
    record_audit(db, user_id=user.id, action="delete", entity_type="lead", entity_id=lead.id, entity_label=lead.name)
    db.delete(lead)
    db.commit()


def convert_lead(db: Session, user: User, lead_id: int, data: LeadConvertRequest) -> Deal:
    lead = get_lead_or_404(db, user, lead_id)
    assert_can_modify_owned_record(user, lead.owner_id)

    if lead.status == LeadStatus.CONVERTED:
        raise ConflictError("This lead has already been converted.", code="LEAD_ALREADY_CONVERTED")

    company = None
    if lead.company_name:
        company = db.execute(select(Company).where(Company.name == lead.company_name)).scalar_one_or_none()
        if not company:
            company = Company(name=lead.company_name, owner_id=lead.owner_id or user.id)
            db.add(company)
            db.flush()

    deal = Deal(
        title=data.deal_title or f"{lead.company_name or lead.name} - New Business",
        company_id=company.id if company else None,
        owner_id=lead.owner_id or user.id,
        value=data.deal_value,
        stage=DealStage.QUALIFIED,
        source=lead.source,
        expected_close_date=data.expected_close_date,
    )
    db.add(deal)
    db.flush()
    db.add(DealStageHistory(deal_id=deal.id, from_stage=None, to_stage=DealStage.QUALIFIED, changed_by_id=user.id, note="Converted from lead"))

    lead.status = LeadStatus.CONVERTED
    lead.converted_deal_id = deal.id

    record_audit(db, user_id=user.id, action="convert", entity_type="lead", entity_id=lead.id, entity_label=lead.name, metadata={"deal_id": deal.id})
    db.commit()
    db.refresh(deal)
    return deal
