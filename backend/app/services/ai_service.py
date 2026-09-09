"""AI Business Assistant.

Provider abstraction so the assistant works out of the box with zero external
dependencies (MockAIProvider, rule-based over real analytics) and can optionally
be upgraded to a real LLM by setting AI_PROVIDER=openai and OPENAI_API_KEY - the
app never requires a paid API key to function.
"""

from abc import ABC, abstractmethod

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services import analytics_service


class AIProvider(ABC):
    @abstractmethod
    def answer(self, db: Session, question: str) -> str: ...


class MockAIProvider(AIProvider):
    """Rule-based assistant: matches the question to a topic and answers using
    live analytics data pulled from the database - no external network call."""

    def answer(self, db: Session, question: str) -> str:
        q = question.lower()

        kpis = analytics_service.get_kpi_summary(db, days=30)
        metrics = {m.key: m for m in kpis.metrics}

        if any(word in q for word in ["revenue", "gelir", "umsatz"]):
            revenue = metrics["revenue"]
            trend = "up" if (revenue.change_pct or 0) >= 0 else "down"
            insights = [i for i in analytics_service.get_business_insights(db) if i.metric_key in ("revenue", "sales_target")]
            extra = f" {insights[0].description}" if insights else ""
            return (
                f"Revenue over the last 30 days is ${revenue.value:,.0f}, {trend} "
                f"{abs(revenue.change_pct or 0):.1f}% vs. the previous period.{extra}"
            )

        if any(word in q for word in ["win rate", "kazanma"]):
            win_rate = metrics["win_rate"]
            return (
                f"The current win rate is {win_rate.value:.1f}%, "
                f"{'up' if (win_rate.change_pct or 0) >= 0 else 'down'} {abs(win_rate.change_pct or 0):.1f}% "
                "compared to the previous 30-day period."
            )

        if any(word in q for word in ["pipeline", "funnel", "huni"]):
            funnel = analytics_service.get_funnel(db, days=90)
            return (
                f"The pipeline currently converts leads to won deals at {funnel.overall_conversion_rate:.1f}%. "
                + "; ".join(f"{s.label}: {s.count} deals (${s.value:,.0f})" for s in funnel.stages)
            )

        if any(word in q for word in ["team", "rep", "performance", "ekip"]):
            team = analytics_service.get_team_performance(db, days=30)
            if not team.rows:
                return "No sales representative performance data is available yet."
            top = team.rows[0]
            below = [r for r in team.rows if r.achievement_pct < 70]
            return (
                f"{top.employee.full_name} is the top performer with ${top.revenue:,.0f} in won revenue "
                f"and a {top.win_rate:.1f}% win rate. "
                + (f"{len(below)} rep(s) are below 70% of target." if below else "All reps are tracking above 70% of target.")
            )

        insights = analytics_service.get_business_insights(db)
        if insights:
            top_insight = insights[0]
            return f"{top_insight.title}. {top_insight.description}"

        return "I don't have enough data to answer that yet. Try asking about revenue, win rate, pipeline, or team performance."


class OpenAIProvider(AIProvider):
    """Optional real-LLM backend. Only instantiated when AI_PROVIDER=openai
    and OPENAI_API_KEY is set; otherwise the app falls back to MockAIProvider."""

    def answer(self, db: Session, question: str) -> str:
        try:
            from openai import OpenAI
        except ImportError:
            return MockAIProvider().answer(db, question)

        insights = analytics_service.get_business_insights(db)
        kpis = analytics_service.get_kpi_summary(db, days=30)
        context = "\n".join(f"- {i.title}: {i.description}" for i in insights)
        context += "\n" + "\n".join(f"- {m.label}: {m.value} ({m.change_pct}% change)" for m in kpis.metrics)

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful sales operations analyst. Use the provided business data context to answer concisely."},
                {"role": "user", "content": f"Business data:\n{context}\n\nQuestion: {question}"},
            ],
            max_tokens=300,
        )
        return response.choices[0].message.content or ""


def get_provider() -> AIProvider:
    if settings.AI_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        return OpenAIProvider()
    return MockAIProvider()
