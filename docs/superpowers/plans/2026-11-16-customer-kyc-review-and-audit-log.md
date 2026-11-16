# Kế Hoạch Triển Khai: Kiểm Duyệt KYC Khách Hàng & Nhật Ký Truy Cập Dữ Liệu Cá Nhân

> **Dành cho agent thực thi:** KỸ NĂNG BẮT BUỘC: Sử dụng `superpowers:subagent-driven-development` (khuyên dùng) hoặc `superpowers:executing-plans` để triển khai kế hoạch này theo từng task. Các bước sử dụng cú pháp checkbox (`- [ ]`) để theo dõi tiến độ.

**Mục tiêu:** Xây dựng tính năng kiểm duyệt hồ sơ khách hàng (KYC cho Giấy phép lái xe và Căn cước công dân/CCCD) với lý do duyệt/từ chối, tự động ghi nhật ký truy cập dữ liệu cá nhân, và áp dụng chính sách lưu trữ nhật ký tối thiểu 12 tháng cho nền tảng thuê xe 1 cửa hàng.

**Kiến trúc:** Kiến trúc phân tầng (`Routers` -> `Services` -> `SQLAlchemy Models` -> `MySQL/TiDB`) sử dụng bộ chuẩn hóa phản hồi API chung của dự án (`app.utils.response.create_response`). Các thao tác kiểm duyệt cập nhật trạng thái tài liệu và tự động ghi nhật ký đồng thời vào bảng `personal_data_access_logs`. Dịch vụ nhật ký áp dụng cơ chế append-only với quy tắc nghiêm ngặt ngăn chặn mọi hành vi xóa dữ liệu dưới 12 tháng (365 ngày).

**Công nghệ sử dụng:** FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic, Pytest, Python 3.10+.

**Tài liệu tham chiếu:** Đặc tả nghiệp vụ kiểm duyệt hồ sơ khách hàng (Duyệt/Từ chối kèm lý do) & Nhật ký truy cập dữ liệu cá nhân lưu trữ tối thiểu 12 tháng (Phạm vi 1 cửa hàng duy nhất).

## Ràng Buộc Chung (Global Constraints)

- Phạm vi hệ thống là 1 cửa hàng duy nhất; không cần quản lý và xét duyệt đa chi nhánh.
- Toàn bộ endpoint trả về kết quả theo cấu trúc chuẩn `BaseResponse` qua hàm `app.utils.response.create_response`.
- Khi hành động là `REJECT` (Từ chối), bắt buộc phải có `rejected_reason` (không được để trống hoặc chỉ chứa khoảng trắng).
- Nhật ký truy cập dữ liệu cá nhân tuyệt đối không được xóa nếu thời gian lưu trữ chưa đủ 365 ngày (12 tháng).
- Quy tắc đặt tên: Python/SQL sử dụng `snake_case`.

## Trọng Tâm Kiểm Thử (Review Focus)

1. **Lý do từ chối để trống:** Gửi yêu cầu từ chối (`action = "REJECT"`) với `rejected_reason` rỗng hoặc chỉ có khoảng trắng phải trả về lỗi kiểm thực 422 / 400 Bad Request.
2. **Xem hồ sơ người dùng không tồn tại:** Yêu cầu xem KYC của `user_id` không tồn tại phải trả về 404 Not Found và không sinh ra bản ghi log mồ côi.
3. **Vi phạm chính sách lưu trữ nhật ký:** Thao tác dọn dẹp/xóa nhật ký có thời gian dưới 12 tháng phải bị từ chối với mã lỗi 403 Forbidden kèm thông báo vi phạm chính sách lưu trữ.
4. **Chuyển đổi trạng thái hợp lệ:** Duyệt hoặc từ chối lại một hồ sơ đã xử lý trước đó sẽ cập nhật trạng thái mới, ghi nhận `verified_at`, `verified_by` và ghi log sự kiện mới mà không gây xung đột dữ liệu.
5. **Độ ổn định khi ghi nhận log:** Trường hợp không lấy được IP hoặc chuỗi User-Agent quá dài, hệ thống phải tự động cắt ngắn (tối đa 255 ký tự) và ghi nhận an toàn, không làm gián đoạn giao dịch duyệt hồ sơ chính.

---

### Task 1: Đồng Bộ Mã Nguồn Local Với Nhánh Remote

**Tệp tin:**
- Cập nhật: Thư mục làm việc đồng bộ với `origin/developers`

**Giao diện liên kết:**
- Tiếp nhận: 7 commit mới trên `origin/developers` (chứa `backend/app/main.py`, `database.py`, `utils/response.py`, `auth_routers.py`).
- Cung cấp: Bộ khung hoàn chỉnh cho FastAPI và kết nối CSDL SessionLocal.

- [ ] **Bước 1: Kiểm tra git status và kéo code mới từ origin/developers**
Chạy: `git pull --ff-only origin developers`
Kết quả mong đợi: Fast-forward thành công, cập nhật 12 tệp tin.

- [ ] **Bước 2: Kiểm tra import database và app core không bị lỗi cú pháp**
Chạy: `python -c "from app.main import app; from app.database.database import Base, engine; print('Base loaded successfully')"`
Kết quả mong đợi: In ra dòng `Base loaded successfully`.

- [ ] **Bước 3: Xác nhận trạng thái git sạch sẽ**
Chạy: `git status`
Kết quả mong đợi: Clean working tree.

---

### Task 2: Cập Nhật Model CSDL & Migration Cho KYC Và Nhật Ký Truy Cập

**Tệp tin:**
- Tạo mới: `backend/app/models/personal_data_access_log.py`
- Chỉnh sửa: `backend/app/models/verifiable_information.py`
- Chỉnh sửa: `backend/app/models/drivers_license.py`
- Chỉnh sửa: `backend/app/models/__init__.py`

**Giao diện liên kết:**
- Tiếp nhận: `app.database.database.Base`
- Cung cấp: Model `PersonalDataAccessLog`, các model `DriverLicense` và `VerifiableInformation` có thêm các trường `verified_by`, `verified_at`, `rejected_reason`.

- [ ] **Bước 1: Định nghĩa model `PersonalDataAccessLog`**
Trong `backend/app/models/personal_data_access_log.py`, tạo class `PersonalDataAccessLog(Base)` với các cột:
  - `log_id`: BigInteger, primary_key=True, autoincrement=True
  - `accessor_id`: BigInteger, ForeignKey("users.user_id"), nullable=False (ID nhân viên/admin truy cập)
  - `target_user_id`: BigInteger, ForeignKey("users.user_id"), nullable=False (ID khách hàng)
  - `data_type`: String(50), nullable=False (ví dụ: 'DRIVERS_LICENSE', 'CCCD')
  - `action`: String(50), nullable=False (ví dụ: 'VIEW', 'APPROVE', 'REJECT')
  - `reason`: String(255), nullable=True
  - `ip_address`: String(45), nullable=True
  - `user_agent`: String(255), nullable=True
  - `accessed_at`: DateTime, default=datetime.utcnow, nullable=False

- [ ] **Bước 2: Bổ sung trường vào `verifiable_information.py` và `drivers_license.py`**
Trong `verifiable_information.py`, thêm:
  - `rejected_reason`: Column(String(255), nullable=True)
  - `verified_at`: Column(DateTime, nullable=True)
  - `verified_by`: Column(BigInteger, ForeignKey("users.user_id"), nullable=True)
Trong `drivers_license.py`, thêm:
  - `verified_by`: Column(BigInteger, ForeignKey("users.user_id"), nullable=True)

- [ ] **Bước 3: Đăng ký model trong `backend/app/models/__init__.py`**
Thêm import `from app.models.personal_data_access_log import PersonalDataAccessLog`.

- [ ] **Bước 4: Kiểm tra metadata bảng trong SQLAlchemy**
Chạy kiểm tra đảm bảo các cột mới đều có mặt trong `Base.metadata.tables`.

---

### Task 3: Pydantic Schemas Cho Kiểm Duyệt KYC Và Nhật Ký Truy Cập

**Tệp tin:**
- Tạo mới: `backend/app/schemas/verification_schemas.py`
- Tạo mới: `backend/app/schemas/audit_log_schemas.py`
- Kiểm thử: `backend/tests/test_schemas.py`

**Giao diện liên kết:**
- Tiếp nhận: Pydantic `BaseModel`, `Field`, `field_validator`
- Cung cấp: `ReviewKYCRequestSchema`, `KYCDetailResponseSchema`, `AuditLogQueryFilterSchema`, `AuditLogResponseSchema`.

- [ ] **Bước 1: Viết test kiểm tra validate schema (TDD - Test thất bại trước)**
Trong `backend/tests/test_schemas.py`:
```python
import pytest
from pydantic import ValidationError
from app.schemas.verification_schemas import ReviewKYCRequestSchema, ReviewActionEnum

def test_reject_action_requires_reason():
    with pytest.raises(ValidationError):
        ReviewKYCRequestSchema(action=ReviewActionEnum.REJECT, rejected_reason="")

def test_approve_action_accepts_none_reason():
    schema = ReviewKYCRequestSchema(action=ReviewActionEnum.APPROVE)
    assert schema.action == ReviewActionEnum.APPROVE
```

- [ ] **Bước 2: Chạy test xác nhận thất bại**
Chạy: `pytest backend/tests/test_schemas.py`
Kết quả mong đợi: FAIL (module chưa tồn tại).

- [ ] **Bước 3: Cài đặt schemas trong `verification_schemas.py` và `audit_log_schemas.py`**
Khai báo `ReviewActionEnum` ('APPROVE', 'REJECT'), `ReviewKYCRequestSchema` với validator kiểm tra bắt buộc có `rejected_reason` khi `action == REJECT`. Khai báo `AuditLogResponseSchema` định dạng ngày giờ chuẩn ISO.

- [ ] **Bước 4: Chạy lại test xác nhận thành công**
Chạy: `pytest backend/tests/test_schemas.py`
Kết quả mong đợi: PASS.

---

### Task 4: Service Nhật Ký Truy Cập & Ràng Buộc Lưu Trữ Tối Thiểu 12 Tháng

**Tệp tin:**
- Tạo mới: `backend/app/services/audit_log_services.py`
- Kiểm thử: `backend/tests/test_audit_log_service.py`

**Giao diện liên kết:**
- Tiếp nhận: Model `PersonalDataAccessLog`, SQLAlchemy `Session`
- Cung cấp:
  - `record_personal_data_access(db, accessor_id, target_user_id, data_type, action, reason=None, ip_address=None, user_agent=None) -> PersonalDataAccessLog`
  - `get_personal_data_audit_logs(db, filter_params) -> List[PersonalDataAccessLog]`
  - `purge_audit_logs_older_than_12_months(db, cutoff_date=None) -> int` (nghiêm cấm xóa log dưới 365 ngày)

- [ ] **Bước 1: Viết test cho service nhật ký & chính sách 12 tháng**
Trong `backend/tests/test_audit_log_service.py`:
  - Test ghi nhận log truy cập khi xem/duyệt.
  - Test lọc danh sách nhật ký theo khách hàng, hành động, thời gian.
  - Test cố tình xóa log dưới 365 ngày: ném lỗi `HTTPException(403)` / vi phạm chính sách lưu trữ.
  - Test xóa log trên 365 ngày: thực hiện thành công.

- [ ] **Bước 2: Chạy test xác nhận thất bại**
Chạy: `pytest backend/tests/test_audit_log_service.py`
Kết quả mong đợi: FAIL.

- [ ] **Bước 3: Cài đặt logic trong `audit_log_services.py`**
Cài đặt hàm `record_personal_data_access` tự động cắt ngắn User-Agent dưới 255 ký tự. Cài đặt hàm `purge_audit_logs_older_than_12_months` với điều kiện chặn nghiêm ngặt: nếu `cutoff_date > datetime.utcnow() - timedelta(days=365)` thì raise lỗi HTTP 403 Forbidden.

- [ ] **Bước 4: Chạy lại test xác nhận thành công**
Chạy: `pytest backend/tests/test_audit_log_service.py`
Kết quả mong đợi: PASS.

---

### Task 5: Service Kiểm Duyệt KYC (Giấy Phép Lái Xe & CCCD)

**Tệp tin:**
- Tạo mới: `backend/app/services/verification_services.py`
- Kiểm thử: `backend/tests/test_verification_services.py`

**Giao diện liên kết:**
- Tiếp nhận: Các model `DriverLicense`, `VerifiableInformation`, `User`, hàm `record_personal_data_access` từ `audit_log_services`
- Cung cấp:
  - `get_customer_kyc_details(db, customer_user_id, staff_user_id, ip, ua) -> dict` (xem chi tiết và ghi log `VIEW`)
  - `review_driver_license(db, license_id, staff_user_id, review_data, ip, ua) -> DriverLicense` (ghi log `APPROVE`/`REJECT`)
  - `review_id_card(db, info_id, staff_user_id, review_data, ip, ua) -> VerifiableInformation` (ghi log `APPROVE`/`REJECT`)

- [ ] **Bước 1: Viết test cho quy trình duyệt và ghi log đồng thời**
Trong `backend/tests/test_verification_services.py`:
  - Kiểm tra `get_customer_kyc_details` tự động tạo 1 bản ghi log `VIEW`.
  - Kiểm tra `review_driver_license` cập nhật trạng thái `Đã xác thực` hoặc `Bị từ chối` kèm lý do và tạo bản ghi log tương ứng.
  - Kiểm tra từ chối không có lý do bị chặn.

- [ ] **Bước 2: Chạy test xác nhận thất bại**
Chạy: `pytest backend/tests/test_verification_services.py`
Kết quả mong đợi: FAIL.

- [ ] **Bước 3: Cài đặt logic trong `verification_services.py`**
Cài đặt các hàm xử lý duyệt/từ chối với giao dịch CSDL bảo đảm an toàn. Ném lỗi 404 nếu không tìm thấy hồ sơ hoặc khách hàng.

- [ ] **Bước 4: Chạy lại test xác nhận thành công**
Chạy: `pytest backend/tests/test_verification_services.py`
Kết quả mong đợi: PASS.

---

### Task 6: Xây Dựng FastAPI Routers & Tích Hợp Vào Hệ Thống

**Tệp tin:**
- Tạo mới: `backend/app/routers/verification_routers.py`
- Tạo mới: `backend/app/routers/audit_routers.py`
- Chỉnh sửa: `backend/app/main.py`
- Kiểm thử: `backend/tests/test_verification_api.py`

**Giao diện liên kết:**
- Tiếp nhận: `verification_services`, `audit_log_services`, `create_response`
- Cung cấp:
  - `GET /admin/verification/customers/{user_id}/kyc`
  - `POST /admin/verification/licenses/{license_id}/review`
  - `POST /admin/verification/id-cards/{info_id}/review`
  - `GET /admin/audit-logs/personal-data`
  - `DELETE /admin/audit-logs/personal-data/purge` (áp dụng ràng buộc 12 tháng)

- [ ] **Bước 1: Viết test tích hợp API với `TestClient`**
Trong `backend/tests/test_verification_api.py`:
  - Test endpoint xem KYC trả về 200 và sinh log.
  - Test duyệt GPLX thành công trả về 200.
  - Test từ chối không kèm lý do trả về 422.
  - Test từ chối có lý do trả về 200.
  - Test truy vấn nhật ký trả về danh sách lịch sử.
  - Test cố tình purge nhật ký dưới 12 tháng trả về 403 Forbidden.

- [ ] **Bước 2: Chạy test xác nhận thất bại**
Chạy: `pytest backend/tests/test_verification_api.py`
Kết quả mong đợi: FAIL.

- [ ] **Bước 3: Cài đặt routers và gắn vào `app/main.py`**
Tạo router lấy IP khách (`request.client.host`) và `User-Agent`, gọi service tương ứng và bọc kết quả qua `create_response`. Đăng ký các router mới vào `main.py`.

- [ ] **Bước 4: Chạy lại test xác nhận toàn bộ test API thành công**
Chạy: `pytest backend/tests/test_verification_api.py`
Kết quả mong đợi: PASS.

---

### Task 7: Nghiệm Thu Toàn Diện Và Kiểm Thử Hồi Quy

- [ ] **Bước 1: Chạy toàn bộ test suite của dự án**
Chạy: `pytest -v`
Kết quả mong đợi: 100% test case pass.

- [ ] **Bước 2: Rà soát đối chiếu tiêu chuẩn Superpowers**
Xác nhận đầy đủ các tiêu chí:
  - Bắt buộc có lý do khi từ chối hồ sơ.
  - Ghi nhật ký đầy đủ mỗi khi xem hoặc duyệt thông tin cá nhân.
  - Ràng buộc lưu trữ tối thiểu 12 tháng hoạt động chính xác.
