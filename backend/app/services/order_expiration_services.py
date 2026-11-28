from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.order import Order
from app.models.transaction import Transaction

def get_current_utc_time():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def auto_cancel_expired_orders(db: Session) -> int:
    now = get_current_utc_time()
    try:
        expired_orders = (
            db.query(Order)
            .filter(
                Order.order_status == "Chờ thanh toán",
                Order.confirmation_deadline.isnot(None),
                Order.confirmation_deadline <= now,
                ~Order.transactions.any(
                    Transaction.paid_at.isnot(None)
                ),
            )
            .with_for_update()
            .all()
        )
        cancelled_count = 0
        for order in expired_orders:
            order.order_status = "Đã hủy"
            order.cancelled_at = now
            order.cancel_reason = "Hết thời gian giữ chỗ nhưng chưa thanh toán"
            cancelled_count += 1
        if cancelled_count > 0:
            db.commit()
        return cancelled_count
    except Exception:
        db.rollback()
        raise