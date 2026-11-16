from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi import Depends, status, HTTPException
from app.models.user import User
from app.database.database import get_db
from sqlalchemy.orm import Session
from app.core.security import decode_access_token


security = HTTPBearer()

def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = cred.credentials
    payload = decode_access_token(token)
    email = payload.get('email') or payload.get('sub')
    if not isinstance(email, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid Token'
        )

    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='User not found'
        )
        
    return user

def check_admin(
    user: User = Depends(get_current_user),
    cred: HTTPAuthorizationCredentials = Depends(security)
):
    payload = decode_access_token(cred.credentials)
    roles = payload.get('role', [])
    if isinstance(roles, str):
        roles = [roles]
    if not isinstance(roles, list):
        roles = []

    if 'Admin' not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only allow admin'
        )    
    return user

