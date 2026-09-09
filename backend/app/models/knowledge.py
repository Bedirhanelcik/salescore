from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class KnowledgeCategory(Base, TimestampMixin):
    __tablename__ = "knowledge_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    name_tr: Mapped[str] = mapped_column(String(100), nullable=False)
    name_de: Mapped[str] = mapped_column(String(100), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(100), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    terms = relationship("KnowledgeTerm", back_populates="category", cascade="all, delete-orphan")


class KnowledgeTerm(Base, TimestampMixin):
    __tablename__ = "knowledge_terms"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("knowledge_categories.id"), nullable=False)

    term_en: Mapped[str] = mapped_column(String(150), nullable=False)
    term_tr: Mapped[str] = mapped_column(String(150), nullable=False)
    term_de: Mapped[str] = mapped_column(String(150), nullable=False)
    term_ar: Mapped[str] = mapped_column(String(150), nullable=False)

    short_definition_en: Mapped[str] = mapped_column(String(300), nullable=False)
    short_definition_tr: Mapped[str] = mapped_column(String(300), nullable=False)
    short_definition_de: Mapped[str] = mapped_column(String(300), nullable=False)
    short_definition_ar: Mapped[str] = mapped_column(String(300), nullable=False)

    definition_en: Mapped[str] = mapped_column(Text, nullable=False)
    definition_tr: Mapped[str] = mapped_column(Text, nullable=False)
    definition_de: Mapped[str] = mapped_column(Text, nullable=False)
    definition_ar: Mapped[str] = mapped_column(Text, nullable=False)

    example: Mapped[str | None] = mapped_column(Text, nullable=True)

    category = relationship("KnowledgeCategory", back_populates="terms")
