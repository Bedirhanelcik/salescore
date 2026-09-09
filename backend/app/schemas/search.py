from pydantic import BaseModel


class SearchResultItem(BaseModel):
    type: str  # "customer" | "contact" | "lead" | "deal" | "task" | "employee" | "knowledge_term"
    id: str
    title: str
    subtitle: str | None = None
    url: str


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
