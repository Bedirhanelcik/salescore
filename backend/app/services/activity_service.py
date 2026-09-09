from datetime import UTC, datetime

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
from app.models.activity import Activity
from app.models.deal import Deal
from app.models.enums import ActivityType
from app.models.user import User
from app.schemas.activity import ActivityCreate, ActivityUpdate

LOAD_OPTIONS = [joinedload(Activity.owner), joinedload(Activity.company)]


def list_activities(
    db: Session,
    user: User,
    page: int,
    page_size: int,
    type_: ActivityType | None = None,
    company_id: int | None = None,
    deal_id: int | None = None,
    owner_id: int | None = None,
):
    stmt = select(Activity).options(*LOAD_OPTIONS)

    if scope_to_owner_only(user):
        stmt = stmt.where(Activity.owner_id == user.id)
    elif owner_id:
        stmt = stmt.where(Activity.owner_id == owner_id)

    if type_:
        stmt = stmt.where(Activity.type == type_)
    if company_id:
        stmt = stmt.where(Activity.company_id == company_id)
    if deal_id:
        stmt = stmt.where(Activity.deal_id == deal_id)

    stmt = stmt.order_by(Activity.activity_date.desc())
    return paginate(db, stmt, page, page_size)


def get_activity_or_404(db: Session, user: User, activity_id: int) -> Activity:
    activity = db.execute(
        select(Activity).options(*LOAD_OPTIONS).where(Activity.id == activity_id)
    ).scalar_one_or_none()
    if not activity:
        raise NotFoundError("Activity", activity_id)
    assert_can_access_owned_record(user, activity.owner_id)
    return activity


def create_activity(db: Session, user: User, data: ActivityCreate) -> Activity:
    require_write_access(user)
    activity = Activity(**data.model_dump(exclude={"owner_id"}), owner_id=data.owner_id or user.id)
    db.add(activity)
    db.flush()

    if activity.deal_id:
        deal = db.get(Deal, activity.deal_id)
        if deal:
            deal.last_activity_at = datetime.now(UTC)

    record_audit(
        db, user_id=user.id, action="create", entity_type="activity", entity_id=activity.id, entity_label=activity.title
    )
    db.commit()
    db.refresh(activity)
    return activity


def update_activity(db: Session, user: User, activity_id: int, data: ActivityUpdate) -> Activity:
    activity = get_activity_or_404(db, user, activity_id)
    assert_can_modify_owned_record(user, activity.owner_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(activity, field, value)
    record_audit(
        db, user_id=user.id, action="update", entity_type="activity", entity_id=activity.id, entity_label=activity.title
    )
    db.commit()
    db.refresh(activity)
    return activity


def delete_activity(db: Session, user: User, activity_id: int) -> None:
    activity = get_activity_or_404(db, user, activity_id)
    assert_can_modify_owned_record(user, activity.owner_id)
    record_audit(
        db, user_id=user.id, action="delete", entity_type="activity", entity_id=activity.id, entity_label=activity.title
    )
    db.delete(activity)
    db.commit()
