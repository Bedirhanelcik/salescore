import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.department import Department
from app.models.enums import UserRole
from app.models.user import User

TEST_DATABASE_URL = "sqlite:///:memory:"

# The test suite fires far more requests per minute than the production rate limit
# allows (many tests share one process and one in-memory cache); raise the ceiling
# so tests exercise business logic rather than the rate limiter itself.
settings.RATE_LIMIT_PER_MINUTE = 100_000


@pytest.fixture()
def db_session():
    from sqlalchemy.pool import StaticPool

    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_user(db_session, email: str, role: UserRole, password: str = "Password123!", department: Department | None = None) -> User:
    user = User(
        email=email, password_hash=hash_password(password), full_name=email.split("@")[0].title(),
        role=role, department_id=department.id if department else None,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def auth_headers(client, email: str, password: str = "Password123!") -> dict:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_user(db_session):
    return make_user(db_session, "admin@test.io", UserRole.ADMIN)


@pytest.fixture()
def manager_user(db_session):
    return make_user(db_session, "manager@test.io", UserRole.MANAGER)


@pytest.fixture()
def sales_rep_user(db_session):
    return make_user(db_session, "rep@test.io", UserRole.SALES_REP)


@pytest.fixture()
def sales_rep2_user(db_session):
    return make_user(db_session, "rep2@test.io", UserRole.SALES_REP)


@pytest.fixture()
def analyst_user(db_session):
    return make_user(db_session, "analyst@test.io", UserRole.ANALYST)


@pytest.fixture()
def viewer_user(db_session):
    return make_user(db_session, "viewer@test.io", UserRole.VIEWER)
