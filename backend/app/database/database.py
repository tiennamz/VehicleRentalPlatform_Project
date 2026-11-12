from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declative_base

from app.core.config import PASSWORD, PORT, USERNAME, HOST, DB_NAME

DATABASE_URL = f"mysql+pymysql://{USERNAME}:{PASSWORD}@{HOST}:{PORT}/{DB_NAME}?ssl_verify_cert=true"

engine = create_engine(DATABASE_URL)

Base = declative_base()
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