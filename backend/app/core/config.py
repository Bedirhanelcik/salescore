from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Fine for local development (no setup required to run the app), but must never reach a
# production deployment - the guard below refuses to start the app with these if ENV=production.
_INSECURE_JWT_SECRET_KEY = "change-me-in-production-please-use-a-long-random-string"
_INSECURE_DATABASE_URL = "postgresql+psycopg://salescore:salescore@localhost:5432/salescore"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "SalesCore"
    ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = _INSECURE_DATABASE_URL
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = _INSECURE_JWT_SECRET_KEY
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    RATE_LIMIT_PER_MINUTE: int = 120

    AI_PROVIDER: str = "mock"  # "mock" | "openai"
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Support ticket notification email. All optional - when SMTP_HOST/SUPPORT_EMAIL aren't
    # set (e.g. local dev), app.core.email silently no-ops instead of crashing; the ticket is
    # still saved to the database either way (see support_service.create_ticket).
    SUPPORT_EMAIL: str | None = None
    SUPPORT_FROM_EMAIL: str | None = None
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SUPPORT_TICKETS_PER_HOUR: int = 5

    @model_validator(mode="after")
    def _reject_insecure_defaults_in_production(self) -> "Settings":
        if self.ENV.lower() != "production":
            return self
        if self.JWT_SECRET_KEY == _INSECURE_JWT_SECRET_KEY:
            raise ValueError(
                "Refusing to start with ENV=production: JWT_SECRET_KEY is still the development "
                "default. Set a long, random JWT_SECRET_KEY in the environment before deploying."
            )
        if self.DATABASE_URL == _INSECURE_DATABASE_URL:
            raise ValueError(
                "Refusing to start with ENV=production: DATABASE_URL is still the development "
                "default. Set a real DATABASE_URL in the environment before deploying."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
