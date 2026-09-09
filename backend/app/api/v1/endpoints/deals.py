from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.pagination import Page
from app.db.session import get_db
from app.models.enums import DEAL_STAGE_ORDER, DealStage
from app.models.user import User
from app.schemas.deal import (
    DealCreate,
    DealListItem,
    DealRead,
    DealStageHistoryRead,
    DealStageUpdate,
    DealUpdate,
    PipelineBoard,
    PipelineStageColumn,
)
from app.services import deal_service

router = APIRouter(prefix="/deals", tags=["Sales - Deals"])


@router.get("", response_model=Page[DealListItem])
def list_deals(
    page: int = 1,
    page_size: int = 20,
    stage: DealStage | None = None,
    owner_id: int | None = None,
    company_id: int | None = None,
    search: str | None = None,
    min_value: float | None = None,
    max_value: float | None = None,
    sort_by: str = "updated_at",
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return deal_service.list_deals(db, current_user, page, page_size, stage, owner_id, company_id, search, min_value, max_value, sort_by, sort_dir)


@router.get("/pipeline", response_model=PipelineBoard)
def get_pipeline(owner_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    columns = []
    for stage in DEAL_STAGE_ORDER + [DealStage.LOST]:
        result = deal_service.list_deals(db, current_user, page=1, page_size=200, stage=stage, owner_id=owner_id)
        deals = result["items"]
        columns.append(
            PipelineStageColumn(
                stage=stage,
                label=stage.value.replace("_", " ").title(),
                count=len(deals),
                total_value=sum(float(d.value) for d in deals),
                deals=deals,
            )
        )
    return PipelineBoard(columns=columns)


@router.post("", response_model=DealRead, status_code=201)
def create_deal(payload: DealCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return deal_service.create_deal(db, current_user, payload)


@router.get("/{deal_id}", response_model=DealRead)
def get_deal(deal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return deal_service.get_deal_or_404(db, current_user, deal_id)


@router.get("/{deal_id}/history", response_model=list[DealStageHistoryRead])
def get_deal_history(deal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return deal_service.get_deal_history(db, current_user, deal_id)


@router.patch("/{deal_id}", response_model=DealRead)
def update_deal(deal_id: int, payload: DealUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return deal_service.update_deal(db, current_user, deal_id, payload)


@router.patch("/{deal_id}/stage", response_model=DealRead)
def change_deal_stage(deal_id: int, payload: DealStageUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return deal_service.change_deal_stage(db, current_user, deal_id, payload)


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    deal_service.delete_deal(db, current_user, deal_id)
