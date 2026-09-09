from pydantic import BaseModel

from app.models.enums import DealStage
from app.schemas.user import UserBrief


class KpiMetric(BaseModel):
    key: str
    label: str
    value: float
    change_pct: float | None = None
    format: str = "number"  # "currency" | "percent" | "number"


class KpiSummary(BaseModel):
    metrics: list[KpiMetric]


class FunnelStage(BaseModel):
    stage: DealStage
    label: str
    count: int
    value: float
    conversion_rate: float


class FunnelAnalytics(BaseModel):
    stages: list[FunnelStage]
    overall_conversion_rate: float


class RevenuePoint(BaseModel):
    period_label: str
    period_start: str
    actual: float
    target: float
    forecast: float
    previous_period: float


class RevenueAnalytics(BaseModel):
    points: list[RevenuePoint]
    total_actual: float
    total_target: float
    achievement_pct: float


class TeamPerformanceRow(BaseModel):
    employee: UserBrief
    deals_count: int
    won_count: int
    revenue: float
    win_rate: float
    target_amount: float
    achievement_pct: float


class TeamPerformance(BaseModel):
    rows: list[TeamPerformanceRow]


class BusinessInsight(BaseModel):
    id: str
    severity: str  # "positive" | "warning" | "info" | "critical"
    title: str
    description: str
    metric_key: str | None = None


class BusinessInsights(BaseModel):
    insights: list[BusinessInsight]


class SegmentationRow(BaseModel):
    segment: str
    customer_count: int
    revenue: float
    revenue_share_pct: float


class WinLossRow(BaseModel):
    period_label: str
    won: int
    lost: int
    win_rate: float


class CustomerGrowthPoint(BaseModel):
    period_label: str
    new_customers: int
    total_customers: int


class PipelineVelocity(BaseModel):
    average_days_to_close: float
    average_deal_size: float
    deals_per_month: float
    velocity_score: float
