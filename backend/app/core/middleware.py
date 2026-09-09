import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.cache import get_cache
from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window rate limiter per client IP, backed by the shared cache client."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path.startswith("/api/v1"):
            cache = get_cache()
            window = int(time.time() // 60)
            client_ip = request.client.host if request.client else "unknown"
            key = f"ratelimit:{client_ip}:{window}"
            count = cache.get(key) or 0
            count += 1
            cache.set(key, count, ttl_seconds=60)
            if count > settings.RATE_LIMIT_PER_MINUTE:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": {"code": "RATE_LIMITED", "message": "Too many requests. Please slow down."},
                    },
                )
        return await call_next(request)
