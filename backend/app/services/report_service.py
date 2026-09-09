"""Tabular reports backing the Reports page (filterable, sortable, paginated, CSV-exportable).

Every report is computed directly from the relational data - companies, contacts,
leads, deals, activities and sales_targets - rather than from any pre-baked view,
so the numbers always match what CRM/Analytics show.
"""

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.rbac import scope_to_owner_only
from app.models.activity import Activity
from app.models.company import Company
from app.models.deal import Deal
from app.models.enums import DealStage, LeadStatus
from app.models.lead import Lead
from app.models.user import User
from app.services import analytics_service

REPORT_TYPES = [
    "sales",
    "customers",
    "employee-performance",
    "revenue",
    "lead-conversion",
    "pipeline",
    "activity",
    "kpi",
]


def _date_bounds(start_date: date | None, end_date: date | None) -> tuple[date, date]:
    end = end_date or date.today()
    start = start_date or (end - timedelta(days=90))
    return start, end


def _datetime_upper_bound(end: date) -> date:
    """Exclusive upper bound for filtering a DateTime column by a plain `end` date,
    so rows created any time during `end` itself are still included (a bare
    `column <= end` would coerce `end` to midnight and silently drop same-day rows)."""
    return end + timedelta(days=1)


def sales_report(db: Session, user: User, start_date: date | None, end_date: date | None) -> list[dict]:
    start, end = _date_bounds(start_date, end_date)
    stmt = (
        select(Deal)
        .options(joinedload(Deal.company), joinedload(Deal.owner))
        .where(Deal.created_at >= start, Deal.created_at < _datetime_upper_bound(end))
    )
    if scope_to_owner_only(user):
        stmt = stmt.where(Deal.owner_id == user.id)
    rows = []
    for deal in db.execute(stmt).scalars().all():
        rows.append(
            {
                "deal": deal.title,
                "company": deal.company.name if deal.company else "-",
                "owner": deal.owner.full_name if deal.owner else "-",
                "stage": deal.stage.value,
                "value": float(deal.value),
                "probability": deal.probability,
                "expected_close_date": deal.expected_close_date.isoformat() if deal.expected_close_date else "-",
            }
        )
    return rows


def customer_report(db: Session, user: User) -> list[dict]:
    stmt = select(Company).options(joinedload(Company.owner), joinedload(Company.deals))
    if scope_to_owner_only(user):
        stmt = stmt.where(Company.owner_id == user.id)
    rows = []
    for company in db.execute(stmt).unique().scalars().all():
        deals = company.deals
        won = [d for d in deals if d.stage == DealStage.WON]
        rows.append(
            {
                "company": company.name,
                "industry": company.industry or "-",
                "country": company.country or "-",
                "status": company.status.value,
                "owner": company.owner.full_name if company.owner else "-",
                "total_deals": len(deals),
                "won_deals": len(won),
                "lifetime_value": sum(float(d.value) for d in won),
            }
        )
    return rows


def employee_performance_report(db: Session, start_date: date | None, end_date: date | None) -> list[dict]:
    start, end = _date_bounds(start_date, end_date)
    days = max((end - start).days, 1)
    team = analytics_service.get_team_performance(db, days=days)
    return [
        {
            "employee": row.employee.full_name,
            "deals": row.deals_count,
            "won": row.won_count,
            "revenue": row.revenue,
            "win_rate": row.win_rate,
            "target": row.target_amount,
            "achievement_pct": row.achievement_pct,
        }
        for row in team.rows
    ]


def revenue_report(db: Session, months: int = 12) -> list[dict]:
    trend = analytics_service.get_revenue_trend(db, months)
    return [
        {
            "period": p.period_label,
            "actual": p.actual,
            "target": p.target,
            "forecast": p.forecast,
            "previous_period": p.previous_period,
        }
        for p in trend.points
    ]


def lead_conversion_report(db: Session, user: User) -> list[dict]:
    stmt = select(Lead).options(joinedload(Lead.owner))
    if scope_to_owner_only(user):
        stmt = stmt.where(Lead.owner_id == user.id)
    rows = []
    for lead in db.execute(stmt).scalars().all():
        rows.append(
            {
                "lead": lead.name,
                "company": lead.company_name or "-",
                "source": lead.source.value,
                "score": lead.score,
                "status": lead.status.value,
                "owner": lead.owner.full_name if lead.owner else "-",
                "converted": lead.status == LeadStatus.CONVERTED,
            }
        )
    return rows


def pipeline_report(db: Session, user: User) -> list[dict]:
    stmt = select(Deal).options(joinedload(Deal.owner))
    if scope_to_owner_only(user):
        stmt = stmt.where(Deal.owner_id == user.id)
    rows = []
    for deal in db.execute(stmt).scalars().all():
        rows.append(
            {
                "deal": deal.title,
                "stage": deal.stage.value,
                "value": float(deal.value),
                "probability": deal.probability,
                "owner": deal.owner.full_name if deal.owner else "-",
                "days_in_pipeline": (date.today() - deal.created_at.date()).days,
            }
        )
    return rows


def activity_report(db: Session, user: User, start_date: date | None, end_date: date | None) -> list[dict]:
    start, end = _date_bounds(start_date, end_date)
    stmt = (
        select(Activity)
        .options(joinedload(Activity.owner), joinedload(Activity.company))
        .where(Activity.activity_date >= start, Activity.activity_date < _datetime_upper_bound(end))
    )
    if scope_to_owner_only(user):
        stmt = stmt.where(Activity.owner_id == user.id)
    rows = []
    for activity in db.execute(stmt).scalars().all():
        rows.append(
            {
                "title": activity.title,
                "type": activity.type.value,
                "status": activity.status.value,
                "owner": activity.owner.full_name if activity.owner else "-",
                "company": activity.company.name if activity.company else "-",
                "date": activity.activity_date.date().isoformat(),
            }
        )
    return rows


def kpi_report(db: Session) -> list[dict]:
    kpis = analytics_service.get_kpi_summary(db, days=30)
    return [{"metric": m.label, "value": m.value, "change_pct": m.change_pct, "format": m.format} for m in kpis.metrics]


def get_report(
    db: Session, user: User, report_type: str, start_date: date | None = None, end_date: date | None = None
) -> list[dict]:
    match report_type:
        case "sales":
            return sales_report(db, user, start_date, end_date)
        case "customers":
            return customer_report(db, user)
        case "employee-performance":
            return employee_performance_report(db, start_date, end_date)
        case "revenue":
            return revenue_report(db)
        case "lead-conversion":
            return lead_conversion_report(db, user)
        case "pipeline":
            return pipeline_report(db, user)
        case "activity":
            return activity_report(db, user, start_date, end_date)
        case "kpi":
            return kpi_report(db)
        case _:
            return []
