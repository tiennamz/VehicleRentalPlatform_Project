import os
from pathlib import Path
from dotenv import load_dotenv

# Tìm file .env ở thư mục backend hoặc root
backend_env = Path(__file__).resolve().parent.parent.parent / '.env'
if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
else:
    load_dotenv()

DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = os.getenv('DB_PORT', '3306')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'vehicle_rental_platform_db')
