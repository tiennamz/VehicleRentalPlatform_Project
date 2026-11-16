import os 
from dotenv import load_dotenv

load_dotenv()

DB_PORT = os.getenv('DB_PORT')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_USER = os.getenv('DB_USER')
DB_HOST = os.getenv('DB_HOST')
DB_NAME = os.getenv('DB_NAME')
SECRET_KEY = os.getenv('SECRET_KEY')
ALGORITHMS = os.getenv('ALGORITHMS')
ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES')
REFRESH_TOKEN_EXPIRE_DAY = os.getenv('REFRESH_TOKEN_EXPIRE_DAY', '7')
FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID')

