from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.audit import record_audit
from app.core.exceptions import NotFoundError
from app.models.deal import Deal
from app.models.enums import DealStage
from app.models.sales_target import SalesTarget
from app.models.user import User
from app.schemas.sales_target import SalesTargetCreate
from app.services.notification_service import notify


def _actual_amount(db: Session, target: SalesTarget) -> float:
    stmt = select(func.coalesce(func.sum(Deal.value), 0)).where(
        Deal.stage == DealStage.WON,
        Deal.actual_close_date >= target.period_start,
        Deal.actual_close_date <= target.period_end,
    )
    if target.employee_id:
        stmt = stmt.where(Deal.owner_id == target.employee_id)
    elif target.department_id:
        stmt = stmt.join(User, User.id == Deal.owner_id).where(User.department_id == target.department_id)
    return float(db.execute(stmt).scalar_one())


def list_targets(db: Session, employee_id: int | None = None, department_id: int | None = None) -> list[dict]:
    stmt = select(SalesTarget).options(joinedload(SalesTarget.employee), joinedload(SalesTarget.department))
    if employee_id:
        stmt = stmt.where(SalesTarget.employee_id == employee_id)
    if department_id:
        stmt = stmt.where(SalesTarget.department_id == department_id)
    stmt = stmt.order_by(SalesTarget.period_start.desc())

    results = []
    for target in db.execute(stmt).scalars().all():
        actual = _actual_amount(db, target)
        achievement = round((actual / float(target.target_amount)) * 100, 1) if target.target_amount else 0
        results.append({"target": target, "actual_amount": actual, "achievement_pct": achievement})
    return results


def create_target(db: Session, actor: User, data: SalesTargetCreate) -> SalesTarget:
    target = SalesTarget(**data.model_dump())
    db.add(target)
    record_audit(db, user_id=actor.id, action="create", entity_type="sales_target", entity_label=target.name)
    db.commit()
    db.refresh(target)
    return target


def delete_target(db: Session, actor: User, target_id: int) -> None:
    target = db.get(SalesTarget, target_id)
    if not target:
        raise NotFoundError("Sales target", target_id)
    record_audit(db, user_id=actor.id, action="delete", entity_type="sales_target", entity_id=target.id, entity_label=target.name)
    db.delete(target)
    db.commit()


def check_target_achievements(db: Session) -> None:
    """Notify employees whose personal target has just been reached (called after seeding / periodically)."""
    for row in list_targets(db):
        target = row["target"]
        if target.employee_id and row["achievement_pct"] >= 100:
            notify(
                db,
                user_id=target.employee_id,
                type_="target_reached",
                title="Target reached!",
                message=f"You reached your target '{target.name}' ({row['achievement_pct']}%).",
                related_entity_type="sales_target",
                related_entity_id=target.id,
            )
    db.commit()
