from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import AppException, app_exception_handler
from app.core.middleware import RateLimitMiddleware, SecurityHeadersMiddleware

app = FastAPI(
    title=settings.APP_NAME,
    description="Business Sales & Customer Relationship Management Platform - CRM + YBS + BI in one system.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_exception_handler(AppException, app_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": settings.APP_NAME, "env": settings.ENV}


@app.get("/healthz", tags=["Health"])
def healthz():
    return {"status": "ok"}
