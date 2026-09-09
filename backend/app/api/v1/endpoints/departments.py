from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentUpdate
from app.services import department_service

router = APIRouter(prefix="/departments", tags=["YBS - Departments"])


@router.get("", response_model=list[DepartmentRead])
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = department_service.list_departments(db)
    return [DepartmentRead(id=r["department"].id, name=r["department"].name, description=r["department"].description, employee_count=r["employee_count"]) for r in rows]


@router.post("", response_model=DepartmentRead, status_code=201)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    dept = department_service.create_department(db, current_user, payload)
    return DepartmentRead(id=dept.id, name=dept.name, description=dept.description, employee_count=0)


@router.patch("/{department_id}", response_model=DepartmentRead)
def update_department(department_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    dept = department_service.update_department(db, current_user, department_id, payload)
    return DepartmentRead(id=dept.id, name=dept.name, description=dept.description, employee_count=len(dept.employees))


@router.delete("/{department_id}", status_code=204)
def delete_department(department_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    department_service.delete_department(db, current_user, department_id)
