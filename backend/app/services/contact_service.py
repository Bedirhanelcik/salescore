from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.audit import record_audit
from app.core.exceptions import NotFoundError
from app.core.pagination import paginate
from app.core.rbac import assert_can_access_owned_record, assert_can_modify_owned_record, require_write_access, scope_to_owner_only
from app.models.contact import Contact
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactUpdate


def list_contacts(
    db: Session,
    user: User,
    page: int,
    page_size: int,
    search: str | None = None,
    company_id: int | None = None,
    owner_id: int | None = None,
):
    stmt = select(Contact).options(joinedload(Contact.company), joinedload(Contact.owner))

    if scope_to_owner_only(user):
        stmt = stmt.where(Contact.owner_id == user.id)
    elif owner_id:
        stmt = stmt.where(Contact.owner_id == owner_id)

    if company_id:
        stmt = stmt.where(Contact.company_id == company_id)
    if search:
        stmt = stmt.where(
            (Contact.first_name + " " + Contact.last_name).ilike(f"%{search}%") | Contact.email.ilike(f"%{search}%")
        )

    stmt = stmt.order_by(Contact.created_at.desc())
    return paginate(db, stmt, page, page_size)


def get_contact_or_404(db: Session, user: User, contact_id: int) -> Contact:
    contact = db.execute(
        select(Contact).options(joinedload(Contact.company), joinedload(Contact.owner)).where(Contact.id == contact_id)
    ).scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact", contact_id)
    assert_can_access_owned_record(user, contact.owner_id)
    return contact


def create_contact(db: Session, user: User, data: ContactCreate) -> Contact:
    require_write_access(user)
    contact = Contact(**data.model_dump(exclude={"owner_id"}), owner_id=data.owner_id or user.id)
    db.add(contact)
    db.flush()
    record_audit(db, user_id=user.id, action="create", entity_type="contact", entity_id=contact.id, entity_label=contact.full_name)
    db.commit()
    db.refresh(contact)
    return contact


def update_contact(db: Session, user: User, contact_id: int, data: ContactUpdate) -> Contact:
    contact = get_contact_or_404(db, user, contact_id)
    assert_can_modify_owned_record(user, contact.owner_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    record_audit(db, user_id=user.id, action="update", entity_type="contact", entity_id=contact.id, entity_label=contact.full_name)
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, user: User, contact_id: int) -> None:
    contact = get_contact_or_404(db, user, contact_id)
    assert_can_modify_owned_record(user, contact.owner_id)
    record_audit(db, user_id=user.id, action="delete", entity_type="contact", entity_id=contact.id, entity_label=contact.full_name)
    db.delete(contact)
    db.commit()
