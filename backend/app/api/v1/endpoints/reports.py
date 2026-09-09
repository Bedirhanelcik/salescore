import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.user import User
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/types")
def list_report_types():
    return {"types": report_service.REPORT_TYPES}


@router.get("/{report_type}")
def get_report(
    report_type: str,
    start_date: date | None = None,
    end_date: date | None = None,
    sort_by: str | None = None,
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = 1,
    page_size: int = 50,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if report_type not in report_service.REPORT_TYPES:
        raise NotFoundError("Report type", report_type)

    rows = report_service.get_report(db, current_user, report_type, start_date, end_date)

    if sort_by and rows and sort_by in rows[0]:
        rows = sorted(rows, key=lambda r: (r[sort_by] is None, r[sort_by]), reverse=(sort_dir == "desc"))

    if format == "csv":
        buffer = io.StringIO()
        if rows:
            writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}-report.csv"},
        )

    total = len(rows)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)
    start_idx = (page - 1) * page_size
    page_rows = rows[start_idx : start_idx + page_size]
    total_pages = (total + page_size - 1) // page_size if total else 0

    return {"items": page_rows, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}
