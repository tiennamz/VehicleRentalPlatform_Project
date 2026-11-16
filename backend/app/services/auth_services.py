from sqlalchemy.orm import Session
from app.schemas.auth_schemas import RegisterSchema
from fastapi import HTTPException, status
from firebase_admin import auth, get_app, initialize_app
from app.core.config import FIREBASE_PROJECT_ID
from app.core.security import create_access_token
from app.models.user import User

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


def login_service(firebase_id_token: str, db: Session):
    if not FIREBASE_PROJECT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Firebase project ID is not configured'
        )

    try:
        firebase_app = get_app()
    except ValueError:
        firebase_app = initialize_app(options={"projectId": FIREBASE_PROJECT_ID})

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

    roles = sorted({
        user_role.role.role_name
        for user_role in user.user_roles
        if user_role.role is not None and user_role.role.role_name
    })
    if not roles:
        roles = ["Khách hàng"]

    return create_access_token({
        "sub": user.email,
        "name": user.fullname,
        "email": user.email,
        "role": roles
    })