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
from app.core.rbac import has_full_visibility, scope_to_owner_only
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


def _owner_scope(user: User | None) -> int | None:
    """Returns the user id that dashboard/analytics queries must be filtered to, or
    None for full (organization-wide) visibility. Reuses the exact same RBAC rule
    already enforced on the deals/leads/companies list endpoints (see app.core.rbac) -
    a Sales Rep's dashboard must be computed from only the deals they own, never the
    whole company's pipeline."""
    if user is not None and scope_to_owner_only(user):
        return user.id
    return None


def _won_value(db: Session, start: date, end: date, owner_id: int | None = None) -> float:
    stmt = select(func.coalesce(func.sum(Deal.value), 0)).where(
        Deal.stage == DealStage.WON, Deal.actual_close_date >= start, Deal.actual_close_date <= end
    )
    if owner_id is not None:
        stmt = stmt.where(Deal.owner_id == owner_id)
    return float(db.execute(stmt).scalar_one())


def _won_count(db: Session, start: date, end: date, owner_id: int | None = None) -> int:
    stmt = select(func.count()).where(
        Deal.stage == DealStage.WON, Deal.actual_close_date >= start, Deal.actual_close_date <= end
    )
    if owner_id is not None:
        stmt = stmt.where(Deal.owner_id == owner_id)
    return db.execute(stmt).scalar_one()


def has_any_deals(db: Session, user: User | None = None) -> bool:
    """Whether the caller's scope (their own deals, or the whole org) has ever
    contained a single deal - used to tell a genuinely empty CRM apart from one
    that simply has no activity in the current window."""
    owner_id = _owner_scope(user)
    stmt = select(func.count()).select_from(Deal)
    if owner_id is not None:
        stmt = stmt.where(Deal.owner_id == owner_id)
    return db.execute(stmt).scalar_one() > 0


def get_kpi_summary(db: Session, days: int = 30, user: User | None = None) -> KpiSummary:
    owner_id = _owner_scope(user)
    cache = get_cache()
    cache_key = f"analytics:kpis:{days}:{owner_id or 'org'}"
    cached = cache.get(cache_key)
    if cached:
        return KpiSummary(**cached)

    start, end, prev_start, prev_end = _period_bounds(days)

    revenue = _won_value(db, start, end, owner_id)
    prev_revenue = _won_value(db, prev_start, prev_end, owner_id)

    pipeline_stmt = select(func.coalesce(func.sum(Deal.value), 0)).where(
        Deal.stage.not_in([DealStage.WON, DealStage.LOST])
    )
    if owner_id is not None:
        pipeline_stmt = pipeline_stmt.where(Deal.owner_id == owner_id)
    pipeline_value = float(db.execute(pipeline_stmt).scalar_one())

    # `Deal.created_at` is a DateTime column - an exclusive upper bound is required or deals
    # created on `prev_end` itself (after midnight) are silently dropped.
    prev_end_exclusive = prev_end + timedelta(days=1)
    prev_pipeline_stmt = select(func.coalesce(func.sum(Deal.value), 0)).where(
        Deal.stage.not_in([DealStage.WON, DealStage.LOST]), Deal.created_at < prev_end_exclusive
    )
    if owner_id is not None:
        prev_pipeline_stmt = prev_pipeline_stmt.where(Deal.owner_id == owner_id)
    prev_pipeline_value = float(db.execute(prev_pipeline_stmt).scalar_one())

    won_deals = _won_count(db, start, end, owner_id)
    prev_won_deals = _won_count(db, prev_start, prev_end, owner_id)

    lost_deals_stmt = select(func.count()).where(
        Deal.stage == DealStage.LOST, Deal.actual_close_date >= start, Deal.actual_close_date <= end
    )
    prev_lost_deals_stmt = select(func.count()).where(
        Deal.stage == DealStage.LOST, Deal.actual_close_date >= prev_start, Deal.actual_close_date <= prev_end
    )
    if owner_id is not None:
        lost_deals_stmt = lost_deals_stmt.where(Deal.owner_id == owner_id)
        prev_lost_deals_stmt = prev_lost_deals_stmt.where(Deal.owner_id == owner_id)
    lost_deals = db.execute(lost_deals_stmt).scalar_one()
    prev_lost_deals = db.execute(prev_lost_deals_stmt).scalar_one()

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
    created_count_stmt = select(func.count()).where(Deal.created_at >= start, Deal.created_at < end_exclusive)
    created_won_count_stmt = select(func.count()).where(
        Deal.created_at >= start, Deal.created_at < end_exclusive, Deal.stage == DealStage.WON
    )
    prev_created_count_stmt = select(func.count()).where(
        Deal.created_at >= prev_start, Deal.created_at < prev_end_exclusive
    )
    prev_created_won_count_stmt = select(func.count()).where(
        Deal.created_at >= prev_start, Deal.created_at < prev_end_exclusive, Deal.stage == DealStage.WON
    )
    if owner_id is not None:
        created_count_stmt = created_count_stmt.where(Deal.owner_id == owner_id)
        created_won_count_stmt = created_won_count_stmt.where(Deal.owner_id == owner_id)
        prev_created_count_stmt = prev_created_count_stmt.where(Deal.owner_id == owner_id)
        prev_created_won_count_stmt = prev_created_won_count_stmt.where(Deal.owner_id == owner_id)
    created_count = db.execute(created_count_stmt).scalar_one()
    created_won_count = db.execute(created_won_count_stmt).scalar_one()
    prev_created_count = db.execute(prev_created_count_stmt).scalar_one()
    prev_created_won_count = db.execute(prev_created_won_count_stmt).scalar_one()
    conversion_rate = round((created_won_count / created_count) * 100, 1) if created_count else 0
    prev_conversion_rate = round((prev_created_won_count / prev_created_count) * 100, 1) if prev_created_count else 0

    avg_deal_size = round(revenue / won_deals, 2) if won_deals else 0
    prev_avg_deal_size = round(prev_revenue / prev_won_deals, 2) if prev_won_deals else 0

    active_customers_stmt = select(func.count(func.distinct(Deal.company_id))).where(
        Deal.company_id.is_not(None), Deal.updated_at >= start
    )
    prev_active_customers_stmt = select(func.count(func.distinct(Deal.company_id))).where(
        Deal.company_id.is_not(None), Deal.updated_at >= prev_start, Deal.updated_at < prev_end_exclusive
    )
    if owner_id is not None:
        active_customers_stmt = active_customers_stmt.where(Deal.owner_id == owner_id)
        prev_active_customers_stmt = prev_active_customers_stmt.where(Deal.owner_id == owner_id)
    active_customers = db.execute(active_customers_stmt).scalar_one()
    prev_active_customers = db.execute(prev_active_customers_stmt).scalar_one()

    # Sales target achievement is measured against the current calendar month's targets
    # (the period a "Sales Target" tile intuitively refers to), not the rolling N-day window.
    today = date.today()
    month_start = date(today.year, today.month, 1)
    _, last_day = monthrange(today.year, today.month)
    month_end = date(today.year, today.month, last_day)
    if owner_id is not None:
        # A Sales Rep's target tile is their own personal quota, not the company-wide goal.
        targets_stmt = select(SalesTarget).where(SalesTarget.employee_id == owner_id)
    else:
        # Only company/department-wide targets count toward this KPI - individual rep quotas
        # are summed separately on the Team Performance view, so combining both here would
        # double-count the same revenue goal.
        targets_stmt = select(SalesTarget).where(SalesTarget.employee_id.is_(None))
    targets = db.execute(targets_stmt).scalars().all()
    total_target = sum(
        float(t.target_amount) for t in targets if t.period_start <= month_end and t.period_end >= month_start
    )
    month_revenue = _won_value(db, month_start, min(month_end, today), owner_id)
    sales_target_pct = round((month_revenue / total_target) * 100, 1) if total_target else 0

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


def get_funnel(db: Session, days: int = 90, user: User | None = None) -> FunnelAnalytics:
    owner_id = _owner_scope(user)
    cache = get_cache()
    cache_key = f"analytics:funnel:{days}:{owner_id or 'org'}"
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
        if owner_id is not None:
            deal_ids_stmt = deal_ids_stmt.where(Deal.owner_id == owner_id)
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


def get_revenue_trend(db: Session, months: int = 12, user: User | None = None) -> RevenueAnalytics:
    owner_id = _owner_scope(user)
    cache = get_cache()
    cache_key = f"analytics:revenue_trend:{months}:{owner_id or 'org'}"
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

        actual = _won_value(db, month_start, month_end, owner_id)

        target_owner_filter = SalesTarget.employee_id == owner_id if owner_id is not None else SalesTarget.employee_id.is_(None)
        targets = db.execute(
            select(func.coalesce(func.sum(SalesTarget.target_amount), 0)).where(
                target_owner_filter,
                SalesTarget.period_start <= month_end,
                SalesTarget.period_end >= month_start,
            )
        ).scalar_one()

        prev_month_start = date(month_start.year - 1, month_start.month, 1)
        prev_month_end = date(
            prev_month_start.year, prev_month_start.month, monthrange(prev_month_start.year, prev_month_start.month)[1]
        )
        previous_period = _won_value(db, prev_month_start, prev_month_end, owner_id)

        forecast_stmt = select(func.coalesce(func.sum(Deal.value * Deal.probability / 100), 0)).where(
            Deal.stage.not_in([DealStage.WON, DealStage.LOST]),
            Deal.expected_close_date >= month_start,
            Deal.expected_close_date <= month_end,
        )
        if owner_id is not None:
            forecast_stmt = forecast_stmt.where(Deal.owner_id == owner_id)
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


def get_team_performance(db: Session, days: int = 30, user: User | None = None) -> TeamPerformance:
    start, end, _, _ = _period_bounds(days)
    reps_stmt = select(User).where(User.role == UserRole.SALES_REP, User.is_active.is_(True))
    if user is not None and scope_to_owner_only(user):
        # Individual revenue/win-rate/target-achievement is compensation-adjacent (same rule
        # as sales targets) - a Sales Rep may only see their own row, never a colleague's.
        reps_stmt = reps_stmt.where(User.id == user.id)
    reps = db.execute(reps_stmt).scalars().all()
    rep_ids = [rep.id for rep in reps]
    if not rep_ids:
        return TeamPerformance(rows=[])

    # One aggregate query per metric across all reps, instead of one set of queries per rep.
    deals_count_by_rep: dict[int, int] = dict(
        db.execute(
            select(Deal.owner_id, func.count())
            .where(Deal.owner_id.in_(rep_ids), Deal.created_at >= start)
            .group_by(Deal.owner_id)
        ).all()
    )

    won_lost_stmt = (
        select(Deal.owner_id, Deal.stage, func.count(), func.coalesce(func.sum(Deal.value), 0))
        .where(
            Deal.owner_id.in_(rep_ids),
            Deal.stage.in_([DealStage.WON, DealStage.LOST]),
            Deal.actual_close_date >= start,
            Deal.actual_close_date <= end,
        )
        .group_by(Deal.owner_id, Deal.stage)
    )
    won_count_by_rep: dict[int, int] = {}
    lost_count_by_rep: dict[int, int] = {}
    revenue_by_rep: dict[int, float] = {}
    for owner_id, stage, count, value_sum in db.execute(won_lost_stmt).all():
        if stage == DealStage.WON:
            won_count_by_rep[owner_id] = count
            revenue_by_rep[owner_id] = float(value_sum)
        else:
            lost_count_by_rep[owner_id] = count

    target_by_rep: dict[int, float] = {
        employee_id: float(total)
        for employee_id, total in db.execute(
            select(SalesTarget.employee_id, func.coalesce(func.sum(SalesTarget.target_amount), 0))
            .where(
                SalesTarget.employee_id.in_(rep_ids),
                SalesTarget.period_start <= end,
                SalesTarget.period_end >= start,
            )
            .group_by(SalesTarget.employee_id)
        ).all()
    }

    rows: list[TeamPerformanceRow] = []
    for rep in reps:
        won_count = won_count_by_rep.get(rep.id, 0)
        lost_count = lost_count_by_rep.get(rep.id, 0)
        revenue = revenue_by_rep.get(rep.id, 0.0)
        win_rate = round((won_count / (won_count + lost_count)) * 100, 1) if (won_count + lost_count) else 0
        target = target_by_rep.get(rep.id, 0.0)
        achievement_pct = round((revenue / target) * 100, 1) if target else 0

        rows.append(
            TeamPerformanceRow(
                employee=rep,
                deals_count=deals_count_by_rep.get(rep.id, 0),
                won_count=won_count,
                revenue=revenue,
                win_rate=win_rate,
                target_amount=target,
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


def get_segmentation(db: Session, user: User | None = None) -> list[SegmentationRow]:
    owner_id = _owner_scope(user)
    stmt = (
        select(Company.size, func.count(func.distinct(Company.id)), func.coalesce(func.sum(Deal.value), 0))
        .join(Deal, Deal.company_id == Company.id)
        .where(Deal.stage == DealStage.WON)
        .group_by(Company.size)
    )
    if owner_id is not None:
        stmt = stmt.where(Deal.owner_id == owner_id)
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


def get_win_loss_trend(db: Session, months: int = 6, user: User | None = None) -> list[WinLossRow]:
    owner_id = _owner_scope(user)
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
        won = _won_count(db, month_start, month_end, owner_id)
        lost_stmt = select(func.count()).where(
            Deal.stage == DealStage.LOST, Deal.actual_close_date >= month_start, Deal.actual_close_date <= month_end
        )
        if owner_id is not None:
            lost_stmt = lost_stmt.where(Deal.owner_id == owner_id)
        lost = db.execute(lost_stmt).scalar_one()
        win_rate = round((won / (won + lost)) * 100, 1) if (won + lost) else 0
        rows.append(WinLossRow(period_label=month_start.strftime("%b %Y"), won=won, lost=lost, win_rate=win_rate))
    return rows


def get_customer_growth(db: Session, months: int = 12, user: User | None = None) -> list[CustomerGrowthPoint]:
    # A Sales Rep's "customers" are the companies they personally own, not the whole org's.
    owner_id = _owner_scope(user)
    today = date.today()
    month_cursor = date(today.year, today.month, 1)
    month_starts = []
    for _ in range(months):
        month_starts.insert(0, month_cursor)
        prev_month = month_cursor.month - 1 or 12
        prev_year = month_cursor.year - 1 if month_cursor.month == 1 else month_cursor.year
        month_cursor = date(prev_year, prev_month, 1)

    points: list[CustomerGrowthPoint] = []
    running_total_stmt = select(func.count()).where(Company.created_at < month_starts[0])
    if owner_id is not None:
        running_total_stmt = running_total_stmt.where(Company.owner_id == owner_id)
    running_total = db.execute(running_total_stmt).scalar_one()

    for month_start in month_starts:
        _, last_day = monthrange(month_start.year, month_start.month)
        month_end = date(month_start.year, month_start.month, last_day)
        # `Company.created_at` is a DateTime column - an exclusive upper bound is required or
        # companies created on the last day of the month (after midnight) are silently dropped.
        month_end_exclusive = month_end + timedelta(days=1)
        new_customers_stmt = select(func.count()).where(
            Company.created_at >= month_start, Company.created_at < month_end_exclusive
        )
        if owner_id is not None:
            new_customers_stmt = new_customers_stmt.where(Company.owner_id == owner_id)
        new_customers = db.execute(new_customers_stmt).scalar_one()
        running_total += new_customers
        points.append(
            CustomerGrowthPoint(
                period_label=month_start.strftime("%b %Y"), new_customers=new_customers, total_customers=running_total
            )
        )
    return points


def get_pipeline_velocity(db: Session, days: int = 90, user: User | None = None) -> PipelineVelocity:
    owner_id = _owner_scope(user)
    start = date.today() - timedelta(days=days)
    won_stmt = select(Deal).where(Deal.stage == DealStage.WON, Deal.actual_close_date >= start)
    if owner_id is not None:
        won_stmt = won_stmt.where(Deal.owner_id == owner_id)
    won_deals = db.execute(won_stmt).scalars().all()

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

    lost_stmt = select(func.count()).where(Deal.stage == DealStage.LOST, Deal.actual_close_date >= start)
    if owner_id is not None:
        lost_stmt = lost_stmt.where(Deal.owner_id == owner_id)
    lost_count = db.execute(lost_stmt).scalar_one()
    closed_count = len(won_deals) + lost_count
    win_rate = len(won_deals) / closed_count if closed_count else 0
    velocity_score = round((len(won_deals) * win_rate * avg_deal_size) / max(avg_days, 1), 2)

    return PipelineVelocity(
        average_days_to_close=avg_days,
        average_deal_size=avg_deal_size,
        deals_per_month=deals_per_month,
        velocity_score=velocity_score,
    )


def get_business_insights(db: Session, user: User | None = None) -> list[BusinessInsight]:
    insights: list[BusinessInsight] = []

    if not has_any_deals(db, user):
        # A genuinely empty CRM (new user, or a Sales Rep who hasn't created a deal yet)
        # has no trend to report - "Performance is stable" would be a fabricated claim
        # about data that doesn't exist yet.
        return [
            BusinessInsight(
                id="no_data_yet",
                severity="info",
                title="No sales data yet",
                description="Insights appear here once you add companies, contacts and deals. "
                "Create your first opportunity to start building your pipeline.",
            )
        ]

    kpis = get_kpi_summary(db, days=30, user=user)
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

    segmentation = get_segmentation(db, user=user)
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

    funnel = get_funnel(db, days=90, user=user)
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

    # Named per-rep standing is compensation-adjacent, same rule as sales targets - only
    # compute/surface it for roles with full visibility (Admin/Manager/Analyst/Viewer),
    # never for a Sales Rep who would otherwise see colleagues' names and numbers.
    if user is None or has_full_visibility(user):
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

    win_loss = get_win_loss_trend(db, months=2, user=user)
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
