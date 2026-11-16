from sqlalchemy.orm import Session
from app.schemas.auth_schemas import RegisterSchema
from app.models.user import User
from fastapi import HTTPException, status

def register_service(new_user: RegisterSchema, db: Session):

    existed_user = db.query(User).filter(new_user.email.lower() == User.email).first()
        
    if existed_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
            )

    user = User(
        fullname = new_user.fullname.title(),
        email = new_user.email.strip().lower()
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

        return user
    except:
        db.rollback()
