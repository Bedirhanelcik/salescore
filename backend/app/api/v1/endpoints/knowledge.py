from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.knowledge import KnowledgeCategoryRead, KnowledgeTermRead
from app.services import knowledge_service

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])


@router.get("/categories", response_model=list[KnowledgeCategoryRead])
def list_categories(db: Session = Depends(get_db)):
    rows = knowledge_service.list_categories(db)
    return [
        KnowledgeCategoryRead(
            id=r["category"].id,
            key=r["category"].key,
            name_en=r["category"].name_en,
            name_tr=r["category"].name_tr,
            name_de=r["category"].name_de,
            name_ar=r["category"].name_ar,
            term_count=r["term_count"],
        )
        for r in rows
    ]


@router.get("/terms", response_model=list[KnowledgeTermRead])
def list_terms(category_id: int | None = None, search: str | None = None, db: Session = Depends(get_db)):
    return knowledge_service.list_terms(db, category_id, search)


@router.get("/terms/{key}", response_model=KnowledgeTermRead)
def get_term(key: str, db: Session = Depends(get_db)):
    return knowledge_service.get_term_by_key(db, key)
