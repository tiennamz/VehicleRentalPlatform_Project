from fastapi import FastAPI, Depends, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.database.database import Base, engine, get_db, SessionLocal
from app.routers.auth_routers import router as auth_routers
from app.routers.user_routers import router as user_routers
from app.routers.verification_routers import router as verification_routers
from app.routers.audit_routers import router as audit_routers
from app.routers.booking_eligibility_routers import router as booking_eligibility_routers
from app.routers.delivery_routers import router as delivery_routers
from app.routers.payment_routers import router as payment_router
from sqlalchemy.orm import Session
from app.utils.response import handle_exception, create_response
from sqlalchemy import text
from app.core.config import API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID
from app.routers.store import router as store_router
from app.routers.vehicle import router as vehicle_router
from app.routers.store_order_confirmation_routers import router as store_order_confirmation_routers
from app.routers.order_cancellation_history_routers import router as order_cancellation_history_routers
from app.routers.handover_confirmation_routers import router as handover_confirmation_routers
from app.routers.reconciliation_routers import router as reconciliation_routers
from app.routers.favorite_vehicle_routers import router as favorite_vehicle_router
from app.routers.system_config_routers import router as system_config_routers
from app.routers.city_analytics_routers import router as city_analytics_routers
from app.services.order_expiration_services import auto_cancel_expired_orders
import time

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
import threading
handle_exception(app)


def _warm_db_pool():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        pass

def _auto_cancel_expired_orders():
    while True:
        db = SessionLocal()
        try:
            cancelled_count = auto_cancel_expired_orders(db)
            if cancelled_count > 0:
                print(
                    f"[ORDER EXPIRATION] Đã tự động hủy "
                    f"{cancelled_count} đơn quá hạn."
                )
        except Exception as e:
            print(f"[ORDER EXPIRATION] Lỗi: {e}")
        finally:
            db.close()
        time.sleep(30)

@app.on_event("startup")
def warm_up_database_pool():
    threading.Thread(target=_warm_db_pool, daemon=True).start()
    threading.Thread(
        target=_auto_cancel_expired_orders,
        daemon=True
    ).start()


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


@app.get('/firebase')
def get_firebase_config():
    api_key = API_KEY
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Not found Firebase'config"
        )
    return {
        "apiKey": API_KEY,
        "authDomain": AUTH_DOMAIN,
        "projectId": PROJECT_ID,
        "storageBucket": STORAGE_BUCKET,
        "messagingSenderId": MESSAGING_SENDER_ID,
        "appId": APP_ID,
        "measurementId": MEASUREMENT_ID
    }

app.include_router(auth_routers)
app.include_router(user_routers)
app.include_router(verification_routers)
app.include_router(audit_routers)
app.include_router(order_cancellation_history_routers)
app.include_router(handover_confirmation_routers)
app.include_router(reconciliation_routers)
app.include_router(booking_eligibility_routers)
app.include_router(delivery_routers)
app.include_router(store_router)
app.include_router(vehicle_router)
app.include_router(store_order_confirmation_routers)
app.include_router(favorite_vehicle_router)
app.include_router(system_config_routers)
app.include_router(city_analytics_routers)
app.include_router(payment_router)