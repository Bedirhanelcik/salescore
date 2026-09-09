from app.seed.knowledge_data import CATEGORIES, TERMS
from app.models.knowledge import KnowledgeCategory, KnowledgeTerm


def _seed_knowledge(db_session):
    category_map = {}
    for cat in CATEGORIES:
        obj = KnowledgeCategory(**cat)
        db_session.add(obj)
        db_session.flush()
        category_map[cat["key"]] = obj
    for term in list(TERMS):
        term = dict(term)
        category_key = term.pop("category")
        db_session.add(KnowledgeTerm(category_id=category_map[category_key].id, **term))
    db_session.commit()


def test_knowledge_categories_are_public(client, db_session):
    _seed_knowledge(db_session)
    response = client.get("/api/v1/knowledge/categories")
    assert response.status_code == 200
    assert len(response.json()) == len(CATEGORIES)


def test_knowledge_term_lookup_by_key(client, db_session):
    _seed_knowledge(db_session)
    response = client.get("/api/v1/knowledge/terms/win_rate")
    assert response.status_code == 200
    body = response.json()
    assert body["term_en"] == "Win Rate"
    assert body["term_tr"]
    assert body["term_de"]
    assert body["term_ar"]


def test_knowledge_term_search(client, db_session):
    _seed_knowledge(db_session)
    response = client.get("/api/v1/knowledge/terms?search=Churn")
    assert response.status_code == 200
    assert any(t["key"] == "churn_rate" for t in response.json())


def test_knowledge_term_not_found(client, db_session):
    _seed_knowledge(db_session)
    response = client.get("/api/v1/knowledge/terms/does-not-exist")
    assert response.status_code == 404
