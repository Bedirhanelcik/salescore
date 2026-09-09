from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.core.pagination import Page
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/employees", tags=["YBS - Employees"])


@router.get("", response_model=Page[UserRead])
def list_employees(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    department_id: int | None = None,
    role: UserRole | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_service.list_users(db, page, page_size, search, department_id, role)


@router.post("", response_model=UserRead, status_code=201)
def create_employee(
    payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))
):
    return user_service.create_user(db, current_user, payload)


@router.get("/{user_id}", response_model=UserRead)
def get_employee(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_service.get_user_or_404(db, user_id)


@router.patch("/{user_id}", response_model=UserRead)
def update_employee(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    return user_service.update_user(db, current_user, user_id, payload)


@router.delete("/{user_id}", response_model=UserRead)
def deactivate_employee(
    user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))
):
    return user_service.deactivate_user(db, current_user, user_id)
