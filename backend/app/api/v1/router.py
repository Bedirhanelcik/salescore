from fastapi import APIRouter

from app.api.v1.endpoints import (
    activities,
    ai,
    analytics,
    audit_logs,
    auth,
    companies,
    contacts,
    deals,
    departments,
    employees,
    knowledge,
    leads,
    notifications,
    reports,
    sales_targets,
    search,
    support,
    tasks,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(companies.router)
api_router.include_router(contacts.router)
api_router.include_router(leads.router)
api_router.include_router(deals.router)
api_router.include_router(activities.router)
api_router.include_router(tasks.router)
api_router.include_router(employees.router)
api_router.include_router(departments.router)
api_router.include_router(sales_targets.router)
api_router.include_router(analytics.router)
api_router.include_router(reports.router)
api_router.include_router(knowledge.router)
api_router.include_router(notifications.router)
api_router.include_router(audit_logs.router)
api_router.include_router(search.router)
api_router.include_router(ai.router)
api_router.include_router(support.router)
