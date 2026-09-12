from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.core.pagination import paginate
from app.models.enums import NotificationType
from app.models.notification import Notification
from app.models.user import User


def notify(
    db: Session,
    *,
    user_id: int,
    type_: str,
    title: str,
    message: str,
    params: dict | None = None,
    related_entity_type: str | None = None,
    related_entity_id: int | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=NotificationType(type_),
        title=title,
        message=message,
        params=params,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
    )
    db.add(notification)
    db.flush()
    return notification


def list_notifications(db: Session, user: User, page: int, page_size: int, unread_only: bool = False):
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc())
    return paginate(db, stmt, page, page_size)


def unread_count(db: Session, user: User) -> int:
    stmt = select(func.count()).where(Notification.user_id == user.id, Notification.is_read.is_(False))
    return db.execute(stmt).scalar_one()


def mark_read(db: Session, user: User, notification_id: int) -> Notification:
    notification = db.get(Notification, notification_id)
    if not notification or notification.user_id != user.id:
        raise NotFoundError("Notification", notification_id)
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_read(db: Session, user: User) -> None:
    stmt = select(Notification).where(Notification.user_id == user.id, Notification.is_read.is_(False))
    for notification in db.execute(stmt).scalars().all():
        notification.is_read = True
    db.commit()
