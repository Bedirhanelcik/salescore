from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.ai_service import get_provider

router = APIRouter(prefix="/ai", tags=["AI Business Assistant"])


class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=500)


class AskResponse(BaseModel):
    answer: str


@router.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    provider = get_provider()
    answer = provider.answer(db, payload.question, current_user)
    return AskResponse(answer=answer)
