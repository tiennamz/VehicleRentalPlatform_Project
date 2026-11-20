# Kế Hoạch Triển Khai Task TF13D97: Tìm Xe Khi Chưa Duyệt GPLX, Chặn Tạo Đơn & Kiểm Tra Đủ 18 Tuổi

> **Dành cho agent thực thi:** KỸ NĂNG BẮT BUỘC: Sử dụng `superpowers:executing-plans` và `superpowers:test-driven-development` để triển khai kế hoạch này theo từng task. Các bước sử dụng cú pháp checkbox (`- [ ]`) để theo dõi tiến độ.

**Mục tiêu:** Triển khai chức năng cho phép tài khoản chưa duyệt giấy phép lái xe vẫn tìm kiếm xe bình thường nhưng bị chặn khi tạo đơn đặt xe, đồng thời kiểm tra điều kiện người dùng phải từ đủ 18 tuổi trở lên (Task `TF13D97`).

**Kiến trúc:** Kiến trúc phân tầng (`Routers` -> `Services` -> `SQLAlchemy Models` -> `TiDB Cloud / MySQL`) sử dụng chuẩn phản hồi `create_response`. Kiểm tra độ tuổi ($\ge 18$ tuổi) được áp dụng cả ở tầng Schema/Service khi cập nhật hồ sơ cá nhân, nộp GPLX và khi tạo đơn đặt xe. API tìm kiếm xe (`GET /vehicles`) mở cho mọi tài khoản, trong khi API đặt xe (`POST /orders`) kiểm tra nghiêm ngặt độ tuổi $\ge 18$, trạng thái GPLX `"Đã xác thực"`, thời hạn GPLX và hạng bằng lái phù hợp với loại xe.

**Công nghệ sử dụng:** FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic, Pytest, Python 3.10+.

**Tài liệu tham chiếu:** Đặc tả Task `TF13D97` & Kịch bản kiểm thử `TC18–TC23`, `TC28–TC35` trong `docs/Test_Case_FR-01_FR-05.docx`.

## Ràng Buộc Chung (Global Constraints)

- Người dùng phải từ **đủ 18 tuổi trở lên** (tính chính xác theo ngày, tháng, năm sinh đến ngày hiện tại).
- Ngày sinh trong tương lai hoặc dưới 18 tuổi phải bị từ chối rõ ràng.
- Tài khoản chưa có GPLX, GPLX đang ở trạng thái `"Đang chờ"` hoặc `"Bị từ chối"` **vẫn được phép gọi API tìm kiếm xe** (`GET /vehicles`).
- Chỉ tài khoản **đủ 18 tuổi** VÀ có GPLX ở trạng thái **`"Đã xác thực"`**, còn hạn sử dụng, đúng hạng xe mới được phép tạo đơn thuê (`POST /orders`).
- Toàn bộ phản hồi API tuân theo chuẩn `BaseResponse` qua `app.utils.response.create_response`.

## Trọng Tâm Kiểm Thử (Review Focus)

1. **Ranh giới tuổi 18 chính xác từng ngày:** Người sinh đúng ngày này 18 năm trước được tính là đủ 18 tuổi (PASS); người còn thiếu 1 ngày nữa mới đến sinh nhật 18 tuổi bị tính là 17 tuổi (FAIL 403/422).
2. **Ngày sinh trong tương lai:** Nhập `date_of_birth > today` phải bị chặn ngay lập tức với thông báo lỗi ngày sinh không hợp lệ.
3. **Tài khoản chờ duyệt GPLX tìm xe:** Gọi `GET /vehicles` với tài khoản có GPLX `"Đang chờ"` hoặc chưa có GPLX phải trả về `200 OK` cùng danh sách xe.
4. **Tài khoản chưa duyệt GPLX cố tình tạo đơn:** Gọi `POST /orders` khi chưa có GPLX, GPLX `"Đang chờ"`, `"Bị từ chối"` hoặc `"Đã hết hạn"` phải bị chặn với `403 Forbidden`.
5. **Không khớp hạng GPLX với loại xe:** Có GPLX `"Đã xác thực"` hạng `A1` nhưng đặt `"Ô tô 4 chỗ"` phải bị chặn với `403 Forbidden`.

---

### Task 1: Cập Nhật Model `User`, Các Khóa Chính & Migration Cho `TF13D97`

**Tệp tin:**
- Chỉnh sửa: `backend/app/models/user.py`
- Chỉnh sửa: `backend/app/models/drivers_license.py`
- Chỉnh sửa: `backend/app/models/vehicle.py`
- Chỉnh sửa: `backend/app/models/order.py`
- Chỉnh sửa: `backend/app/models/price_table.py`
- Tạo mới: `backend/migrations/versions/d8f3a21b90e1_add_user_dob_and_address_tf13d97.py`
- Chỉnh sửa: `backend/sql/createtable.sql`

- [x] **Bước 1: Bổ sung `date_of_birth` và `address` vào `User` model**
Thêm `date_of_birth = Column(Date, nullable=True)` và `address = Column(String(255), nullable=True)` vào `backend/app/models/user.py`. Đồng thời cấu hình `BigInteger().with_variant(Integer, "sqlite")` cho các khóa chính tự tăng để tương thích cả MySQL và SQLite test.
- [x] **Bước 2: Tạo file Alembic migration và cập nhật `createtable.sql`**
Tạo revision `d8f3a21b90e1` nối tiếp `c7e2b10a45f9` để thêm cột `date_of_birth` và `address` vào bảng `users`.

---

### Task 2: Xây Dựng Pydantic Schemas & Hàm Tính Tuổi ($\ge 18$)

**Tệp tin:**
- Tạo mới: `backend/app/schemas/booking_eligibility_schemas.py`
- Kiểm thử: `backend/tests/test_tf13d97_age_and_booking_guard.py`

- [x] **Bước 1: Viết test cho hàm tính tuổi và validate Schema (RED)**
Kiểm tra:
  - Đủ 18 tuổi (sinh đúng ngày này 18 năm trước) -> Hợp lệ.
  - Chưa đủ 18 tuổi (thiếu 1 ngày) -> Báo lỗi `ValidationError`.
  - Ngày sinh ở tương lai -> Báo lỗi `ValidationError`.
- [x] **Bước 2: Cài đặt `booking_eligibility_schemas.py` (GREEN)**
Định nghĩa `calculate_age(dob: date, today: Optional[date] = None) -> int`, `UserProfileUpdateSchema`, `DriverLicenseSubmitSchema`, `OrderCreateSchema`.

---

### Task 3: Xây Dựng Service Tìm Xe, Cập Nhật Hồ Sơ & Chặn Tạo Đơn (`TF13D97`)

**Tệp tin:**
- Tạo mới: `backend/app/services/booking_eligibility_services.py`
- Kiểm thử: `backend/tests/test_tf13d97_age_and_booking_guard.py`

- [x] **Bước 1: Viết unit test cho các hàm Service (RED)**
Kiểm tra:
  - `search_vehicles`: trả về danh sách xe kể cả khi user chưa duyệt GPLX.
  - `update_user_profile` & `submit_driver_license`: kiểm tra đủ 18 tuổi.
  - `create_rental_order`: chặn khi user chưa đủ 18 tuổi, chưa có GPLX, GPLX `"Đang chờ"`, `"Bị từ chối"`, hết hạn, hoặc sai hạng bằng; cho phép khi đủ 18 tuổi và GPLX `"Đã xác thực"` hợp lệ.
- [x] **Bước 2: Cài đặt `booking_eligibility_services.py` (GREEN)**
Cài đặt đầy đủ logic kiểm tra và tạo đơn.

---

### Task 4: Xây Dựng FastAPI Routers & Tích Hợp Vào `app/main.py`

**Tệp tin:**
- Tạo mới: `backend/app/routers/booking_eligibility_routers.py`
- Chỉnh sửa: `backend/app/main.py`
- Kiểm thử: `backend/tests/test_tf13d97_age_and_booking_guard.py`

- [x] **Bước 1: Viết API integration tests với `TestClient` (RED)**
Kiểm tra các endpoint:
  - `PUT /users/{user_id}/profile`
  - `POST /users/{user_id}/licenses`
  - `GET /vehicles`
  - `POST /orders`
- [x] **Bước 2: Cài đặt `booking_eligibility_routers.py` và gắn vào `main.py` (GREEN)**
- [x] **Bước 3: Chạy toàn bộ bộ test (`pytest backend/tests/ -v`) đảm bảo pass 100%**
