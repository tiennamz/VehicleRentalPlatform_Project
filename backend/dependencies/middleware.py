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

OPERATOR_ROLE_IDS = {RoleID.ADMIN, RoleID.STAFF}


def get_user_role_ids(user: User, token: Optional[str] = None) -> set[int]:
    """Lấy tập role_id của user từ DB (fallback sang JWT payload nếu user_roles trống)."""
    user_role_ids = {
        ur.role_id
        for ur in getattr(user, "user_roles", [])
        if getattr(ur, "role_id", None) is not None
    }

    if not user_role_ids and token:
        payload = decode_access_token(token)
        token_roles = payload.get("role_id") or payload.get("role") or []
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

    if not user_role_ids:
        user_role_ids.add(RoleID.CUSTOMER)

    return user_role_ids


def is_admin(user: User) -> bool:
    return RoleID.ADMIN in get_user_role_ids(user)


def is_operator(user: User) -> bool:
    return bool(get_user_role_ids(user).intersection(OPERATOR_ROLE_IDS))


def ensure_owner_or_roles(
    current_user: User,
    owner_user_id: int,
    allowed_role_ids: set[int],
    detail: str = "Bạn không có quyền truy cập hoặc chỉnh sửa tài nguyên của người dùng khác.",
) -> User:
    if current_user.user_id == owner_user_id:
        return current_user
    if get_user_role_ids(current_user).intersection(allowed_role_ids):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail,
    )


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
        user_role_ids = get_user_role_ids(user, token=token)

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
check_operator = require_roles(RoleID.ADMIN, RoleID.STAFF)
check_store_manager = require_roles(RoleID.ADMIN, RoleID.STORE_OWNER)
check_store_staff_or_admin = require_roles(RoleID.ADMIN, RoleID.STORE_OWNER, RoleID.STAFF)

