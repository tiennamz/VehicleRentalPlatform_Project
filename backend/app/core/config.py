import os
from pathlib import Path
from dotenv import load_dotenv

# Tìm file .env ở thư mục backend hoặc root
backend_env = Path(__file__).resolve().parent.parent.parent / '.env'
if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
else:
    load_dotenv()

DB_HOST = (os.getenv('DB_HOST') or '127.0.0.1').strip()
DB_PORT = (os.getenv('DB_PORT') or '3306').strip()
DB_USER = (os.getenv('DB_USER') or 'root').strip()
DB_PASSWORD = (os.getenv('DB_PASSWORD') or '').strip()
DB_NAME = (os.getenv('DB_NAME') or 'vehicle_rental_platform_db').strip()

SECRET_KEY = os.getenv('SECRET_KEY', 'replace_with_a_long_random_secret_at_least_32_chars')
ALGORITHMS = os.getenv('ALGORITHMS', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30')
REFRESH_TOKEN_EXPIRE_DAY = os.getenv('REFRESH_TOKEN_EXPIRE_DAY', '7')

API_KEY = (os.getenv('API_KEY') or '').strip()
AUTH_DOMAIN = (os.getenv('AUTH_DOMAIN') or '').strip()
PROJECT_ID = (os.getenv('PROJECT_ID') or '').strip()
STORAGE_BUCKET = (os.getenv('STORAGE_BUCKET') or '').strip()
MESSAGING_SENDER_ID = (os.getenv('MESSAGING_SENDER_ID') or '').strip()
APP_ID = (os.getenv('APP_ID') or '').strip()
MEASUREMENT_ID = (os.getenv('MEASUREMENT_ID') or '').strip()

CLOUDINARY_CLOUD_NAME = (os.getenv('CLOUDINARY_CLOUD_NAME') or '').strip()
CLOUDINARY_API_KEY = (os.getenv('CLOUDINARY_API_KEY') or '').strip()
CLOUDINARY_API_SECRET = (os.getenv('CLOUDINARY_API_SECRET') or '').strip()
