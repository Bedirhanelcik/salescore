import pytest
from pydantic import ValidationError

from app.core.config import Settings

# `_env_file=None` isolates these from the repo's own .env (which already overrides the
# insecure class defaults for local dev) so each test exercises the guard deterministically.


def test_development_allows_insecure_defaults():
    settings = Settings(_env_file=None, ENV="development")
    assert settings.JWT_SECRET_KEY == "change-me-in-production-please-use-a-long-random-string"


def test_production_rejects_default_jwt_secret_key():
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        Settings(
            _env_file=None,
            ENV="production",
            DATABASE_URL="postgresql+psycopg://real:real@db.internal:5432/salescore",
        )


def test_production_rejects_default_database_url():
    with pytest.raises(ValidationError, match="DATABASE_URL"):
        Settings(_env_file=None, ENV="production", JWT_SECRET_KEY="a-real-long-random-secret-key")


def test_production_allows_real_secrets():
    settings = Settings(
        _env_file=None,
        ENV="production",
        JWT_SECRET_KEY="a-real-long-random-secret-key",
        DATABASE_URL="postgresql+psycopg://real:real@db.internal:5432/salescore",
    )
    assert settings.ENV == "production"
