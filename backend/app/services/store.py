
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.store import Store

def register_store(db: Session, owner_id: int, store_data: dict, business_license: str):
    existing_store = db.query(Store).filter(Store.owner_id == owner_id).first()
    if existing_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đã đăng ký cửa hàng rồi"
        )
    store = Store(
        owner_id=owner_id,
        store_name=store_data["store_name"],
        address=store_data["address"],
        contact=store_data["contact"],
        city_id=store_data["city_id"],
        business_license=business_license,
        bank_account_number=store_data["bank_account_number"],
        bank_name=store_data["bank_name"],
        account_holder=store_data["account_holder"],
        status="Đang chờ duyệt"
    )
    db.add(store)
    db.commit()
    db.refresh(store)
    return store

def get_my_store(db: Session, owner_id: int):
    store = db.query(Store).filter(Store.owner_id == owner_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa đăng ký cửa hàng"
        )
    return store

def get_pending_stores(db: Session):
    return db.query(Store).filter(Store.status == "Đang chờ duyệt").all()

def approve_store(db: Session, store_id: int):
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cửa hàng"
        )
    if store.status != "Đang chờ duyệt":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cửa hàng không ở trạng thái chờ duyệt"
        )
    store.status = "Đã duyệt"
    db.commit()
    db.refresh(store)
    return store

def reject_store(db: Session, store_id: int):
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cửa hàng"
        )
    if store.status != "Đang chờ duyệt":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cửa hàng không ở trạng thái chờ duyệt"
        )
    store.status = "Bị từ chối"
    db.commit()
    db.refresh(store)
    return store

def get_public_stores(db: Session):
    return db.query(Store).filter(Store.status == "Đã duyệt").all()
