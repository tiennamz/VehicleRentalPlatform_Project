from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterSchema(BaseModel):
    fullname: str
    email: EmailStr