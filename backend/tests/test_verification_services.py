import pytest
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.database import Base
from app.models.user import User
from app.models.drivers_license import DriverLicense
from app.models.verifiable_information import VerifiableInformation
from app.models.personal_data_access_log import PersonalDataAccessLog
from app.schemas.verification_schemas import ReviewKYCRequestSchema, ReviewActionEnum
from app.services.verification_services import (
    get_customer_kyc_details,
    review_driver_license,
    review_id_card,
)

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    admin = User(user_id=1, fullname="Admin User", email="admin@example.com")
    customer = User(user_id=2, fullname="Customer User", email="customer@example.com", phone_number="0912345678")
    session.add_all([admin, customer])
    session.commit()

    license = DriverLicense(
        drivers_license_id=10,
        user_id=2,
        license_number="GPLX-12345",
        license_class="A1",
        issue_date=datetime.now(timezone.utc).replace(tzinfo=None),
        verification_status="Đang chờ"
    )
    id_card = VerifiableInformation(
        information_id=2,
        img_id_card_before="https://img.com/front.jpg",
        img_id_card_after="https://img.com/back.jpg",
        status="Đang chờ"
    )
    session.add_all([license, id_card])
    session.commit()

    yield session
    session.close()

def test_get_customer_kyc_details_records_view_log(db_session):
    details = get_customer_kyc_details(
        db=db_session,
        customer_user_id=2,
        staff_user_id=1,
        ip_address="127.0.0.1",
        user_agent="TestBrowser/1.0"
    )

    assert details["user_id"] == 2
    assert details["driver_license"]["license_number"] == "GPLX-12345"
    assert details["id_card"]["img_id_card_before"] == "https://img.com/front.jpg"

    # Check that a VIEW log was automatically generated
    logs = db_session.query(PersonalDataAccessLog).filter_by(target_user_id=2, action="VIEW").all()
    assert len(logs) == 1
    assert logs[0].accessor_id == 1
    assert logs[0].data_type == "KYC_PROFILE"

def test_get_customer_kyc_nonexistent_user_raises_404(db_session):
    with pytest.raises(HTTPException) as exc_info:
        get_customer_kyc_details(db_session, customer_user_id=999, staff_user_id=1)
    assert exc_info.value.status_code == 404

    # No log created
    logs = db_session.query(PersonalDataAccessLog).filter_by(target_user_id=999).all()
    assert len(logs) == 0

def test_review_driver_license_approve(db_session):
    req = ReviewKYCRequestSchema(action=ReviewActionEnum.APPROVE)
    res = review_driver_license(
        db=db_session,
        license_id=10,
        staff_user_id=1,
        review_data=req,
        ip_address="127.0.0.1",
        user_agent="TestBrowser/1.0"
    )

    assert res.verification_status == "Đã xác thực"
    assert res.verified_by == 1
    assert res.verified_at is not None
    assert res.rejected_reason is None

    # Check APPROVE log
    log = db_session.query(PersonalDataAccessLog).filter_by(
        target_user_id=2, data_type="DRIVERS_LICENSE", action="APPROVE"
    ).first()
    assert log is not None
    assert log.accessor_id == 1

def test_review_driver_license_reject(db_session):
    req = ReviewKYCRequestSchema(action=ReviewActionEnum.REJECT, rejected_reason="Ảnh GPLX bị cắt góc")
    res = review_driver_license(
        db=db_session,
        license_id=10,
        staff_user_id=1,
        review_data=req,
        ip_address="127.0.0.1",
        user_agent="TestBrowser/1.0"
    )

    assert res.verification_status == "Bị từ chối"
    assert res.rejected_reason == "Ảnh GPLX bị cắt góc"
    assert res.verified_by == 1

    # Check REJECT log
    log = db_session.query(PersonalDataAccessLog).filter_by(
        target_user_id=2, data_type="DRIVERS_LICENSE", action="REJECT"
    ).first()
    assert log is not None
    assert log.reason == "Ảnh GPLX bị cắt góc"

def test_review_id_card_reject(db_session):
    req = ReviewKYCRequestSchema(action=ReviewActionEnum.REJECT, rejected_reason="Ảnh CCCD mờ không đọc được số")
    res = review_id_card(
        db=db_session,
        info_id=2,
        staff_user_id=1,
        review_data=req,
        ip_address="127.0.0.1",
        user_agent="TestBrowser/1.0"
    )

    assert res.status == "Bị từ chối"
    assert res.rejected_reason == "Ảnh CCCD mờ không đọc được số"
    assert res.verified_by == 1

    # Check REJECT log
    log = db_session.query(PersonalDataAccessLog).filter_by(
        target_user_id=2, data_type="CCCD", action="REJECT"
    ).first()
    assert log is not None
    assert log.reason == "Ảnh CCCD mờ không đọc được số"

