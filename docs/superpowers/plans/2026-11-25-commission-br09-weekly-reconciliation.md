# Kế Hoạch Triển Khai — TF149EA: Hoa Hồng 12% BR-09 & Đối Soát Tuần Từng Cửa Hàng

1. **Bước 1 — Cơ sở dữ liệu & Model (`Order`, `WeeklyReconciliation`)**:
   - Thêm `commission_rate`, `commission_amount` vào `backend/app/models/order.py`.
   - Tạo model `backend/app/models/weekly_reconciliation.py` cho bảng `weekly_reconciliations`.
   - Tạo migration Alembic `backend/migrations/versions/f7b2d09e88a7_add_commission_and_weekly_reconciliation.py` (`down_revision = 'e6a1c98d77f6'`) và cập nhật `backend/sql/createtable.sql`.

2. **Bước 2 — Viết kiểm thử TDD (RED)**:
   - Tạo `backend/tests/test_commission_br09_and_reconciliation.py` kiểm tra:
     - Công thức BR-09: `12%` chỉ tính trên `rental_amount`, **không tính trên `delivery_fee`**; kiểm tra cửa hàng thực nhận = `rental_amount - commission + delivery_fee`.
     - Loại trừ hoàn toàn đơn `Đã hủy`, `Cửa hàng từ chối`, `Chờ thanh toán` khỏi đối soát.
     - Tổng hợp đối soát theo tuần riêng biệt cho từng cửa hàng (`store_id`) và tách chính xác theo từng tuần ISO (Thứ 2 – Chủ Nhật).
     - API `GET /reconciliation/weekly`, `POST /reconciliation/weekly/generate` (lưu `weekly_reconciliations` và cập nhật `orders.commission_amount`) và `GET /stores/{store_id}/reconciliation/weekly`.

3. **Bước 3 — Triển khai Schema, Service & Router Backend (TDD GREEN)**:
   - Tạo `backend/app/schemas/reconciliation_schemas.py`.
   - Tạo `backend/app/services/reconciliation_services.py` (kèm docstring và comment tiếng Việt từng hàm).
   - Tạo `backend/app/routers/reconciliation_routers.py` và đăng ký vào `backend/app/main.py`.
   - Chạy `pytest` xác nhận pass 100%.

4. **Bước 4 — Nâng cấp giao diện doanh thu & đối soát (`revenue.html`, `revenue.js`)**:
   - Nối `revenue.html` + `revenue.js` với `GET /reconciliation/weekly` và `POST /reconciliation/weekly/generate`, hiển thị rõ tách biệt tiền thuê, phí giao nhận (0% hoa hồng), hoa hồng 12% BR-09 và thực nhận cửa hàng.

5. **Bước 5 — Cập nhật trực tiếp TiDB, Kiểm thử tổng thể & Đẩy Git**:
   - Áp dụng trực tiếp cột mới + bảng `weekly_reconciliations` + `alembic_version` lên TiDB Cloud (`vehicle_rental_platform_db`).
   - Chạy toàn bộ bộ test `pytest` + kiểm tra Frontend.
   - Commit, push nhánh `feature/task-TF149EA` và kiểm tra `git merge-tree` 0 conflict với `origin/developers`.
