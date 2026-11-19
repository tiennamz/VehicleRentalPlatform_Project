from typing import Optional
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi import Depends, Request, status, HTTPException
from app.models.user import User
from app.database.database import get_db
from sqlalchemy.orm import Session
from app.core.security import decode_access_token


security = HTTPBearer(auto_error=False)

def _get_token(request: Request, cred: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    if cred and cred.credentials:
        return cred.credentials
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated"
    )

def get_current_user(
    token: str = Depends(_get_token),
    db: Session = Depends(get_db)
):
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

class RoleID:
    ADMIN = 1           # Quản trị viên hệ thống
    CUSTOMER = 2        # Khách hàng (Người thuê xe)
    STAFF = 3           # Nhân viên cửa hàng
    STORE_OWNER = 4     # Chủ cửa hàng (Người quản lý cửa hàng)


ROLE_NAMES = {
    RoleID.ADMIN: "Admin",
    RoleID.CUSTOMER: "Khách hàng",
    RoleID.STAFF: "Nhân viên",
    RoleID.STORE_OWNER: "Chủ cửa hàng",
}


def require_roles(*allowed_role_ids: int):
    """
    Dependency factory phân quyền theo role_id:
    - 1: Admin
    - 2: Khách hàng
    - 3: Nhân viên
    - 4: Chủ cửa hàng
    """
    def role_checker(
        user: User = Depends(get_current_user),
        token: str = Depends(_get_token)
    ) -> User:
        # Lấy danh sách role_id trực tiếp từ bảng user_roles của user
        user_role_ids = {ur.role_id for ur in user.user_roles if getattr(ur, "role_id", None) is not None}

        # Nếu DB chưa có dòng user_role, lấy từ token payload
        if not user_role_ids:
            payload = decode_access_token(token)
            token_roles = payload.get('role_id') or payload.get('role') or []
            if isinstance(token_roles, (int, str)):
                try:
                    user_role_ids.add(int(token_roles))
                except (ValueError, TypeError):
                    pass
            elif isinstance(token_roles, list):
                for r in token_roles:
                    try:
                        user_role_ids.add(int(r))
                    except (ValueError, TypeError):
                        pass

        # Mặc định nếu vẫn rỗng thì là Khách hàng (role_id = 2)
        if not user_role_ids:
            user_role_ids.add(RoleID.CUSTOMER)

        # Kiểm tra xem user có ít nhất một role hợp lệ không
        if not user_role_ids.intersection(allowed_role_ids):
            role_labels = [ROLE_NAMES.get(rid, str(rid)) for rid in allowed_role_ids]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required role: {', '.join(role_labels)}"
            )

        return user

    return role_checker


# Các dependency phân quyền theo từng vai trò
check_admin = require_roles(RoleID.ADMIN)
check_customer = require_roles(RoleID.CUSTOMER)
check_staff = require_roles(RoleID.STAFF)
check_store_owner = require_roles(RoleID.STORE_OWNER)

# Các dependency phân quyền theo nhóm tiện ích
check_store_manager = require_roles(RoleID.ADMIN, RoleID.STORE_OWNER)
check_store_staff_or_admin = require_roles(RoleID.ADMIN, RoleID.STORE_OWNER, RoleID.STAFF)

