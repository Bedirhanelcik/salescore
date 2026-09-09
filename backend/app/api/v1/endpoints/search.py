from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.search import SearchResponse
from app.services import search_service

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResponse)
def global_search(
    q: str = Query(min_length=1), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    results = search_service.global_search(db, current_user, q)
    return SearchResponse(query=q, results=results)
