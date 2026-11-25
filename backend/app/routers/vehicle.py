
from fastapi import (APIRouter, Depends, HTTPException, status, File, Form, UploadFile)
from pathlib import Path
from uuid import uuid4
from datetime import datetime
from sqlalchemy.orm import Session
from app.database.database import get_db
from dependencies.middleware import get_current_user, check_store_owner
from app.models.user import User
from app.models.image import Image
from app.schemas.vehicle import ( VehicleCreate, VehicleUpdate,VehicleResponse)
from app.services.vehicle import ( create_vehicle, update_vehicle, delete_vehicle, get_vehicles, pause_vehicle_service)
from app.utils.cloudinary_helper import upload_vehicle_image_to_cloudinary, delete_cloudinary_image_by_public_id

router = APIRouter(prefix="/vehicles",tags=["Vehicles"])

MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_FILES = {
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n")
}

async def validate_vehicle_images(files):
    if len(files) < 4:
        raise HTTPException(
            status_code=400,
            detail="Mỗi xe phải có ít nhất 4 ảnh"
        )
    validated_files = []
    for file in files:
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="Tên file không hợp lệ"
            )
        extension = Path(file.filename).suffix.lower()
        if extension not in ALLOWED_FILES:
            raise HTTPException(
                status_code=400,
                detail="Chỉ chấp nhận ảnh JPG, JPEG và PNG"
            )
        expected_mime, signature = ALLOWED_FILES[extension]
        if file.content_type != expected_mime:
            raise HTTPException(
                status_code=400,
                detail="Định dạng ảnh không hợp lệ"
            )
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=400,
                detail="Ảnh không được để trống"
            )
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Mỗi ảnh không được vượt quá 5MB"
            )
        if not content.startswith(signature):
            raise HTTPException(
                status_code=400,
                detail="Nội dung file không phải ảnh hợp lệ"
            )
        validated_files.append((content, extension))
    return validated_files

@router.post("",response_model=VehicleResponse,status_code=status.HTTP_201_CREATED)
async def create_vehicle_api(
    brand: str = Form(...),
    model: str = Form(...),
    license_plate: str = Form(...),
    manufacture_year: int = Form(...),
    type: str = Form(...),
    engine_capacity: int = Form(...),
    description: str = Form(None),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    validated_files = await validate_vehicle_images(files)
    data = VehicleCreate(
        brand=brand,
        model=model,
        license_plate=license_plate,
        manufacture_year=manufacture_year,
        type=type,
        engine_capacity=engine_capacity,
        description=description
    )
    uploaded_public_ids = []
    try:
        vehicle = create_vehicle(
            db=db,
            user_id=current_user.user_id,
            data=data
        )
        for content, extension in validated_files:
            filename = f"{uuid4().hex}{extension}"
            upload = upload_vehicle_image_to_cloudinary(
                content=content,
                filename=filename,
                content_type=ALLOWED_FILES[extension][0],
                store_id=vehicle.store_id,
            )
            uploaded_public_ids.append(upload["public_id"])
            image = Image(
                vehicle_id=vehicle.vehicle_id,
                img_url=upload["secure_url"],
                img_type="vehicle",
                upload_at=datetime.now()
            )
            db.add(image)
        db.commit()
        db.refresh(vehicle)
        return vehicle
    except HTTPException:
        db.rollback()
        for public_id in uploaded_public_ids:
            delete_cloudinary_image_by_public_id(public_id, delivery_type="upload")
        raise
    except Exception as exc:
        db.rollback()
        for public_id in uploaded_public_ids:
            delete_cloudinary_image_by_public_id(public_id, delivery_type="upload")
        raise HTTPException(
            status_code=500,
            detail="Không thể tạo xe hoặc lưu ảnh"
        ) from exc

@router.get("",response_model=list[VehicleResponse])
def get_vehicles_api(db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return get_vehicles(db=db,user_id=current_user.user_id)

@router.put("/{vehicle_id}",response_model=VehicleResponse)
def update_vehicle_api(vehicle_id: int,data: VehicleUpdate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return update_vehicle(db=db,user_id=current_user.user_id,vehicle_id=vehicle_id,data=data)

@router.delete("/{vehicle_id}")
def delete_vehicle_api(vehicle_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return delete_vehicle(db=db,user_id=current_user.user_id,vehicle_id=vehicle_id)

@router.patch("/{vehicle_id}/pause")
def pause_vehicle(vehicle_id: int, db: Session =  Depends(get_db), user: User =  Depends(check_store_owner)):
    return pause_vehicle_service(vehicle_id, db)