from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User


def authenticate(db: Session, email: str, password: str) -> User:
    user = db.execute(select(User).where(User.email == email.lower())).scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise AppException(code="INVALID_CREDENTIALS", message="Invalid email or password.", status_code=401)
    if not user.is_active:
        raise AppException(code="ACCOUNT_DISABLED", message="This account has been disabled.", status_code=403)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return user


def issue_token(user: User) -> str:
    return create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password_hash):
        raise AppException(code="INVALID_CREDENTIALS", message="Current password is incorrect.", status_code=401)
    user.password_hash = hash_password(new_password)
    db.commit()
