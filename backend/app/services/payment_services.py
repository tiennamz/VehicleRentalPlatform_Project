import hashlib
import hmac
import json
import os
from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.transaction import Transaction
from app.models.receipt import Receipt


PAYMENT_SECRET = os.getenv("PAYMENT_CALLBACK_SECRET", "")


def verify_payment_signature(payload: dict, signature: str) -> bool:
    if not PAYMENT_SECRET or not signature:
        return False

    raw_data = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False
    )

    expected = hmac.new(
        PAYMENT_SECRET.encode("utf-8"),
        raw_data.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


def process_payment_result(
    db: Session,
    order_id: int,
    transaction_code: str,
    amount: Decimal,
    payment_method: str,
    success: bool,
):
    try:
        order = (
            db.query(Order)
            .filter(Order.order_id == order_id)
            .with_for_update()
            .first()
        )

        if not order:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy đơn thuê"
            )

        transaction = (
            db.query(Transaction)
            .filter(Transaction.transaction_code == transaction_code)
            .with_for_update()
            .first()
        )

        if transaction:
            if transaction.order_id != order_id:
                raise HTTPException(
                    status_code=409,
                    detail="Mã giao dịch đã được sử dụng cho đơn khác"
                )

            if transaction.status == "SUCCESS":
                return {
                    "order_id": order.order_id,
                    "transaction_id": transaction.transaction_id,
                    "status": "SUCCESS",
                    "message": "Giao dịch đã được xử lý trước đó"
                }

            if transaction.status == "FAILED" and not success:
                return {
                    "order_id": order.order_id,
                    "transaction_id": transaction.transaction_id,
                    "status": "FAILED",
                    "message": "Giao dịch thất bại đã được ghi nhận"
                }

        if order.order_status != "Chờ thanh toán":
            raise HTTPException(
                status_code=409,
                detail="Đơn hàng không còn ở trạng thái chờ thanh toán"
            )

        expected_amount = Decimal(str(order.deposit_amount or 0))

        if amount != expected_amount:
            raise HTTPException(
                status_code=400,
                detail="Số tiền thanh toán không khớp tiền cọc"
            )

        now = datetime.utcnow()

        if transaction is None:
            transaction = Transaction(
                order_id=order.order_id,
                transaction_code=transaction_code,
                payment_method=payment_method,
                amount=amount,
                transaction_type="Thanh toán tiền cọc",
                status="SUCCESS" if success else "FAILED",
                paid_at=now if success else None
            )
            db.add(transaction)
            db.flush()
        else:
            transaction.status = "SUCCESS" if success else "FAILED"
            transaction.paid_at = now if success else None

        if success:
            order.order_status = "Chờ cửa hàng xác nhận"

            receipt = (
                db.query(Receipt)
                .filter(Receipt.order_id == order.order_id)
                .first()
            )

            if receipt is None:
                receipt = Receipt(
                    order_id=order.order_id,
                    transaction_id=transaction.transaction_id,
                    receipt_number=f"RC-{order.order_id}-{transaction.transaction_id}",
                    amount=amount,
                    payment_method=payment_method,
                    issued_at=now
                )
                db.add(receipt)

            db.commit()
            db.refresh(transaction)
            db.refresh(receipt)

            return {
                "order_id": order.order_id,
                "transaction_id": transaction.transaction_id,
                "receipt_id": receipt.receipt_id,
                "receipt_number": receipt.receipt_number,
                "amount": float(receipt.amount),
                "status": "SUCCESS",
                "message": "Thanh toán thành công, đã phát hành biên nhận"
            }

        db.commit()

        return {
            "order_id": order.order_id,
            "transaction_id": transaction.transaction_id,
            "status": "FAILED",
            "message": "Thanh toán thất bại, thời gian giữ chỗ được giữ nguyên"
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
