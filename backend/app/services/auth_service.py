from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, ConflictError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import UserRole
from app.models.user import User


def authenticate(db: Session, email: str, password: str) -> User:
    user = db.execute(select(User).where(User.email == email.lower())).scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise AppException(code="INVALID_CREDENTIALS", message="Invalid email or password.", status_code=401)
    if not user.is_active:
        raise AppException(code="ACCOUNT_DISABLED", message="This account has been disabled.", status_code=403)
    user.last_login_at = datetime.now(UTC)
    db.commit()
    return user


def issue_token(user: User) -> str:
    return create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})


def register(db: Session, email: str, password: str, full_name: str) -> User:
    email = email.lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise ConflictError("An account with this email already exists.", code="EMAIL_TAKEN")

    # The very first account in a fresh workspace bootstraps as Admin so there is always
    # someone able to manage employees/departments. Everyone after that self-registers as
    # a Sales Rep: the RBAC rule for that role (see app.core.rbac.scope_to_owner_only)
    # scopes every list/dashboard/analytics query to records the user themselves owns, so
    # a new signup starts with a genuinely empty CRM/dashboard instead of immediately
    # seeing the whole company's existing pipeline and revenue. An admin or manager can
    # still promote the account to Viewer/Analyst/Manager for org-wide visibility later.
    user_count = db.execute(select(func.count()).select_from(User)).scalar_one()
    role = UserRole.ADMIN if user_count == 0 else UserRole.SALES_REP

    user = User(email=email, password_hash=hash_password(password), full_name=full_name, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password_hash):
        raise AppException(code="INVALID_CREDENTIALS", message="Current password is incorrect.", status_code=401)
    user.password_hash = hash_password(new_password)
    db.commit()
