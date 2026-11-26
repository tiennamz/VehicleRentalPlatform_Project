"""
Router API thống kê số đơn, tổng giá trị giao dịch, tỷ lệ hủy và tỷ lệ khiếu nại theo thành phố (Task TF14D02).
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.services.city_analytics_services import get_city_analytics_report
from app.utils.response import create_response
from dependencies.middleware import check_operator

router = APIRouter(prefix="/admin/analytics", tags=["Admin City Analytics (TF14D02)"])


@router.get("/cities", status_code=status.HTTP_200_OK)
def get_city_analytics_endpoint(
    request: Request,
    from_date: Optional[date] = Query(None, description="Ngày bắt đầu lọc (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="Ngày kết thúc lọc (YYYY-MM-DD)"),
    city_id: Optional[int] = Query(None, description="Lọc theo ID thành phố cụ thể"),
    current_user: User = Depends(check_operator),
    db: Session = Depends(get_db),
):
    """
    Thống kê số đơn, tổng giá trị giao dịch (GMV), tỷ lệ hủy và tỷ lệ khiếu nại theo từng thành phố
    và tổng quan toàn hệ thống (dành cho Admin & Nhân viên vận hành).
    """
    data = get_city_analytics_report(
        db=db,
        from_date=from_date,
        to_date=to_date,
        city_id=city_id,
    )
    return create_response(
        request,
        status.HTTP_200_OK,
        "Lấy báo cáo thống kê theo thành phố thành công",
        data,
    )
