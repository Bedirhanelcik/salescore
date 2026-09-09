"""Central RBAC rules shared by every service.

Roles:
- ADMIN: full access to everything, including employee/department management.
- MANAGER: sees and manages the whole team's CRM data, targets and reports.
- SALES_REP: sees and manages only the customers/leads/deals/tasks they own.
- ANALYST: read-only access to everything, focused on analytics and reports.
- VIEWER: read-only access to everything.

These rules are enforced here (server-side) rather than only hidden in the UI,
so that IDOR-style attempts (e.g. a Sales Rep guessing another rep's deal id)
are rejected regardless of what the frontend renders.
"""

from app.core.exceptions import ForbiddenError
from app.models.enums import UserRole
from app.models.user import User

WRITE_ROLES = {UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP}
READ_ONLY_ROLES = {UserRole.ANALYST, UserRole.VIEWER}
FULL_VISIBILITY_ROLES = {UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST, UserRole.VIEWER}


def can_write(user: User) -> bool:
    return user.role in WRITE_ROLES


def require_write_access(user: User) -> None:
    if not can_write(user):
        raise ForbiddenError("Your role has read-only access.")


def has_full_visibility(user: User) -> bool:
    """Whether the user can see records regardless of ownership."""
    return user.role in FULL_VISIBILITY_ROLES


def scope_to_owner_only(user: User) -> bool:
    """Sales reps only see/manage records they own."""
    return user.role == UserRole.SALES_REP


def assert_can_access_owned_record(user: User, owner_id: int | None) -> None:
    if has_full_visibility(user):
        return
    if owner_id is not None and owner_id == user.id:
        return
    raise ForbiddenError("You can only access records you own.")


def assert_can_modify_owned_record(user: User, owner_id: int | None) -> None:
    require_write_access(user)
    if user.role in (UserRole.ADMIN, UserRole.MANAGER):
        return
    if owner_id is not None and owner_id == user.id:
        return
    raise ForbiddenError("You can only modify records you own.")
