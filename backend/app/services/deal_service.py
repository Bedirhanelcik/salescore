from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.audit import record_audit
from app.core.cache import get_cache
from app.core.exceptions import NotFoundError, ValidationAppError
from app.core.pagination import paginate
from app.core.rbac import (
    assert_can_access_owned_record,
    assert_can_modify_owned_record,
    require_write_access,
    scope_to_owner_only,
)
from app.models.deal import Deal, DealStageHistory
from app.models.enums import DEAL_STAGE_ORDER, DEAL_STAGE_TRANSITIONS, DealStage
from app.models.user import User
from app.schemas.deal import DealCreate, DealStageUpdate, DealUpdate
from app.services.notification_service import notify

DEAL_LOAD_OPTIONS = [joinedload(Deal.company), joinedload(Deal.contact), joinedload(Deal.owner)]


def list_deals(
    db: Session,
    user: User,
    page: int,
    page_size: int,
    stage: DealStage | None = None,
    owner_id: int | None = None,
    company_id: int | None = None,
    search: str | None = None,
    min_value: float | None = None,
    max_value: float | None = None,
    sort_by: str = "updated_at",
    sort_dir: str = "desc",
):
    stmt = select(Deal).options(*DEAL_LOAD_OPTIONS)

    if scope_to_owner_only(user):
        stmt = stmt.where(Deal.owner_id == user.id)
    elif owner_id:
        stmt = stmt.where(Deal.owner_id == owner_id)

    if stage:
        stmt = stmt.where(Deal.stage == stage)
    if company_id:
        stmt = stmt.where(Deal.company_id == company_id)
    if search:
        stmt = stmt.where(Deal.title.ilike(f"%{search}%"))
    if min_value is not None:
        stmt = stmt.where(Deal.value >= min_value)
    if max_value is not None:
        stmt = stmt.where(Deal.value <= max_value)

    sort_column = getattr(Deal, sort_by, Deal.updated_at)
    stmt = stmt.order_by(sort_column.desc() if sort_dir == "desc" else sort_column.asc())

    return paginate(db, stmt, page, page_size)


def get_deal_or_404(db: Session, user: User, deal_id: int) -> Deal:
    deal = db.execute(select(Deal).options(*DEAL_LOAD_OPTIONS).where(Deal.id == deal_id)).scalar_one_or_none()
    if not deal:
        raise NotFoundError("Deal", deal_id)
    assert_can_access_owned_record(user, deal.owner_id)
    return deal


def get_deal_history(db: Session, user: User, deal_id: int) -> list[DealStageHistory]:
    get_deal_or_404(db, user, deal_id)
    stmt = (
        select(DealStageHistory)
        .options(joinedload(DealStageHistory.changed_by))
        .where(DealStageHistory.deal_id == deal_id)
        .order_by(DealStageHistory.changed_at)
    )
    return list(db.execute(stmt).scalars().all())


def create_deal(db: Session, user: User, data: DealCreate) -> Deal:
    require_write_access(user)
    deal = Deal(**data.model_dump(exclude={"owner_id"}), owner_id=data.owner_id or user.id)
    db.add(deal)
    db.flush()
    db.add(
        DealStageHistory(
            deal_id=deal.id, from_stage=None, to_stage=deal.stage, changed_by_id=user.id, note="Deal created"
        )
    )
    record_audit(db, user_id=user.id, action="create", entity_type="deal", entity_id=deal.id, entity_label=deal.title)
    get_cache().delete_prefix("analytics:")
    db.commit()
    db.refresh(deal)
    return deal


def update_deal(db: Session, user: User, deal_id: int, data: DealUpdate) -> Deal:
    deal = get_deal_or_404(db, user, deal_id)
    assert_can_modify_owned_record(user, deal.owner_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(deal, field, value)
    record_audit(db, user_id=user.id, action="update", entity_type="deal", entity_id=deal.id, entity_label=deal.title)
    get_cache().delete_prefix("analytics:")
    db.commit()
    db.refresh(deal)
    return deal


def delete_deal(db: Session, user: User, deal_id: int) -> None:
    deal = get_deal_or_404(db, user, deal_id)
    assert_can_modify_owned_record(user, deal.owner_id)
    record_audit(db, user_id=user.id, action="delete", entity_type="deal", entity_id=deal.id, entity_label=deal.title)
    db.delete(deal)
    get_cache().delete_prefix("analytics:")
    db.commit()


def change_deal_stage(db: Session, user: User, deal_id: int, data: DealStageUpdate) -> Deal:
    deal = get_deal_or_404(db, user, deal_id)
    assert_can_modify_owned_record(user, deal.owner_id)

    if deal.stage == data.stage:
        return deal

    allowed = DEAL_STAGE_TRANSITIONS.get(deal.stage, set())
    if data.stage not in allowed:
        raise ValidationAppError(
            f"Cannot move a deal from '{deal.stage.value}' to '{data.stage.value}'. "
            f"Allowed next stages: {', '.join(s.value for s in allowed) or 'none (terminal stage)'}.",
            code="INVALID_STAGE_TRANSITION",
        )

    from_stage = deal.stage
    deal.stage = data.stage
    deal.last_activity_at = datetime.now(UTC)

    if data.stage == DealStage.WON:
        deal.probability = 100
        deal.actual_close_date = date.today()
    elif data.stage == DealStage.LOST:
        deal.probability = 0
        deal.actual_close_date = date.today()
        deal.lost_reason = data.lost_reason
    else:
        stage_index = DEAL_STAGE_ORDER.index(data.stage) if data.stage in DEAL_STAGE_ORDER else 0
        deal.probability = min(90, 10 + stage_index * 18)

    db.add(
        DealStageHistory(
            deal_id=deal.id, from_stage=from_stage, to_stage=data.stage, changed_by_id=user.id, note=data.note
        )
    )
    record_audit(
        db,
        user_id=user.id,
        action="stage_change",
        entity_type="deal",
        entity_id=deal.id,
        entity_label=deal.title,
        metadata={"from": from_stage.value, "to": data.stage.value},
    )

    if deal.owner_id:
        if data.stage == DealStage.WON:
            notify(
                db,
                user_id=deal.owner_id,
                type_="deal_won",
                title="Deal won!",
                message=f"'{deal.title}' was marked as Won.",
                related_entity_type="deal",
                related_entity_id=deal.id,
            )
        elif data.stage == DealStage.LOST:
            notify(
                db,
                user_id=deal.owner_id,
                type_="deal_lost",
                title="Deal lost",
                message=f"'{deal.title}' was marked as Lost.",
                related_entity_type="deal",
                related_entity_id=deal.id,
            )

    get_cache().delete_prefix("analytics:")
    db.commit()
    db.refresh(deal)
    return deal
