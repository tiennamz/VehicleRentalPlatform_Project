from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import DB_PASSWORD, DB_PORT, DB_USER, DB_HOST, DB_NAME

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?ssl_verify_cert=true"

engine = create_engine(
    DATABASE_URL,
    # 1. BẮT BUỘC: Kiểm tra kết nối còn sống không trước khi thực thi query.
    # Nếu TiDB đã ngắt, SQLAlchemy sẽ tự hủy kết nối cũ và tạo kết nối mới.
    pool_pre_ping=True,
    
    # 2. Làm mới kết nối định kỳ mỗi 4 phút (240s) trước khi TiDB kịp ngắt
    pool_recycle=240,
    
    # 3. Giới hạn số lượng kết nối mở cùng lúc (phù hợp gói Serverless)
    pool_size=5,
    max_overflow=10,
    
    # 4. Tăng thời gian chờ kết nối lên 15s (phòng lúc TiDB Serverless đang "thức dậy")
    connect_args={
        "connect_timeout": 15,
        # Giữ nguyên cấu hình SSL của bạn nếu có, ví dụ:
        # "ssl": {"ca": "đường_dẫn_file_ca.pem"} 
    }
)

Base = declarative_base()
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()