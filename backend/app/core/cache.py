import json
from functools import lru_cache
from typing import Any

from app.core.config import settings


class CacheClient:
    """Thin Redis wrapper. Falls back to a no-op in-memory stub if Redis is unreachable,
    so the app keeps working in environments without a Redis instance (e.g. local dev without Docker)."""

    def __init__(self) -> None:
        self._store: dict[str, str] = {}
        self._client = None
        try:
            import redis

            client = redis.from_url(settings.REDIS_URL, socket_connect_timeout=0.5, decode_responses=True)
            client.ping()
            self._client = client
        except Exception:
            self._client = None

    def get(self, key: str) -> Any | None:
        raw = self._client.get(key) if self._client else self._store.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            return raw

    def set(self, key: str, value: Any, ttl_seconds: int = 60) -> None:
        raw = json.dumps(value, default=str)
        if self._client:
            self._client.set(key, raw, ex=ttl_seconds)
        else:
            self._store[key] = raw

    def delete_prefix(self, prefix: str) -> None:
        if self._client:
            for key in self._client.scan_iter(f"{prefix}*"):
                self._client.delete(key)
        else:
            for key in list(self._store):
                if key.startswith(prefix):
                    del self._store[key]


@lru_cache
def get_cache() -> CacheClient:
    return CacheClient()
