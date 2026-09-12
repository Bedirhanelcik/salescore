from pydantic import BaseModel


class SearchResultItem(BaseModel):
    type: str  # "customer" | "contact" | "lead" | "deal" | "task" | "employee" | "knowledge_term"
    id: str
    title: str
    subtitle: str | None = None
    url: str
    # Per-language variants for result types whose underlying record is itself translated
    # (currently only knowledge_term) - the frontend picks the entry matching its current
    # locale, same pattern already used by the Knowledge page itself. `title`/`subtitle`
    # above remain the English default for every other result type and as a fallback.
    title_i18n: dict[str, str] | None = None
    subtitle_i18n: dict[str, str] | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
