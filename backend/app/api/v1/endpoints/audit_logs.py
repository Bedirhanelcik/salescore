from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.deps import require_roles
from app.core.pagination import Page, paginate
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.audit_log import AuditLogRead

router = APIRouter(prefix="/audit-logs", tags=["YBS - Audit Log"])


@router.get("", response_model=Page[AuditLogRead])
def list_audit_logs(
    page: int = 1,
    page_size: int = 30,
    entity_type: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST)),
):
    stmt = select(AuditLog).options(joinedload(AuditLog.user))
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    stmt = stmt.order_by(AuditLog.created_at.desc())
    return paginate(db, stmt, page, page_size)
