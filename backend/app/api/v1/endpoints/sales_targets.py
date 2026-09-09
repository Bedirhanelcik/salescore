from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.sales_target import SalesTargetCreate, SalesTargetRead
from app.services import sales_target_service

router = APIRouter(prefix="/sales-targets", tags=["YBS - Sales Targets"])


@router.get("", response_model=list[SalesTargetRead])
def list_targets(
    employee_id: int | None = None,
    department_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = sales_target_service.list_targets(db, employee_id, department_id)
    return [
        SalesTargetRead(
            id=r["target"].id, name=r["target"].name, period=r["target"].period,
            period_start=r["target"].period_start, period_end=r["target"].period_end,
            target_amount=float(r["target"].target_amount), employee=r["target"].employee,
            department=r["target"].department, actual_amount=r["actual_amount"], achievement_pct=r["achievement_pct"],
        )
        for r in rows
    ]


@router.post("", response_model=SalesTargetRead, status_code=201)
def create_target(payload: SalesTargetCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))):
    target = sales_target_service.create_target(db, current_user, payload)
    return SalesTargetRead(
        id=target.id, name=target.name, period=target.period, period_start=target.period_start,
        period_end=target.period_end, target_amount=float(target.target_amount), employee=target.employee,
        department=target.department, actual_amount=0, achievement_pct=0,
    )


@router.delete("/{target_id}", status_code=204)
def delete_target(target_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))):
    sales_target_service.delete_target(db, current_user, target_id)
