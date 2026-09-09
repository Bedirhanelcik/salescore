import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    SALES_REP = "sales_rep"
    ANALYST = "analyst"
    VIEWER = "viewer"


class CompanyStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROSPECT = "prospect"


class CompanySize(str, enum.Enum):
    SELF_EMPLOYED = "self_employed"
    SMALL = "1-50"
    MEDIUM = "51-200"
    LARGE = "201-1000"
    ENTERPRISE = "1000+"


class LeadSource(str, enum.Enum):
    WEBSITE = "website"
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    ADVERTISEMENT = "advertisement"
    EMAIL = "email"
    EVENT = "event"
    OTHER = "other"


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    UNQUALIFIED = "unqualified"
    CONVERTED = "converted"


class DealStage(str, enum.Enum):
    LEAD = "lead"
    QUALIFIED = "qualified"
    OPPORTUNITY = "opportunity"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


DEAL_STAGE_ORDER = [
    DealStage.LEAD,
    DealStage.QUALIFIED,
    DealStage.OPPORTUNITY,
    DealStage.PROPOSAL,
    DealStage.NEGOTIATION,
    DealStage.WON,
]

# Allowed forward/backward transitions. Any stage may move to LOST (deal falls through)
# except stages that are already terminal. WON/LOST are terminal - no transitions out.
DEAL_STAGE_TRANSITIONS: dict[DealStage, set[DealStage]] = {
    DealStage.LEAD: {DealStage.QUALIFIED, DealStage.LOST},
    DealStage.QUALIFIED: {DealStage.LEAD, DealStage.OPPORTUNITY, DealStage.LOST},
    DealStage.OPPORTUNITY: {DealStage.QUALIFIED, DealStage.PROPOSAL, DealStage.LOST},
    DealStage.PROPOSAL: {DealStage.OPPORTUNITY, DealStage.NEGOTIATION, DealStage.LOST},
    DealStage.NEGOTIATION: {DealStage.PROPOSAL, DealStage.WON, DealStage.LOST},
    DealStage.WON: set(),
    DealStage.LOST: set(),
}


class ActivityType(str, enum.Enum):
    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    NOTE = "note"
    TASK = "task"
    FOLLOW_UP = "follow_up"
    DEMO = "demo"
    PROPOSAL = "proposal"


class ActivityStatus(str, enum.Enum):
    PLANNED = "planned"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationType(str, enum.Enum):
    TASK_DUE = "task_due"
    DEAL_FOLLOW_UP = "deal_follow_up"
    NEW_LEAD = "new_lead"
    DEAL_WON = "deal_won"
    DEAL_LOST = "deal_lost"
    TARGET_REACHED = "target_reached"
    MENTION = "mention"


class TargetPeriod(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
