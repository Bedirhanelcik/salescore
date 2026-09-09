"""Seeds the database with realistic demo data so the app never opens empty.

Run with: python -m app.seed.seed_data (from the backend/ directory, venv active).
Safe to re-run: it wipes and recreates all rows.
"""

import random
from datetime import date, datetime, timedelta, timezone

from faker import Faker
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.activity import Activity
from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.contact import Contact
from app.models.deal import Deal, DealStageHistory
from app.models.department import Department
from app.models.enums import (
    DEAL_STAGE_ORDER,
    ActivityStatus,
    ActivityType,
    CompanySize,
    CompanyStatus,
    DealStage,
    LeadSource,
    LeadStatus,
    NotificationType,
    TargetPeriod,
    TaskPriority,
    TaskStatus,
    UserRole,
)
from app.models.knowledge import KnowledgeCategory, KnowledgeTerm
from app.models.lead import Lead
from app.models.notification import Notification
from app.models.sales_target import SalesTarget
from app.models.task import Task
from app.models.user import User
from app.core.security import hash_password
from app.seed.knowledge_data import CATEGORIES, TERMS

fake = Faker()
random.seed(42)
Faker.seed(42)

AVATAR_PALETTE = ["#4F46E5", "#0EA5E9", "#059669", "#D97706", "#DC2626", "#7C3AED", "#DB2777", "#0891B2"]

DEPARTMENTS = [
    ("Sales", "Revenue-generating field and inside sales teams."),
    ("Marketing", "Demand generation, brand and campaign management."),
    ("Finance", "Accounting, billing and financial planning."),
    ("Human Resources", "People operations, hiring and employee experience."),
    ("Operations", "Business operations, process and vendor management."),
    ("IT", "Internal tooling, infrastructure and security."),
    ("Management", "Executive leadership and cross-team strategy."),
]

INDUSTRIES = ["Software", "Manufacturing", "Retail", "Healthcare", "Financial Services", "Logistics", "Energy", "Telecommunications", "Education", "Real Estate"]
COUNTRIES = ["United States", "United Kingdom", "Germany", "Turkey", "United Arab Emirates", "France", "Netherlands", "Canada", "Spain", "Saudi Arabia"]
COMPANY_SUFFIXES = ["Inc.", "Corp.", "Group", "Holdings", "Technologies", "Solutions", "Industries", "Partners"]

LOST_REASONS = [
    "Budget constraints", "Chose a competitor", "Project cancelled internally",
    "Pricing too high", "Timing not right", "No response from champion",
]


def _company_name() -> str:
    base = fake.company().split(",")[0].split(" LLC")[0]
    if not any(base.endswith(s) for s in COMPANY_SUFFIXES):
        base = f"{base} {random.choice(COMPANY_SUFFIXES)}"
    return base


def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed_knowledge(db: Session) -> None:
    category_map: dict[str, KnowledgeCategory] = {}
    for cat in CATEGORIES:
        obj = KnowledgeCategory(**cat)
        db.add(obj)
        db.flush()
        category_map[cat["key"]] = obj

    for term in TERMS:
        term = dict(term)
        category_key = term.pop("category")
        db.add(KnowledgeTerm(category_id=category_map[category_key].id, **term))
    db.commit()


def seed_departments(db: Session) -> dict[str, Department]:
    result = {}
    for name, description in DEPARTMENTS:
        dept = Department(name=name, description=description)
        db.add(dept)
        db.flush()
        result[name] = dept
    db.commit()
    return result


def seed_users(db: Session, departments: dict[str, Department]) -> dict[str, list[User]]:
    users: dict[str, list[User]] = {"admin": [], "manager": [], "sales_rep": [], "analyst": [], "viewer": []}

    def make(email, password, full_name, role, dept, title, manager=None) -> User:
        u = User(
            email=email, password_hash=hash_password(password), full_name=full_name, role=role,
            department_id=dept.id if dept else None, job_title=title,
            manager_id=manager.id if manager else None,
            avatar_color=random.choice(AVATAR_PALETTE),
        )
        db.add(u)
        db.flush()
        return u

    admin = make("admin@salescore.io", "Admin123!", "Elena Kovacs", UserRole.ADMIN, departments["Management"], "System Administrator")
    users["admin"].append(admin)

    manager1 = make("manager@salescore.io", "Manager123!", "Marcus Webb", UserRole.MANAGER, departments["Sales"], "Sales Director", admin)
    manager2 = make("sarah.manager@salescore.io", "Manager123!", "Sarah Nakamura", UserRole.MANAGER, departments["Marketing"], "Marketing Director", admin)
    users["manager"] += [manager1, manager2]

    rep_names = [
        "Ahmet Yilmaz", "Elif Demir", "Mert Kaya", "James Carter", "Olivia Bennett",
        "Lucas Martin", "Amara Johnson", "Noah Fischer", "Layla Haddad", "Ben Turner",
    ]
    sales_reps = []
    for i, name in enumerate(rep_names):
        email = "sales@salescore.io" if i == 0 else f"{name.lower().replace(' ', '.')}@salescore.io"
        rep = make(email, "Sales123!", name, UserRole.SALES_REP, departments["Sales"], "Sales Representative", manager1)
        sales_reps.append(rep)
    users["sales_rep"] = sales_reps

    analyst1 = make("analyst@salescore.io", "Analyst123!", "Priya Chandran", UserRole.ANALYST, departments["Finance"], "Business Analyst", admin)
    analyst2 = make("tom.analyst@salescore.io", "Analyst123!", "Tom Richter", UserRole.ANALYST, departments["Operations"], "Operations Analyst", admin)
    users["analyst"] = [analyst1, analyst2]

    viewer1 = make("viewer@salescore.io", "Viewer123!", "Grace Liu", UserRole.VIEWER, departments["Human Resources"], "HR Coordinator", admin)
    users["viewer"] = [viewer1]

    hr_extra = make("hr.lead@salescore.io", "Viewer123!", "Daniel Osei", UserRole.MANAGER, departments["Human Resources"], "HR Manager", admin)
    it_lead = make("it.lead@salescore.io", "Viewer123!", "Nadia Rahimi", UserRole.MANAGER, departments["IT"], "IT Manager", admin)
    users["manager"] += [hr_extra, it_lead]

    db.commit()
    return users


def seed_companies(db: Session, sales_reps: list[User]) -> list[Company]:
    companies = []
    for _ in range(16):
        company = Company(
            name=_company_name(),
            industry=random.choice(INDUSTRIES),
            size=random.choice(list(CompanySize)),
            country=random.choice(COUNTRIES),
            website=fake.domain_name(),
            annual_revenue=random.randint(500_000, 80_000_000),
            status=random.choices(list(CompanyStatus), weights=[0.55, 0.15, 0.3])[0],
            owner_id=random.choice(sales_reps).id,
        )
        db.add(company)
        companies.append(company)
    db.flush()
    db.commit()
    return companies


def seed_contacts(db: Session, companies: list[Company]) -> list[Contact]:
    contacts = []
    for company in companies:
        for _ in range(random.randint(1, 3)):
            contact = Contact(
                first_name=fake.first_name(), last_name=fake.last_name(),
                email=fake.company_email(), phone=fake.phone_number(),
                job_title=random.choice(["CEO", "CFO", "VP Sales", "Head of Procurement", "IT Director", "COO", "VP Marketing"]),
                company_id=company.id, owner_id=company.owner_id,
            )
            db.add(contact)
            contacts.append(contact)
    db.flush()
    db.commit()
    return contacts


def seed_leads(db: Session, sales_reps: list[User]) -> list[Lead]:
    leads = []
    for _ in range(34):
        status = random.choices(list(LeadStatus), weights=[0.25, 0.25, 0.2, 0.15, 0.15])[0]
        lead = Lead(
            name=fake.name(), company_name=_company_name(), email=fake.email(), phone=fake.phone_number(),
            source=random.choice(list(LeadSource)), score=random.randint(10, 95), status=status,
            notes=fake.sentence(nb_words=12), owner_id=random.choice(sales_reps).id,
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 120)),
        )
        db.add(lead)
        leads.append(lead)
    db.flush()
    db.commit()
    return leads


def _stage_probability(stage: DealStage) -> int:
    if stage == DealStage.WON:
        return 100
    if stage == DealStage.LOST:
        return 0
    idx = DEAL_STAGE_ORDER.index(stage) if stage in DEAL_STAGE_ORDER else 0
    return min(90, 10 + idx * 18)


def seed_deals(db: Session, companies: list[Company], contacts: list[Contact], sales_reps: list[User]) -> list[Deal]:
    deals = []
    contacts_by_company: dict[int, list[Contact]] = {}
    for c in contacts:
        contacts_by_company.setdefault(c.company_id, []).append(c)

    stage_weights = {
        DealStage.LEAD: 0.10, DealStage.QUALIFIED: 0.14, DealStage.OPPORTUNITY: 0.14,
        DealStage.PROPOSAL: 0.12, DealStage.NEGOTIATION: 0.1, DealStage.WON: 0.28, DealStage.LOST: 0.12,
    }

    for i in range(90):
        company = random.choice(companies)
        owner = random.choice(sales_reps)
        stage = random.choices(list(stage_weights), weights=list(stage_weights.values()))[0]
        # Triangular distribution: most deals are recent (mode ~35 days), with a long tail
        # back to ~13 months so the 12-month revenue trend chart has data in every month.
        age_days = int(random.triangular(2, 400, 35))
        created_at = datetime.now(timezone.utc) - timedelta(days=age_days)
        value = random.choice([8_500, 12_000, 18_500, 24_000, 32_000, 45_000, 58_000, 75_000, 110_000, 150_000])
        company_contacts = contacts_by_company.get(company.id, [])

        deal = Deal(
            title=f"{company.name} - {random.choice(['New Business', 'Expansion', 'Renewal', 'Upsell', 'Platform Deal'])}",
            company_id=company.id,
            contact_id=random.choice(company_contacts).id if company_contacts else None,
            owner_id=owner.id,
            value=value,
            probability=_stage_probability(stage),
            stage=stage,
            source=random.choice(list(LeadSource)),
            expected_close_date=created_at.date() + timedelta(days=random.randint(14, 90)),
            created_at=created_at,
            updated_at=created_at,
        )

        history_stages = DEAL_STAGE_ORDER[: DEAL_STAGE_ORDER.index(stage) + 1] if stage in DEAL_STAGE_ORDER else DEAL_STAGE_ORDER[:2]
        if stage == DealStage.LOST:
            drop_index = random.randint(1, len(DEAL_STAGE_ORDER) - 2)
            history_stages = DEAL_STAGE_ORDER[:drop_index]

        today = datetime.now(timezone.utc)
        if stage in (DealStage.WON, DealStage.LOST):
            close_days = random.randint(10, 75)
            close_at = min(created_at + timedelta(days=close_days), today)
            deal.actual_close_date = close_at.date()
            deal.last_activity_at = close_at
            if stage == DealStage.LOST:
                deal.lost_reason = random.choice(LOST_REASONS)
        else:
            deal.last_activity_at = min(created_at + timedelta(days=random.randint(0, 14)), today)

        db.add(deal)
        db.flush()

        cursor = created_at
        prev = None
        for hs in history_stages:
            db.add(DealStageHistory(deal_id=deal.id, from_stage=prev, to_stage=hs, changed_by_id=owner.id, changed_at=cursor, note=None))
            prev = hs
            cursor += timedelta(days=random.randint(2, 12))
        if stage in (DealStage.WON, DealStage.LOST):
            db.add(DealStageHistory(deal_id=deal.id, from_stage=prev, to_stage=stage, changed_by_id=owner.id, changed_at=cursor, note=deal.lost_reason))

        deals.append(deal)

    db.commit()
    return deals


def seed_activities(db: Session, deals: list[Deal], sales_reps: list[User]) -> None:
    activity_titles = {
        ActivityType.CALL: "Discovery call", ActivityType.EMAIL: "Follow-up email",
        ActivityType.MEETING: "Solution walkthrough meeting", ActivityType.NOTE: "Internal note",
        ActivityType.FOLLOW_UP: "Scheduled follow-up", ActivityType.DEMO: "Product demo",
        ActivityType.PROPOSAL: "Proposal sent", ActivityType.TASK: "Action item",
    }
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for deal in deals:
        count = random.randint(2, 6)
        cursor = deal.created_at.replace(tzinfo=None) if deal.created_at.tzinfo else deal.created_at
        for _ in range(count):
            atype = random.choice(list(ActivityType))
            cursor += timedelta(days=random.randint(1, 10))
            if cursor > now:
                cursor = now - timedelta(hours=random.randint(1, 48))
            db.add(
                Activity(
                    type=atype, title=activity_titles[atype], description=fake.sentence(nb_words=14),
                    status=random.choice(list(ActivityStatus)), activity_date=cursor,
                    owner_id=deal.owner_id, company_id=deal.company_id, contact_id=deal.contact_id, deal_id=deal.id,
                )
            )
    db.commit()


def seed_tasks(db: Session, sales_reps: list[User], deals: list[Deal]) -> None:
    now = datetime.now(timezone.utc)
    task_titles = [
        "Send updated proposal", "Prepare contract redlines", "Schedule executive check-in",
        "Confirm pricing with finance", "Follow up on demo feedback", "Draft renewal quote",
        "Update CRM with call notes", "Coordinate technical evaluation", "Send case study",
        "Book onsite meeting",
    ]
    for _ in range(60):
        assignee = random.choice(sales_reps)
        due_offset = random.randint(-10, 20)
        due = now + timedelta(days=due_offset)
        if due_offset < 0:
            status = random.choice([TaskStatus.OVERDUE, TaskStatus.COMPLETED])
        else:
            status = random.choices([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED], weights=[0.5, 0.3, 0.2])[0]
        related_deal = random.choice(deals) if random.random() < 0.7 else None
        db.add(
            Task(
                title=random.choice(task_titles), description=fake.sentence(nb_words=10),
                status=status, priority=random.choice(list(TaskPriority)), due_date=due,
                completed_at=(now - timedelta(days=random.randint(0, 5))) if status == TaskStatus.COMPLETED else None,
                assignee_id=assignee.id, created_by_id=assignee.id,
                related_company_id=related_deal.company_id if related_deal else None,
                related_deal_id=related_deal.id if related_deal else None,
            )
        )
    db.commit()


def seed_targets(db: Session, sales_reps: list[User], departments: dict[str, Department]) -> None:
    today = date.today()
    month_cursor = date(today.year, today.month, 1)
    for _ in range(12):
        month_start = month_cursor
        next_month = date(month_start.year + (1 if month_start.month == 12 else 0), 1 if month_start.month == 12 else month_start.month + 1, 1)
        month_end = next_month - timedelta(days=1)
        month_cursor = date(month_start.year - (1 if month_start.month == 1 else 0), 12 if month_start.month == 1 else month_start.month - 1, 1)

        for rep in sales_reps:
            db.add(
                SalesTarget(
                    name=f"{rep.full_name} - {month_start.strftime('%B %Y')}",
                    period=TargetPeriod.MONTHLY, period_start=month_start, period_end=month_end,
                    target_amount=random.choice([18_000, 22_000, 26_000, 30_000]), employee_id=rep.id,
                )
            )
        db.add(
            SalesTarget(
                name=f"Sales Department - {month_start.strftime('%B %Y')}",
                period=TargetPeriod.MONTHLY, period_start=month_start, period_end=month_end,
                target_amount=230_000, department_id=departments["Sales"].id,
            )
        )
    db.commit()


def seed_notifications(db: Session, sales_reps: list[User], deals: list[Deal]) -> None:
    won_deals = [d for d in deals if d.stage == DealStage.WON][:8]
    for deal in won_deals:
        db.add(
            Notification(
                user_id=deal.owner_id, type=NotificationType.DEAL_WON, title="Deal won!",
                message=f"'{deal.title}' was marked as Won.", related_entity_type="deal", related_entity_id=deal.id,
                is_read=random.random() < 0.4,
            )
        )
    for rep in sales_reps[:5]:
        db.add(
            Notification(
                user_id=rep.id, type=NotificationType.TASK_DUE, title="Task due soon",
                message="You have a task due within 24 hours.", is_read=False,
            )
        )
    db.commit()


def run() -> None:
    print("Resetting database schema...")
    reset_database()

    db = SessionLocal()
    try:
        print("Seeding knowledge base...")
        seed_knowledge(db)

        print("Seeding departments...")
        departments = seed_departments(db)

        print("Seeding users...")
        users = seed_users(db, departments)
        sales_reps = users["sales_rep"]

        print("Seeding companies...")
        companies = seed_companies(db, sales_reps)

        print("Seeding contacts...")
        contacts = seed_contacts(db, companies)

        print("Seeding leads...")
        seed_leads(db, sales_reps)

        print("Seeding deals + stage history...")
        deals = seed_deals(db, companies, contacts, sales_reps)

        print("Seeding activities...")
        seed_activities(db, deals, sales_reps)

        print("Seeding tasks...")
        seed_tasks(db, sales_reps, deals)

        print("Seeding sales targets...")
        seed_targets(db, sales_reps, departments)

        print("Seeding notifications...")
        seed_notifications(db, sales_reps, deals)

        print("Seed complete.")
        print(f"Companies: {len(companies)}, Contacts: {len(contacts)}, Deals: {len(deals)}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
