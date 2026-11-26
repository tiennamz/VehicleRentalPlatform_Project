from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY, ALGORITHMS, REFRESH_TOKEN_EXPIRE_DAY
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets
from fastapi import status, HTTPException
import jwt

try:
    import bcrypt  # type: ignore
except ImportError:
    bcrypt = None  # type: ignore

MAX_BCRYPT_PASSWORD_BYTES = 72
SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 64


def hash_password(plain_password: str) -> str:
    """Băm mật khẩu một chiều kèm salt ngẫu nhiên (bcrypt nếu có, fallback scrypt chuẩn NIST)."""
    if not isinstance(plain_password, str) or not plain_password.strip():
        raise ValueError("Mật khẩu không được để trống.")
    encoded = plain_password.encode("utf-8")
    if len(encoded) > MAX_BCRYPT_PASSWORD_BYTES:
        raise ValueError("Mật khẩu vượt quá giới hạn 72 bytes.")
    if bcrypt is not None:
        return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")
    salt = secrets.token_hex(16)
    dk = hashlib.scrypt(
        encoded,
        salt=bytes.fromhex(salt),
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    ).hex()
    return f"$scrypt$n={SCRYPT_N}$r={SCRYPT_R}$p={SCRYPT_P}${salt}${dk}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra mật khẩu người dùng nhập vào so với chuỗi băm (hằng thời gian)."""
    if not isinstance(plain_password, str) or not isinstance(hashed_password, str):
        return False
    if not plain_password or not hashed_password:
        return False
    encoded_plain = plain_password.encode("utf-8")
    if len(encoded_plain) > MAX_BCRYPT_PASSWORD_BYTES:
        return False

    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        if bcrypt is None:
            return False
        try:
            return bcrypt.checkpw(encoded_plain, hashed_password.encode("utf-8"))
        except ValueError:
            return False

    if hashed_password.startswith("$scrypt$"):
        try:
            parts = hashed_password.split("$")
            # ['', 'scrypt', 'n=...', 'r=...', 'p=...', '<salt_hex>', '<dk_hex>']
            if len(parts) != 7:
                return False
            n_val = int(parts[2].split("=", 1)[1])
            r_val = int(parts[3].split("=", 1)[1])
            p_val = int(parts[4].split("=", 1)[1])
            salt_bytes = bytes.fromhex(parts[5])
            expected_dk = bytes.fromhex(parts[6])
            actual_dk = hashlib.scrypt(
                encoded_plain,
                salt=salt_bytes,
                n=n_val,
                r=r_val,
                p=p_val,
                dklen=len(expected_dk),
            )
            return hmac.compare_digest(actual_dk, expected_dk)
        except Exception:
            return False

    return False


def create_access_token(data: dict):
    payload = data.copy()
    
    expire_time = datetime.now(timezone.utc) + timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTES))
    
    payload.update({
        'exp': expire_time
    })
    
    token = jwt.encode(payload, SECRET_KEY, ALGORITHMS)
    
    return token

def create_refresh_token(data: dict):
    payload = data.copy()
    
    expire_time = datetime.now(timezone.utc) + timedelta(days=int(REFRESH_TOKEN_EXPIRE_DAY))
    
    payload.update({
        'exp': expire_time
    })
    
    token = jwt.encode(payload, SECRET_KEY, ALGORITHMS)
    
    return token

def decode_access_token(token: str):
    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            ALGORITHMS
        )
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token Expired'
        )
    
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid Token'
        )
    