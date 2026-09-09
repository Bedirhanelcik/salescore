from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.knowledge import KnowledgeCategory, KnowledgeTerm


def list_categories(db: Session) -> list[dict]:
    stmt = (
        select(KnowledgeCategory, func.count(KnowledgeTerm.id))
        .outerjoin(KnowledgeTerm, KnowledgeTerm.category_id == KnowledgeCategory.id)
        .group_by(KnowledgeCategory.id)
        .order_by(KnowledgeCategory.sort_order)
    )
    return [{"category": cat, "term_count": count} for cat, count in db.execute(stmt).all()]


def list_terms(db: Session, category_id: int | None = None, search: str | None = None) -> list[KnowledgeTerm]:
    stmt = select(KnowledgeTerm)
    if category_id:
        stmt = stmt.where(KnowledgeTerm.category_id == category_id)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                KnowledgeTerm.term_en.ilike(pattern),
                KnowledgeTerm.term_tr.ilike(pattern),
                KnowledgeTerm.term_de.ilike(pattern),
                KnowledgeTerm.term_ar.ilike(pattern),
                KnowledgeTerm.key.ilike(pattern),
            )
        )
    stmt = stmt.order_by(KnowledgeTerm.term_en)
    return list(db.execute(stmt).scalars().all())


def get_term_by_key(db: Session, key: str) -> KnowledgeTerm:
    term = db.execute(select(KnowledgeTerm).where(KnowledgeTerm.key == key)).scalar_one_or_none()
    if not term:
        raise NotFoundError("Knowledge term", key)
    return term


def get_terms_briefs(db: Session, keys: list[str]) -> list[KnowledgeTerm]:
    if not keys:
        return []
    stmt = select(KnowledgeTerm).where(KnowledgeTerm.key.in_(keys))
    return list(db.execute(stmt).scalars().all())
