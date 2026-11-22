
from pathlib import Path
from uuid import uuid4
from fastapi import (APIRouter, Depends, File, Form, HTTPException, UploadFile, status)
from sqlalchemy.orm import Session

from app.database.database import get_db
from dependencies.middleware import get_current_user
from app.models.user import User
from app.schemas.store import StoreResponse, PublicStoreResponse
from app.services.store import ( register_store, get_my_store, get_pending_stores, approve_store, reject_store, get_public_stores)

router = APIRouter(prefix="/stores",tags=["Stores"])


BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_DIR / "uploads" / "business_licenses"
MAX_FILE_SIZE = 5 * 1024 * 1024 
ALLOWED_FILES = {
    ".pdf": ("application/pdf", b"%PDF-"),
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n")
}


def check_admin(current_user: User):
    for user_role in current_user.user_roles:
        if (user_role.role and user_role.role.role_name == "Admin"):
            return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn không có quyền thực hiện chức năng này"
    )

def save_business_license(file: UploadFile):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận file PDF, JPG, JPEG hoặc PNG"
        )
    return extension


@router.post("/register",response_model=StoreResponse,status_code=status.HTTP_201_CREATED)
async def register_store_api(
    store_name: str = Form(...),
    address: str = Form(...),
    contact: str = Form(...),
    city_id: int = Form(...),
    bank_account_number: str = Form(...),
    bank_name: str = Form(...),
    account_holder: str = Form(...),
    business_license: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    extension = save_business_license(business_license)
    content_type, file_signature = ALLOWED_FILES[extension]
    if business_license.content_type != content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng file không hợp lệ"
        )
    content = await business_license.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dung lượng file tối đa là 5MB"
        )
    if not content.startswith(file_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nội dung file không đúng định dạng"
        )
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / filename
    relative_path = Path("uploads") / "business_licenses" / filename

    try:
        file_path.write_bytes(content)
        store_data = {
            "store_name": store_name,
            "address": address,
            "contact": contact,
            "city_id": city_id,
            "bank_account_number": bank_account_number,
            "bank_name": bank_name,
            "account_holder": account_holder
        }
        store = register_store(
            db=db,
            owner_id=current_user.user_id,
            store_data=store_data,
            business_license=relative_path.as_posix()
        )
        return store
    except Exception:
        if file_path.exists():
            file_path.unlink()
        raise
    finally:
        await business_license.close()


@router.get("/my-store",response_model=StoreResponse)
def get_my_store_api(current_user: User = Depends(get_current_user),db: Session = Depends(get_db)):
    return get_my_store(db=db,owner_id=current_user.user_id)

@router.get("/pending",response_model=list[StoreResponse])
def get_pending_stores_api(current_user: User = Depends(get_current_user),db: Session = Depends(get_db)):
    check_admin(current_user)
    return get_pending_stores(db=db)

@router.patch("/{store_id}/approve",response_model=StoreResponse)
def approve_store_api(store_id: int,current_user: User = Depends(get_current_user),db: Session = Depends(get_db)):
    check_admin(current_user)
    return approve_store(db=db,store_id=store_id)

@router.patch("/{store_id}/reject",response_model=StoreResponse)
def reject_store_api(store_id: int,current_user: User = Depends(get_current_user),db: Session = Depends(get_db)):
    check_admin(current_user)
    return reject_store(db=db,store_id=store_id)

@router.get("/public",response_model=list[PublicStoreResponse])
def get_public_stores_api(db: Session = Depends(get_db)):
    return get_public_stores(db=db)
