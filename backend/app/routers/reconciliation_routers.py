"""
Router API cho chức năng tính hoa hồng 12% theo BR-09 và đối soát tuần cho từng cửa hàng (Task TF149EA).
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Body, Depends, Header, Query, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.reconciliation_schemas import WeeklyReconciliationGenerateSchema
from app.services.reconciliation_services import (
    generate_weekly_reconciliation,
    get_weekly_reconciliation_report,
)
from app.utils.response import create_response

router = APIRouter(tags=["Commission BR-09 & Weekly Reconciliation (TF149EA)"])


@router.get("/reconciliation/weekly", status_code=status.HTTP_200_OK)
def get_weekly_reconciliation_endpoint(
    request: Request,
    store_id: Optional[int] = Query(None, description="ID cửa hàng (bỏ trống để xem tất cả cửa hàng)"),
    owner_id: Optional[int] = Query(None, description="ID chủ cửa hàng"),
    week_start: Optional[date] = Query(None, description="Ngày bất kỳ trong tuần neo (mặc định tuần hiện tại)"),
    weeks: int = Query(4, ge=1, le=26, description="Số tuần cần tổng hợp (1–26)"),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Tổng hợp đối soát theo tuần cho từng cửa hàng áp dụng hoa hồng 12% BR-09 (không tính trên phí giao nhận)."""
    resolved_owner = owner_id if owner_id is not None else (x_user_id if store_id is None else None)
    data = get_weekly_reconciliation_report(
        db=db,
        store_id=store_id,
        owner_id=resolved_owner,
        week_start=week_start,
        weeks=weeks,
    )
    return create_response(request, status.HTTP_200_OK, "Tổng hợp đối soát tuần theo BR-09 thành công", data)


@router.post("/reconciliation/weekly/generate", status_code=status.HTTP_200_OK)
def generate_weekly_reconciliation_endpoint(
    request: Request,
    payload: Optional[WeeklyReconciliationGenerateSchema] = Body(default=None),
    db: Session = Depends(get_db),
):
    """Chốt và lưu bản ghi đối soát tuần (BR-09) vào DB cho 1 cửa hàng hoặc toàn bộ cửa hàng."""
    data = generate_weekly_reconciliation(
        db=db,
        store_id=payload.store_id if payload else None,
        week_start=payload.week_start if payload else None,
    )
    return create_response(request, status.HTTP_200_OK, "Chốt đối soát tuần theo BR-09 thành công", data)


@router.get("/stores/{store_id}/reconciliation/weekly", status_code=status.HTTP_200_OK)
def get_store_weekly_reconciliation_endpoint(
    request: Request,
    store_id: int,
    week_start: Optional[date] = Query(None, description="Ngày bất kỳ trong tuần neo"),
    weeks: int = Query(4, ge=1, le=26, description="Số tuần gần nhất cần xem"),
    db: Session = Depends(get_db),
):
    """Lấy báo cáo doanh thu, hoa hồng 12% BR-09 và đối soát tuần cho 1 cửa hàng cụ thể."""
    report = get_weekly_reconciliation_report(
        db=db,
        store_id=store_id,
        week_start=week_start,
        weeks=weeks,
    )
    store_item = report["stores"][0]
    store_item["rule_note"] = report["rule_note"]
    return create_response(request, status.HTTP_200_OK, "Lấy đối soát tuần cửa hàng thành công", store_item)
