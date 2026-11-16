from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterSchema(BaseModel):
    fullname: str
    email: EmailStr

class LoginSchema(BaseModel):
    email: EmailStr
    password: str