from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.exceptions import ConflictError, NotFoundError
from app.models.department import Department
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentUpdate


def list_departments(db: Session) -> list[dict]:
    stmt = (
        select(Department, func.count(User.id))
        .outerjoin(User, User.department_id == Department.id)
        .group_by(Department.id)
        .order_by(Department.name)
    )
    return [{"department": dept, "employee_count": count} for dept, count in db.execute(stmt).all()]


def get_department_or_404(db: Session, department_id: int) -> Department:
    department = db.get(Department, department_id)
    if not department:
        raise NotFoundError("Department", department_id)
    return department


def create_department(db: Session, actor: User, data: DepartmentCreate) -> Department:
    existing = db.execute(select(Department).where(Department.name == data.name)).scalar_one_or_none()
    if existing:
        raise ConflictError("A department with this name already exists.", code="DEPARTMENT_EXISTS")
    department = Department(**data.model_dump())
    db.add(department)
    db.flush()
    record_audit(
        db,
        user_id=actor.id,
        action="create",
        entity_type="department",
        entity_id=department.id,
        entity_label=department.name,
    )
    db.commit()
    db.refresh(department)
    return department


def update_department(db: Session, actor: User, department_id: int, data: DepartmentUpdate) -> Department:
    department = get_department_or_404(db, department_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(department, field, value)
    record_audit(
        db,
        user_id=actor.id,
        action="update",
        entity_type="department",
        entity_id=department.id,
        entity_label=department.name,
    )
    db.commit()
    db.refresh(department)
    return department


def delete_department(db: Session, actor: User, department_id: int) -> None:
    department = get_department_or_404(db, department_id)
    record_audit(
        db,
        user_id=actor.id,
        action="delete",
        entity_type="department",
        entity_id=department.id,
        entity_label=department.name,
    )
    db.delete(department)
    db.commit()
