from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.audit import record_audit
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.pagination import paginate
from app.core.rbac import has_full_visibility, require_write_access
from app.models.enums import TaskStatus, UserRole
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate

LOAD_OPTIONS = [joinedload(Task.assignee), joinedload(Task.created_by)]


def _refresh_overdue(db: Session, tasks: list[Task]) -> None:
    now = datetime.now(UTC)
    changed = False
    for task in tasks:
        due_date = task.due_date
        if due_date and due_date.tzinfo is None:
            # SQLite doesn't round-trip tzinfo on DateTime columns, so a value read back
            # from the DB can come back naive even though it was written as UTC-aware.
            due_date = due_date.replace(tzinfo=UTC)
        if task.status in (TaskStatus.TODO, TaskStatus.IN_PROGRESS) and due_date and due_date < now:
            task.status = TaskStatus.OVERDUE
            changed = True
    if changed:
        db.commit()


def list_tasks(
    db: Session,
    user: User,
    page: int,
    page_size: int,
    status: TaskStatus | None = None,
    assignee_id: int | None = None,
    mine_only: bool = False,
    related_company_id: int | None = None,
    related_deal_id: int | None = None,
):
    stmt = select(Task).options(*LOAD_OPTIONS)

    if user.role == UserRole.SALES_REP or mine_only:
        stmt = stmt.where(Task.assignee_id == user.id)
    elif assignee_id:
        stmt = stmt.where(Task.assignee_id == assignee_id)

    if status:
        stmt = stmt.where(Task.status == status)

    if related_company_id:
        stmt = stmt.where(Task.related_company_id == related_company_id)

    if related_deal_id:
        stmt = stmt.where(Task.related_deal_id == related_deal_id)

    stmt = stmt.order_by(Task.due_date.asc().nulls_last())
    result = paginate(db, stmt, page, page_size)
    _refresh_overdue(db, list(result["items"]))
    return result


def get_task_or_404(db: Session, user: User, task_id: int) -> Task:
    task = db.execute(select(Task).options(*LOAD_OPTIONS).where(Task.id == task_id)).scalar_one_or_none()
    if not task:
        raise NotFoundError("Task", task_id)
    if not has_full_visibility(user) and task.assignee_id != user.id and task.created_by_id != user.id:
        raise ForbiddenError("You can only access tasks assigned to you or created by you.")
    return task


def create_task(db: Session, user: User, data: TaskCreate) -> Task:
    require_write_access(user)
    task = Task(
        **data.model_dump(exclude={"assignee_id"}), created_by_id=user.id, assignee_id=data.assignee_id or user.id
    )
    db.add(task)
    db.flush()
    record_audit(db, user_id=user.id, action="create", entity_type="task", entity_id=task.id, entity_label=task.title)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, user: User, task_id: int, data: TaskUpdate) -> Task:
    task = get_task_or_404(db, user, task_id)
    if not has_full_visibility(user) and task.assignee_id != user.id and task.created_by_id != user.id:
        raise ForbiddenError("You can only modify tasks assigned to you or created by you.")

    payload = data.model_dump(exclude_unset=True)
    if payload.get("status") == TaskStatus.COMPLETED:
        task.completed_at = datetime.now(UTC)
    for field, value in payload.items():
        setattr(task, field, value)

    record_audit(db, user_id=user.id, action="update", entity_type="task", entity_id=task.id, entity_label=task.title)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, user: User, task_id: int) -> None:
    task = get_task_or_404(db, user, task_id)
    if not has_full_visibility(user) and task.created_by_id != user.id:
        raise ForbiddenError("Only the creator, a manager, or an admin can delete this task.")
    record_audit(db, user_id=user.id, action="delete", entity_type="task", entity_id=task.id, entity_label=task.title)
    db.delete(task)
    db.commit()
