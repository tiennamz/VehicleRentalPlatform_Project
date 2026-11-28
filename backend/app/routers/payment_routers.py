from decimal import Decimal
from typing import Literal
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.services.payment_services import (
    process_payment_result,
    verify_payment_signature
)


router = APIRouter(prefix="/payments", tags=["Payments"])


class PaymentCallbackSchema(BaseModel):
    order_id: int
    transaction_code: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0)
    payment_method: Literal[
        "Tiền mặt",
        "Thẻ tín dụng",
        "Chuyển khoản ngân hàng"
    ]
    status: Literal["SUCCESS", "FAILED"]


@router.post("/callback")
def payment_callback(
    callback: PaymentCallbackSchema,
    signature: str = Header(..., alias="X-Payment-Signature"),
    db: Session = Depends(get_db)
):
    payload = callback.model_dump(mode="json")

    if not verify_payment_signature(payload, signature):
        raise HTTPException(
            status_code=401,
            detail="Chữ ký callback không hợp lệ"
        )

    return process_payment_result(
        db=db,
        order_id=callback.order_id,
        transaction_code=callback.transaction_code,
        amount=callback.amount,
        payment_method=callback.payment_method,
        success=callback.status == "SUCCESS"
    )
