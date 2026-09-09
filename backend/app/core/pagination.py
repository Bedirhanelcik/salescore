from typing import Generic, Sequence, TypeVar

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

T = TypeVar("T")


class PageParams(BaseModel):
    page: int = 1
    page_size: int = 20


class Page(BaseModel, Generic[T]):
    items: Sequence[T]
    total: int
    page: int
    page_size: int
    total_pages: int


def paginate(db: Session, stmt, page: int, page_size: int):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar_one()

    items = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    total_pages = (total + page_size - 1) // page_size if total else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
