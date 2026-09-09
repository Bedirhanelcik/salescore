"""Business Intelligence / analytics computations.

Every number here is derived from real rows in the database (deals, deal_stage_history,
companies, users, sales_targets) - there is no mocked/frontend-only chart data. Results
for expensive aggregates are cached briefly via Redis (app.core.cache) and invalidated
whenever a deal is created, updated, or changes stage (see deal_service).
"""

from calendar import monthrange
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.cache import get_cache
from app.models.company import Company
from app.models.deal import Deal, DealStageHistory
from app.models.enums import DEAL_STAGE_ORDER, CompanySize, DealStage, UserRole
from app.models.sales_target import SalesTarget
from app.models.user import User
from app.schemas.analytics import (
    BusinessInsight,
    CustomerGrowthPoint,
    FunnelAnalytics,
    FunnelStage,
    KpiMetric,
    KpiSummary,
    PipelineVelocity,
    RevenueAnalytics,
    RevenuePoint,
    SegmentationRow,
    TeamPerformance,
    TeamPerformanceRow,
    WinLossRow,
)

CACHE_TTL = 45


def _period_bounds(days: int) -> tuple[date, date, date, date]:
    end = date.today()
    start = end - timedelta(days=days)
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days)
    return start, end, prev_start, prev_end


def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None if current == 0 else 100.0
    return round(((current - previous) / previous) * 100, 1)


def _won_value(db: Session, start: date, end: date) -> float:
    stmt = select(func.coalesce(func.sum(Deal.value), 0)).where(
        Deal.stage == DealStage.WON, Deal.actual_close_date >= start, Deal.actual_close_date <= end
    )
    return float(db.execute(stmt).scalar_one())


def _won_count(db: Session, start: date, end: date) -> int:
    stmt = select(func.count()).where(
        Deal.stage == DealStage.WON, Deal.actual_close_date >= start, Deal.actual_close_date <= end
    )
    return db.execute(stmt).scalar_one()


def get_kpi_summary(db: Session, days: int = 30) -> KpiSummary:
    cache = get_cache()
    cache_key = f"analytics:kpis:{days}"
    cached = cache.get(cache_key)
    if cached:
        return KpiSummary(**cached)

    start, end, prev_start, prev_end = _period_bounds(days)

    revenue = _won_value(db, start, end)
    prev_revenue = _won_value(db, prev_start, prev_end)

    pipeline_value = float(
        db.execute(
            select(func.coalesce(func.sum(Deal.value), 0)).where(Deal.stage.not_in([DealStage.WON, DealStage.LOST]))
        ).scalar_one()
    )
    prev_pipeline_stmt = select(func.coalesce(func.sum(Deal.value), 0)).where(
        Deal.stage.not_in([DealStage.WON, DealStage.LOST]), Deal.created_at <= prev_end
    )
    prev_pipeline_value = float(db.execute(prev_pipeline_stmt).scalar_one())

    won_deals = _won_count(db, start, end)
    prev_won_deals = _won_count(db, prev_start, prev_end)

    lost_deals = db.execute(
        select(func.count()).where(
            Deal.stage == DealStage.LOST, Deal.actual_close_date >= start, Deal.actual_close_date <= end
        )
    ).scalar_one()
    prev_lost_deals = db.execute(
        select(func.count()).where(
            Deal.stage == DealStage.LOST, Deal.actual_close_date >= prev_start, Deal.actual_close_date <= prev_end
        )
    ).scalar_one()

    win_rate = round((won_deals / (won_deals + lost_deals)) * 100, 1) if (won_deals + lost_deals) else 0
    prev_win_rate = (
        round((prev_won_deals / (prev_won_deals + prev_lost_deals)) * 100, 1)
        if (prev_won_deals + prev_lost_deals)
        else 0
    )

    # Cohort conversion: of the deals *created* in this window, what share have (by now)
    # become Won - not to be confused with win_rate, which looks at deals *closed* in the window.
    # `Deal.created_at` is a DateTime column, so the upper bound must be exclusive of the day
    # *after* `end` - a bare `<= end` coerces to midnight and silently drops deals created today.
    end_exclusive = end + timedelta(days=1)
    created_count = db.execute(
        select(func.count()).where(Deal.created_at >= start, Deal.created_at < end_exclusive)
    ).scalar_one()
    created_won_count = db.execute(
        select(func.count()).where(
            Deal.created_at >= start, Deal.created_at < end_exclusive, Deal.stage == DealStage.WON
        )
    ).scalar_one()
    prev_created_count = db.execute(
        select(func.count()).where(Deal.created_at >= prev_start, Deal.created_at <= prev_end)
    ).scalar_one()
    prev_created_won_count = db.execute(
        select(func.count()).where(
            Deal.created_at >= prev_start, Deal.created_at <= prev_end, Deal.stage == DealStage.WON
        )
    ).scalar_one()
    conversion_rate = round((created_won_count / created_count) * 100, 1) if created_count else 0
    prev_conversion_rate = round((prev_created_won_count / prev_created_count) * 100, 1) if prev_created_count else 0

    avg_deal_size = round(revenue / won_deals, 2) if won_deals else 0
    prev_avg_deal_size = round(prev_revenue / prev_won_deals, 2) if prev_won_deals else 0

    active_customers = db.execute(
        select(func.count(func.distinct(Deal.company_id))).where(Deal.company_id.is_not(None), Deal.updated_at >= start)
    ).scalar_one()
    prev_active_customers = db.execute(
        select(func.count(func.distinct(Deal.company_id))).where(
            Deal.company_id.is_not(None), Deal.updated_at >= prev_start, Deal.updated_at <= prev_end
        )
    ).scalar_one()

    # Sales target achievement is measured against the current calendar month's targets
    # (the period a "Sales Target" tile intuitively refers to), not the rolling N-day window.
    today = date.today()
    month_start = date(today.year, today.month, 1)
    _, last_day = monthrange(today.year, today.month)
    month_end = date(today.year, today.month, last_day)
    # Only company/department-wide targets count toward this KPI - individual rep quotas
    # are summed separately on the Team Performance view, so combining both here would
    # double-count the same revenue goal.
    targets = db.execute(select(SalesTarget).where(SalesTarget.employee_id.is_(None))).scalars().all()
    total_target = (
        sum(float(t.target_amount) for t in targets if t.period_start <= month_end and t.period_end >= month_start) or 1
    )
    month_revenue = _won_value(db, month_start, min(month_end, today))
    sales_target_pct = round((month_revenue / total_target) * 100, 1)

    metrics = [
        KpiMetric(
            key="revenue",
            label="Revenue",
            value=revenue,
            change_pct=_pct_change(revenue, prev_revenue),
            format="currency",
        ),
        KpiMetric(
            key="pipeline_value",
            label="Pipeline Value",
            value=pipeline_value,
            change_pct=_pct_change(pipeline_value, prev_pipeline_value),
            format="currency",
        ),
        KpiMetric(
            key="won_deals",
            label="Won Deals",
            value=won_deals,
            change_pct=_pct_change(won_deals, prev_won_deals),
            format="number",
        ),
        KpiMetric(
            key="conversion_rate",
            label="Conversion Rate",
            value=conversion_rate,
            change_pct=_pct_change(conversion_rate, prev_conversion_rate),
            format="percent",
        ),
        KpiMetric(
            key="win_rate",
            label="Win Rate",
            value=win_rate,
            change_pct=_pct_change(win_rate, prev_win_rate),
            format="percent",
        ),
        KpiMetric(
            key="avg_deal_size",
            label="Average Deal Size",
            value=avg_deal_size,
            change_pct=_pct_change(avg_deal_size, prev_avg_deal_size),
            format="currency",
        ),
        KpiMetric(
            key="active_customers",
            label="Active Customers",
            value=active_customers,
            change_pct=_pct_change(active_customers, prev_active_customers),
            format="number",
        ),
        KpiMetric(
            key="sales_target",
            label="Sales Target Achievement",
            value=sales_target_pct,
            change_pct=None,
            format="percent",
        ),
    ]
    result = KpiSummary(metrics=metrics)
    cache.set(cache_key, result.model_dump(), ttl_seconds=CACHE_TTL)
    return result


def get_funnel(db: Session, days: int = 90) -> FunnelAnalytics:
    cache = get_cache()
    cache_key = f"analytics:funnel:{days}"
    cached = cache.get(cache_key)
    if cached:
        return FunnelAnalytics(**cached)

    start = date.today() - timedelta(days=days)
    stages_order = DEAL_STAGE_ORDER + [DealStage.LOST]

    reached_counts: dict[DealStage, int] = {}
    reached_values: dict[DealStage, float] = {}
    for stage in stages_order:
        deal_ids_stmt = (
            select(func.distinct(DealStageHistory.deal_id))
            .join(Deal, Deal.id == DealStageHistory.deal_id)
            .where(DealStageHistory.to_stage == stage, Deal.created_at >= start)
        )
        deal_ids = [row[0] for row in db.execute(deal_ids_stmt).all()]
        reached_counts[stage] = len(deal_ids)
        if deal_ids:
            value = db.execute(select(func.coalesce(func.sum(Deal.value), 0)).where(Deal.id.in_(deal_ids))).scalar_one()
        else:
            value = 0
        reached_values[stage] = float(value)

    stages: list[FunnelStage] = []
    previous_count: int | None = None
    for stage in stages_order:
        count = reached_counts[stage]
        conversion_rate = round((count / previous_count) * 100, 1) if previous_count else 100.0
        stages.append(
            FunnelStage(
                stage=stage,
                label=stage.value.replace("_", " ").title(),
                count=count,
                value=reached_values[stage],
                conversion_rate=conversion_rate,
            )
        )
        if stage != DealStage.LOST:
            previous_count = count if count else previous_count

    lead_count = reached_counts.get(DealStage.LEAD, 0)
    won_count = reached_counts.get(DealStage.WON, 0)
    overall = round((won_count / lead_count) * 100, 1) if lead_count else 0

    result = FunnelAnalytics(stages=stages, overall_conversion_rate=overall)
    cache.set(cache_key, result.model_dump(), ttl_seconds=CACHE_TTL)
    return result


def get_revenue_trend(db: Session, months: int = 12) -> RevenueAnalytics:
    cache = get_cache()
    cache_key = f"analytics:revenue_trend:{months}"
    cached = cache.get(cache_key)
    if cached:
        return RevenueAnalytics(**cached)

    today = date.today()
    points: list[RevenuePoint] = []
    total_actual = 0.0
    total_target = 0.0

    month_cursor = date(today.year, today.month, 1)
    month_starts = []
    for _ in range(months):
        month_starts.insert(0, month_cursor)
        prev_month = month_cursor.month - 1 or 12
        prev_year = month_cursor.year - 1 if month_cursor.month == 1 else month_cursor.year
        month_cursor = date(prev_year, prev_month, 1)

    for month_start in month_starts:
        _, last_day = monthrange(month_start.year, month_start.month)
        month_end = date(month_start.year, month_start.month, last_day)

        actual = _won_value(db, month_start, month_end)

        targets = db.execute(
            select(func.coalesce(func.sum(SalesTarget.target_amount), 0)).where(
                SalesTarget.employee_id.is_(None),
                SalesTarget.period_start <= month_end,
                SalesTarget.period_end >= month_start,
            )
        ).scalar_one()

        prev_month_start = date(month_start.year - 1, month_start.month, 1) if month_start.month else month_start
        prev_month_end = date(
            prev_month_start.year, prev_month_start.month, monthrange(prev_month_start.year, prev_month_start.month)[1]
        )
        previous_period = _won_value(db, prev_month_start, prev_month_end)

        forecast_stmt = select(func.coalesce(func.sum(Deal.value * Deal.probability / 100), 0)).where(
            Deal.stage.not_in([DealStage.WON, DealStage.LOST]),
            Deal.expected_close_date >= month_start,
            Deal.expected_close_date <= month_end,
        )
        forecast = float(db.execute(forecast_stmt).scalar_one())

        points.append(
            RevenuePoint(
                period_label=month_start.strftime("%b %Y"),
                period_start=month_start.isoformat(),
                actual=actual,
                target=float(targets),
                forecast=forecast,
                previous_period=previous_period,
            )
        )
        total_actual += actual
        total_target += float(targets)

    achievement_pct = round((total_actual / total_target) * 100, 1) if total_target else 0
    result = RevenueAnalytics(
        points=points, total_actual=total_actual, total_target=total_target, achievement_pct=achievement_pct
    )
    cache.set(cache_key, result.model_dump(), ttl_seconds=CACHE_TTL)
    return result


def get_team_performance(db: Session, days: int = 30) -> TeamPerformance:
    start, end, _, _ = _period_bounds(days)
    reps = db.execute(select(User).where(User.role == UserRole.SALES_REP, User.is_active.is_(True))).scalars().all()

    rows: list[TeamPerformanceRow] = []
    for rep in reps:
        deals_count = db.execute(
            select(func.count()).where(Deal.owner_id == rep.id, Deal.created_at >= start)
        ).scalar_one()
        won_count = db.execute(
            select(func.count()).where(
                Deal.owner_id == rep.id,
                Deal.stage == DealStage.WON,
                Deal.actual_close_date >= start,
                Deal.actual_close_date <= end,
            )
        ).scalar_one()
        lost_count = db.execute(
            select(func.count()).where(
                Deal.owner_id == rep.id,
                Deal.stage == DealStage.LOST,
                Deal.actual_close_date >= start,
                Deal.actual_close_date <= end,
            )
        ).scalar_one()
        revenue = float(
            db.execute(
                select(func.coalesce(func.sum(Deal.value), 0)).where(
                    Deal.owner_id == rep.id,
                    Deal.stage == DealStage.WON,
                    Deal.actual_close_date >= start,
                    Deal.actual_close_date <= end,
                )
            ).scalar_one()
        )
        win_rate = round((won_count / (won_count + lost_count)) * 100, 1) if (won_count + lost_count) else 0

        target = db.execute(
            select(func.coalesce(func.sum(SalesTarget.target_amount), 0)).where(
                SalesTarget.employee_id == rep.id, SalesTarget.period_start <= end, SalesTarget.period_end >= start
            )
        ).scalar_one()
        achievement_pct = round((revenue / float(target)) * 100, 1) if target else 0

        rows.append(
            TeamPerformanceRow(
                employee=rep,
                deals_count=deals_count,
                won_count=won_count,
                revenue=revenue,
                win_rate=win_rate,
                target_amount=float(target),
                achievement_pct=achievement_pct,
            )
        )

    rows.sort(key=lambda r: r.revenue, reverse=True)
    return TeamPerformance(rows=rows)


SEGMENT_LABELS = {
    CompanySize.SELF_EMPLOYED: "Self-employed",
    CompanySize.SMALL: "1-50 employees",
    CompanySize.MEDIUM: "51-200 employees",
    CompanySize.LARGE: "201-1000 employees",
    CompanySize.ENTERPRISE: "1000+ employees",
}


def get_segmentation(db: Session) -> list[SegmentationRow]:
    stmt = (
        select(Company.size, func.count(func.distinct(Company.id)), func.coalesce(func.sum(Deal.value), 0))
        .join(Deal, Deal.company_id == Company.id)
        .where(Deal.stage == DealStage.WON)
        .group_by(Company.size)
    )
    rows = db.execute(stmt).all()
    total = sum(float(r[2]) for r in rows) or 1
    return [
        SegmentationRow(
            segment=(SEGMENT_LABELS.get(size, size.value) if size else "Unclassified"),
            customer_count=count,
            revenue=float(revenue),
            revenue_share_pct=round((float(revenue) / total) * 100, 1),
        )
        for size, count, revenue in rows
    ]


def get_win_loss_trend(db: Session, months: int = 6) -> list[WinLossRow]:
    today = date.today()
    rows: list[WinLossRow] = []
    month_cursor = date(today.year, today.month, 1)
    month_starts = []
    for _ in range(months):
        month_starts.insert(0, month_cursor)
        prev_month = month_cursor.month - 1 or 12
        prev_year = month_cursor.year - 1 if month_cursor.month == 1 else month_cursor.year
        month_cursor = date(prev_year, prev_month, 1)

    for month_start in month_starts:
        _, last_day = monthrange(month_start.year, month_start.month)
        month_end = date(month_start.year, month_start.month, last_day)
        won = _won_count(db, month_start, month_end)
        lost = db.execute(
            select(func.count()).where(
                Deal.stage == DealStage.LOST, Deal.actual_close_date >= month_start, Deal.actual_close_date <= month_end
            )
        ).scalar_one()
        win_rate = round((won / (won + lost)) * 100, 1) if (won + lost) else 0
        rows.append(WinLossRow(period_label=month_start.strftime("%b %Y"), won=won, lost=lost, win_rate=win_rate))
    return rows


def get_customer_growth(db: Session, months: int = 12) -> list[CustomerGrowthPoint]:
    today = date.today()
    month_cursor = date(today.year, today.month, 1)
    month_starts = []
    for _ in range(months):
        month_starts.insert(0, month_cursor)
        prev_month = month_cursor.month - 1 or 12
        prev_year = month_cursor.year - 1 if month_cursor.month == 1 else month_cursor.year
        month_cursor = date(prev_year, prev_month, 1)

    points: list[CustomerGrowthPoint] = []
    running_total = db.execute(select(func.count()).where(Company.created_at < month_starts[0])).scalar_one()

    for month_start in month_starts:
        _, last_day = monthrange(month_start.year, month_start.month)
        month_end = date(month_start.year, month_start.month, last_day)
        new_customers = db.execute(
            select(func.count()).where(Company.created_at >= month_start, Company.created_at <= month_end)
        ).scalar_one()
        running_total += new_customers
        points.append(
            CustomerGrowthPoint(
                period_label=month_start.strftime("%b %Y"), new_customers=new_customers, total_customers=running_total
            )
        )
    return points


def get_pipeline_velocity(db: Session, days: int = 90) -> PipelineVelocity:
    start = date.today() - timedelta(days=days)
    won_deals = (
        db.execute(select(Deal).where(Deal.stage == DealStage.WON, Deal.actual_close_date >= start)).scalars().all()
    )

    if not won_deals:
        return PipelineVelocity(average_days_to_close=0, average_deal_size=0, deals_per_month=0, velocity_score=0)

    cycle_days = []
    for deal in won_deals:
        if deal.actual_close_date and deal.created_at:
            cycle_days.append((deal.actual_close_date - deal.created_at.date()).days)
    avg_days = round(sum(cycle_days) / len(cycle_days), 1) if cycle_days else 1
    avg_deal_size = round(sum(float(d.value) for d in won_deals) / len(won_deals), 2)
    months_span = max(days / 30, 1)
    deals_per_month = round(len(won_deals) / months_span, 1)

    total_open_and_won = db.execute(select(func.count()).where(Deal.created_at >= start)).scalar_one()
    win_rate = len(won_deals) / total_open_and_won if total_open_and_won else 0
    velocity_score = round((len(won_deals) * win_rate * avg_deal_size) / max(avg_days, 1), 2)

    return PipelineVelocity(
        average_days_to_close=avg_days,
        average_deal_size=avg_deal_size,
        deals_per_month=deals_per_month,
        velocity_score=velocity_score,
    )


def get_business_insights(db: Session) -> list[BusinessInsight]:
    insights: list[BusinessInsight] = []

    kpis = get_kpi_summary(db, days=30)
    target_pct = next(m for m in kpis.metrics if m.key == "sales_target")

    if target_pct.value >= 105:
        insights.append(
            BusinessInsight(
                id="revenue_above_target",
                severity="positive",
                title="Revenue is above target",
                description=f"Revenue is {target_pct.value - 100:.1f}% above target for the last 30 days.",
                metric_key="revenue",
            )
        )
    elif target_pct.value < 85:
        insights.append(
            BusinessInsight(
                id="revenue_below_target",
                severity="warning",
                title="Revenue is below target",
                description=f"Revenue is tracking at {target_pct.value:.1f}% of target for the last 30 days. Review pipeline coverage.",
                metric_key="sales_target",
            )
        )

    segmentation = get_segmentation(db)
    if segmentation:
        top = max(segmentation, key=lambda s: s.revenue_share_pct)
        if top.revenue_share_pct >= 55:
            insights.append(
                BusinessInsight(
                    id="segment_concentration",
                    severity="info",
                    title=f"{top.segment} customers dominate revenue",
                    description=f"{top.segment} accounts generated {top.revenue_share_pct}% of total won revenue. Consider diversifying acquisition efforts.",
                    metric_key="customer_segmentation",
                )
            )

    funnel = get_funnel(db, days=90)
    stage_map = {s.stage: s for s in funnel.stages}
    proposal = stage_map.get(DealStage.PROPOSAL)
    negotiation = stage_map.get(DealStage.NEGOTIATION)
    if proposal and negotiation and negotiation.conversion_rate < 45:
        insights.append(
            BusinessInsight(
                id="proposal_to_negotiation_drop",
                severity="warning",
                title="Proposal to Negotiation conversion is weak",
                description=f"Only {negotiation.conversion_rate}% of proposals progress to negotiation. Review proposal quality and pricing objections.",
                metric_key="pipeline_velocity",
            )
        )

    team = get_team_performance(db, days=30)
    below_target = [r for r in team.rows if r.target_amount > 0 and r.achievement_pct < 70]
    if below_target:
        names = ", ".join(r.employee.full_name for r in below_target[:3])
        insights.append(
            BusinessInsight(
                id="reps_below_target",
                severity="warning",
                title=f"{len(below_target)} sales rep(s) below 70% of target",
                description=f"{names} are below 70% of their monthly target. Consider coaching or pipeline support.",
                metric_key="sales_target",
            )
        )

    win_loss = get_win_loss_trend(db, months=2)
    if len(win_loss) == 2 and win_loss[0].win_rate > 0:
        change = win_loss[1].win_rate - win_loss[0].win_rate
        if change <= -8:
            insights.append(
                BusinessInsight(
                    id="win_rate_decline",
                    severity="critical",
                    title=f"Win rate decreased {abs(change):.1f}%",
                    description="Win rate dropped compared to last month. Review lost-deal reasons for recurring objections.",
                    metric_key="win_rate",
                )
            )
        elif change >= 8:
            insights.append(
                BusinessInsight(
                    id="win_rate_increase",
                    severity="positive",
                    title=f"Win rate improved {change:.1f}%",
                    description="Win rate is trending up compared to last month.",
                    metric_key="win_rate",
                )
            )

    if not insights:
        insights.append(
            BusinessInsight(
                id="steady_state",
                severity="info",
                title="Performance is stable",
                description="No significant deviations detected in the last 30 days across revenue, funnel and team metrics.",
            )
        )

    severity_order = {"critical": 0, "warning": 1, "info": 2, "positive": 3}
    insights.sort(key=lambda i: severity_order.get(i.severity, 4))
    return insights
