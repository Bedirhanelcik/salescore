from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.rbac import scope_to_owner_only
from app.models.company import Company
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.knowledge import KnowledgeTerm
from app.models.lead import Lead
from app.models.task import Task
from app.models.user import User
from app.schemas.search import SearchResultItem

LIMIT_PER_TYPE = 5


def global_search(db: Session, user: User, query: str) -> list[SearchResultItem]:
    pattern = f"%{query}%"
    results: list[SearchResultItem] = []

    companies_stmt = select(Company).where(Company.name.ilike(pattern)).limit(LIMIT_PER_TYPE)
    if scope_to_owner_only(user):
        companies_stmt = companies_stmt.where(Company.owner_id == user.id)
    for c in db.execute(companies_stmt).scalars().all():
        results.append(
            SearchResultItem(
                type="customer", id=str(c.id), title=c.name, subtitle=c.industry, url=f"/crm/companies/{c.id}"
            )
        )

    contacts_stmt = (
        select(Contact).where((Contact.first_name + " " + Contact.last_name).ilike(pattern)).limit(LIMIT_PER_TYPE)
    )
    if scope_to_owner_only(user):
        contacts_stmt = contacts_stmt.where(Contact.owner_id == user.id)
    for c in db.execute(contacts_stmt).scalars().all():
        results.append(
            SearchResultItem(
                type="contact", id=str(c.id), title=c.full_name, subtitle=c.job_title, url=f"/crm/contacts/{c.id}"
            )
        )

    leads_stmt = select(Lead).where(Lead.name.ilike(pattern)).limit(LIMIT_PER_TYPE)
    if scope_to_owner_only(user):
        leads_stmt = leads_stmt.where(Lead.owner_id == user.id)
    for lead in db.execute(leads_stmt).scalars().all():
        results.append(
            SearchResultItem(
                type="lead", id=str(lead.id), title=lead.name, subtitle=lead.company_name, url=f"/crm/leads/{lead.id}"
            )
        )

    deals_stmt = select(Deal).where(Deal.title.ilike(pattern)).limit(LIMIT_PER_TYPE)
    if scope_to_owner_only(user):
        deals_stmt = deals_stmt.where(Deal.owner_id == user.id)
    for d in db.execute(deals_stmt).scalars().all():
        results.append(
            SearchResultItem(
                type="deal", id=str(d.id), title=d.title, subtitle=f"${float(d.value):,.0f}", url=f"/sales/deals/{d.id}"
            )
        )

    tasks_stmt = select(Task).where(Task.title.ilike(pattern)).limit(LIMIT_PER_TYPE)
    if scope_to_owner_only(user):
        tasks_stmt = tasks_stmt.where(Task.assignee_id == user.id)
    for t in db.execute(tasks_stmt).scalars().all():
        results.append(
            SearchResultItem(
                type="task", id=str(t.id), title=t.title, subtitle=t.status.value, url=f"/operations/tasks/{t.id}"
            )
        )

    for u in db.execute(select(User).where(User.full_name.ilike(pattern)).limit(LIMIT_PER_TYPE)).scalars().all():
        results.append(
            SearchResultItem(
                type="employee",
                id=str(u.id),
                title=u.full_name,
                subtitle=u.job_title,
                url=f"/operations/employees/{u.id}",
            )
        )

    knowledge_stmt = (
        select(KnowledgeTerm)
        .where(
            or_(
                KnowledgeTerm.term_en.ilike(pattern),
                KnowledgeTerm.term_tr.ilike(pattern),
                KnowledgeTerm.term_de.ilike(pattern),
                KnowledgeTerm.term_ar.ilike(pattern),
            )
        )
        .limit(LIMIT_PER_TYPE)
    )
    for k in db.execute(knowledge_stmt).scalars().all():
        results.append(
            SearchResultItem(
                type="knowledge_term",
                id=k.key,
                title=k.term_en,
                subtitle=k.short_definition_en,
                url=f"/knowledge/{k.key}",
                title_i18n={"en": k.term_en, "tr": k.term_tr, "de": k.term_de, "ar": k.term_ar},
                subtitle_i18n={
                    "en": k.short_definition_en,
                    "tr": k.short_definition_tr,
                    "de": k.short_definition_de,
                    "ar": k.short_definition_ar,
                },
            )
        )

    return results
