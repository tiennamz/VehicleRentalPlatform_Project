# Kế Hoạch Triển Khai Task TF13FE6: Cấu Hình Giao Tại Cửa Hàng Hoặc Giao Tận Nơi Trong Bán Kính Quy Định & Tính Phí Tương Ứng

> **Dành cho agent thực thi:** KỸ NĂNG BẮT BUỘC: Sử dụng `superpowers:executing-plans` và `superpowers:test-driven-development` để triển khai kế hoạch này theo từng task. Các bước sử dụng cú pháp checkbox (`- [ ]`) để theo dõi tiến độ.

**Mục tiêu:** Xây dựng chức năng cấu hình phương thức giao nhận xe (Nhận tại cửa hàng hoặc Giao tận nơi trong bán kính quy định), tính phí giao xe tương ứng theo khoảng cách, chặn các yêu cầu giao xe vượt quá bán kính tối đa và tích hợp trực tiếp vào luồng tạo đơn đặt xe (`POST /orders`).

**Kiến trúc:** Kiến trúc phân tầng (`Routers` -> `Services` -> `SQLAlchemy Models` -> `TiDB Cloud / MySQL`). Cấu hình giao nhận (`allow_store_pickup`, `allow_home_delivery`, `max_delivery_radius_km`, `delivery_base_fee`, `delivery_fee_per_km`) được lưu trữ trong bảng `system_config`. Bảng `orders` được bổ sung 4 cột vật lý (`delivery_method`, `delivery_address`, `delivery_distance_km`, `delivery_fee`) để lưu chi tiết phương thức nhận xe và cộng phí giao xe vào `total_amount`.

**Công nghệ sử dụng:** FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic, Pytest, TiDB Cloud.

**Tài liệu tham chiếu:** Yêu cầu nghiệp vụ cấu hình giao tại cửa hàng hoặc giao tận nơi trong bán kính quy định và tính phí tương ứng (Mô hình 1 cửa hàng).

## Ràng Buộc Chung (Global Constraints)

- **Nhận tại cửa hàng (`"Nhận tại cửa hàng"` / `STORE_PICKUP`):** Phí giao xe = `0 VNĐ`, khoảng cách = `0 km`.
- **Giao tận nơi (`"Giao tận nơi"` / `HOME_DELIVERY`):**
  - Chỉ được phép khi cấu hình `allow_home_delivery = true`.
  - Bắt buộc phải cung cấp `delivery_address` (không rỗng) và `delivery_distance_km > 0`.
  - Khoảng cách `delivery_distance_km` phải **$\le$ `max_delivery_radius_km`** (bán kính quy định). Nếu vượt quá bán kính quy định $\rightarrow$ trả về lỗi `400 Bad Request`.
  - Công thức tính phí giao tận nơi: `delivery_fee = delivery_base_fee + (delivery_distance_km * delivery_fee_per_km)`.
- Tổng tiền đơn hàng: `total_amount = tiền thuê xe + delivery_fee`.
- Không được phép tắt đồng thời cả 2 phương thức (`allow_store_pickup` và `allow_home_delivery` cùng bằng `false`).

## Trọng Tâm Kiểm Thử (Review Focus)

1. **Giao tận nơi vượt quá bán kính quy định:** Ví dụ bán kính tối đa là `15 km`, khách đặt giao tận nơi `15.5 km` phải bị chặn với lỗi `400 Bad Request`.
2. **Giao tận nơi đúng bằng biên bán kính quy định:** Khách đặt giao ở khoảng cách đúng bằng `15.0 km` được chấp nhận và tính phí chính xác.
3. **Giao tận nơi thiếu địa chỉ hoặc khoảng cách $\le 0$:** Phải trả về lỗi `400/422` yêu cầu nhập địa chỉ và khoảng cách hợp lệ.
4. **Cửa hàng tắt tính năng giao tận nơi (`allow_home_delivery = false`):** Mọi yêu cầu tính phí hoặc đặt đơn chọn `"Giao tận nơi"` phải bị từ chối với lỗi `400 Bad Request`.
5. **Tương thích ngược với đơn nhận tại cửa hàng:** Đơn hàng không truyền `delivery_method` mặc định là `"Nhận tại cửa hàng"`, `delivery_fee = 0`, `total_amount` giữ nguyên bằng tiền thuê xe.

---

### Task 1: Cập Nhật Model `Order`, `SystemConfig`, Migration & SQL

**Tệp tin:**
- Chỉnh sửa: `backend/app/models/order.py`
- Chỉnh sửa: `backend/app/models/system_config.py`
- Tạo mới: `backend/migrations/versions/e9a4c32d11f0_add_delivery_fields_to_orders.py`
- Chỉnh sửa: `backend/sql/createtable.sql`
- Chỉnh sửa: `backend/sql/seed.sql`

- [x] **Bước 1: Thêm 4 cột giao nhận vào `Order` model và chuẩn hóa PK cho `SystemConfig`**
  - `delivery_method`: `Column(String(50), default="Nhận tại cửa hàng")`
  - `delivery_address`: `Column(String(255), nullable=True)`
  - `delivery_distance_km`: `Column(Numeric(6, 2), default=0)`
  - `delivery_fee`: `Column(Numeric(12, 2), default=0)`
- [x] **Bước 2: Tạo file Alembic migration `e9a4c32d11f0` và cập nhật `createtable.sql`, `seed.sql`**

---

### Task 2: Xây Dựng Pydantic Schemas Cho Cấu Hình Giao Nhận & Đơn Hàng

**Tệp tin:**
- Tạo mới: `backend/app/schemas/delivery_schemas.py`
- Chỉnh sửa: `backend/app/schemas/booking_eligibility_schemas.py`
- Kiểm thử: `backend/tests/test_delivery_config_and_fee.py`

- [x] **Bước 1: Viết test kiểm tra validate cấu hình giao nhận (RED)**
- [x] **Bước 2: Cài đặt `delivery_schemas.py` và mở rộng `OrderCreateSchema` (GREEN)**

---

### Task 3: Xây Dựng Service Cấu Hình Giao Nhận, Kiểm Tra Bán Kính & Tính Phí

**Tệp tin:**
- Tạo mới: `backend/app/services/delivery_services.py`
- Chỉnh sửa: `backend/app/services/booking_eligibility_services.py`
- Kiểm thử: `backend/tests/test_delivery_config_and_fee.py`

- [x] **Bước 1: Viết unit test cho tính phí giao xe, kiểm tra bán kính và tích hợp tạo đơn (RED)**
- [x] **Bước 2: Cài đặt `delivery_services.py` và tích hợp vào `create_rental_order` (GREEN)**

---

### Task 4: Xây Dựng FastAPI Routers & Tích Hợp Vào `app/main.py`

**Tệp tin:**
- Tạo mới: `backend/app/routers/delivery_routers.py`
- Chỉnh sửa: `backend/app/routers/booking_eligibility_routers.py`
- Chỉnh sửa: `backend/app/main.py`
- Kiểm thử: `backend/tests/test_delivery_config_and_fee.py`

- [x] **Bước 1: Cài đặt `delivery_routers.py` (`GET /delivery-config`, `PUT /admin/delivery-config`, `POST /delivery-config/calculate-fee`)**
- [x] **Bước 2: Cập nhật `POST /orders` trả về thông tin giao nhận và phí giao xe**
- [x] **Bước 3: Cập nhật cấu trúc bảng `orders` và `system_config` trực tiếp lên TiDB Cloud & Chạy toàn bộ Pytest Suite**
