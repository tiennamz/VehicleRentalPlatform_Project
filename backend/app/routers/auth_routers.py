from fastapi import APIRouter, Depends, Request, status
from app.services.auth_services import register_service
from slowapi import Limiter
from app.schemas.auth_schemas import RegisterSchema
from sqlalchemy.orm import Session  
from app.database.database import get_db
from app.utils.response import create_response, BaseResponse



router = APIRouter(prefix='/auth', tags=['Auth'])

@router.post('/register', status_code=status.HTTP_201_CREATED)
async def register(request: Request, new_user: RegisterSchema, db: Session = Depends(get_db)):
    user = register_service(new_user, db)

    return create_response(
        request,
        status.HTTP_201_CREATED,
        'Success',
        user
    )


@router.post('/login')
def login(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(firebase_bearer),
    db: Session = Depends(get_db)
):
    access_token = login_service(credentials.credentials, db)
    return create_response(
        request,
        status.HTTP_200_OK,
        'Success',
        {"access_token": access_token, "token_type": "bearer"}
    )