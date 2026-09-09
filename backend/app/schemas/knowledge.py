from pydantic import BaseModel, ConfigDict


class KnowledgeCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    name_en: str
    name_tr: str
    name_de: str
    name_ar: str
    term_count: int = 0


class KnowledgeTermRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    category_id: int
    term_en: str
    term_tr: str
    term_de: str
    term_ar: str
    short_definition_en: str
    short_definition_tr: str
    short_definition_de: str
    short_definition_ar: str
    definition_en: str
    definition_tr: str
    definition_de: str
    definition_ar: str
    example: str | None


class KnowledgeTermBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    term_en: str
    term_tr: str
    term_de: str
    term_ar: str
    short_definition_en: str
    short_definition_tr: str
    short_definition_de: str
    short_definition_ar: str
