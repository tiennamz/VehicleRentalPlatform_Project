from fastapi import FastAPI, Depends, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.database.database import Base, engine, get_db
from app.routers.auth_routers import router as auth_routers
from app.routers.verification_routers import router as verification_routers
from app.routers.audit_routers import router as audit_routers
from sqlalchemy.orm import Session
from app.utils.response import handle_exception, create_response
from sqlalchemy import text

app = FastAPI(
    title='Vehicle Rental Platfrom',
    version='1.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
handle_exception(app)
if os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true":
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Could not connect to database on startup: {e}")



@app.get('/health/check', tags=['Check system'])
def check_system(request: Request, db: Session = Depends(get_db)):
    try: 
        db.execute(text('SELECT 1'))
        return create_response(
            request,
            status.HTTP_200_OK,
            'Success'
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Can't connect to server: {str(e)}"
        )

app.include_router(auth_routers)
app.include_router(verification_routers)
app.include_router(audit_routers)