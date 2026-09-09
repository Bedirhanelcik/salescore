from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import (
    BusinessInsights,
    CustomerGrowthPoint,
    FunnelAnalytics,
    KpiSummary,
    PipelineVelocity,
    RevenueAnalytics,
    SegmentationRow,
    TeamPerformance,
    WinLossRow,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/kpis", response_model=KpiSummary)
def get_kpis(days: int = 30, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return analytics_service.get_kpi_summary(db, days)


@router.get("/funnel", response_model=FunnelAnalytics)
def get_funnel(days: int = 90, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return analytics_service.get_funnel(db, days)


@router.get("/revenue", response_model=RevenueAnalytics)
def get_revenue(months: int = 12, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return analytics_service.get_revenue_trend(db, months)


@router.get("/team-performance", response_model=TeamPerformance)
def get_team_performance(days: int = 30, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return analytics_service.get_team_performance(db, days)


@router.get("/segmentation", response_model=list[SegmentationRow])
def get_segmentation(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return analytics_service.get_segmentation(db)


@router.get("/win-loss", response_model=list[WinLossRow])
def get_win_loss(months: int = 6, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return analytics_service.get_win_loss_trend(db, months)


@router.get("/pipeline-velocity", response_model=PipelineVelocity)
def get_pipeline_velocity(
    days: int = 90, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return analytics_service.get_pipeline_velocity(db, days)


@router.get("/customer-growth", response_model=list[CustomerGrowthPoint])
def get_customer_growth(
    months: int = 12, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return analytics_service.get_customer_growth(db, months)


@router.get("/insights", response_model=BusinessInsights)
def get_insights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return BusinessInsights(insights=analytics_service.get_business_insights(db))
