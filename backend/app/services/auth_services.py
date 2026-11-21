from datetime import datetime
from sqlalchemy.orm import Session
from app.schemas.auth_schemas import RegisterSchema
from fastapi import HTTPException, status
from firebase_admin import auth, get_app, initialize_app
from app.core.config import PROJECT_ID
from app.core.security import create_access_token
from app.models.user import User
from app.models.user_role import UserRole

def register_service(new_user: RegisterSchema, db: Session):

    existed_user = db.query(User).filter(new_user.email.lower() == User.email).first()
        
    if existed_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
            )

    user = User(
        fullname = new_user.fullname.title(),
        email = new_user.email.strip().lower(),
        status = "Hoạt động",
        created_at = datetime.now()
    )

    try:
        db.add(user)
        db.flush()

        user_role = UserRole(
            user_id=user.user_id,
            role_id=2,
            assigned_at=datetime.now()
        )
        db.add(user_role)

        db.commit()
        db.refresh(user)

        return user
    except:
        db.rollback()
        raise


def login_service(firebase_id_token: str, db: Session):
    if not PROJECT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Firebase project ID is not configured'
        )

    try:
        firebase_app = get_app()
    except ValueError:
        firebase_app = initialize_app(options={"projectId": PROJECT_ID})

    try:
        firebase_claims = auth.verify_id_token(
            firebase_id_token,
            app=firebase_app,
            check_revoked=True
        )
    except (auth.InvalidIdTokenError, auth.UserDisabledError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid Firebase ID token'
        ) from exc

    email = firebase_claims.get("email")
    if not isinstance(email, str) or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Firebase account does not have an email'
        )
    if not firebase_claims.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Verify your email address before login'
        )

    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    role_ids = sorted({
        user_role.role_id
        for user_role in user.user_roles
        if getattr(user_role, "role_id", None) is not None
    })
    if not role_ids:
        name_to_id = {
            "Admin": 1,
            "Khách hàng": 2,
            "Nhân viên": 3,
            "Chủ cửa hàng": 4
        }
        fallback_ids = []
        for user_role in getattr(user, "user_roles", []):
            role_obj = getattr(user_role, "role", None)
            if role_obj is not None:
                if getattr(role_obj, "role_id", None) is not None:
                    fallback_ids.append(role_obj.role_id)
                elif getattr(role_obj, "role_name", None) in name_to_id:
                    fallback_ids.append(name_to_id[role_obj.role_name])
        role_ids = sorted(set(fallback_ids))

    if not role_ids:
        role_ids = [2]  
        
    return create_access_token({
        "sub": user.email,
        "name": user.fullname,
        "email": user.email,
        "user_id": getattr(user, "user_id", None),
        "role_id": role_ids,
        "role": role_ids
    })
