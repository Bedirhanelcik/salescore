from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.audit import record_audit
from app.core.exceptions import ConflictError, NotFoundError
from app.core.pagination import paginate
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

AVATAR_PALETTE = ["#4F46E5", "#0EA5E9", "#059669", "#D97706", "#DC2626", "#7C3AED", "#DB2777", "#0891B2"]


def list_users(
    db: Session,
    page: int,
    page_size: int,
    search: str | None = None,
    department_id: int | None = None,
    role: UserRole | None = None,
):
    stmt = select(User).options(joinedload(User.department))
    if search:
        stmt = stmt.where(User.full_name.ilike(f"%{search}%"))
    if department_id:
        stmt = stmt.where(User.department_id == department_id)
    if role:
        stmt = stmt.where(User.role == role)
    stmt = stmt.order_by(User.full_name.asc())
    return paginate(db, stmt, page, page_size)


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.execute(select(User).options(joinedload(User.department)).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise NotFoundError("Employee", user_id)
    return user


def create_user(db: Session, actor: User, data: UserCreate) -> User:
    existing = db.execute(select(User).where(User.email == data.email.lower())).scalar_one_or_none()
    if existing:
        raise ConflictError("A user with this email already exists.", code="EMAIL_TAKEN")

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
        job_title=data.job_title,
        department_id=data.department_id,
        manager_id=data.manager_id,
        avatar_color=AVATAR_PALETTE[hash(data.email) % len(AVATAR_PALETTE)],
    )
    db.add(user)
    db.flush()
    record_audit(db, user_id=actor.id, action="create", entity_type="employee", entity_id=user.id, entity_label=user.full_name)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, actor: User, user_id: int, data: UserUpdate) -> User:
    user = get_user_or_404(db, user_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    record_audit(db, user_id=actor.id, action="update", entity_type="employee", entity_id=user.id, entity_label=user.full_name)
    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, actor: User, user_id: int) -> User:
    user = get_user_or_404(db, user_id)
    user.is_active = False
    record_audit(db, user_id=actor.id, action="deactivate", entity_type="employee", entity_id=user.id, entity_label=user.full_name)
    db.commit()
    db.refresh(user)
    return user
