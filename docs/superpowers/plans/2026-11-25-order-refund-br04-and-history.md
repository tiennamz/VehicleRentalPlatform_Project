# Kế Hoạch Triển Khai — TF14841: Hoàn Cọc Theo BR-04 & Danh Sách Đơn, Lịch Sử

1. **Bước 1 — Cơ sở dữ liệu & Model (`Order`, `Transaction`)**:
   - Bổ sung 4 cột `cancelled_at`, `cancel_reason`, `refund_rate`, `refund_amount` vào `backend/app/models/order.py`.
   - Bổ sung `.with_variant(Integer, "sqlite")` cho `Transaction.transaction_id` trong `backend/app/models/transaction.py` để hỗ trợ chạy test SQLite.
   - Tạo migration Alembic `backend/migrations/versions/d5f9b87c66e5_add_order_cancellation_br04_fields.py` (`down_revision = 'c4e8a76b55d4'`) và cập nhật `backend/sql/createtable.sql`.

2. **Bước 2 — Viết kiểm thử TDD (RED)**:
   - Tạo `backend/tests/test_order_refund_br04_and_history.py` kiểm tra:
     - Công thức hoàn cọc BR-04 tại đủ 3 mốc & biên chính xác: `>= 24h` (100%), đúng `24.0h` (100%), `6h <= t < 24h` (50%), đúng `6.0h` (50%), `< 6h` (0%).
     - Hủy đơn lưu đúng `order_status = "Đã hủy"`, `cancelled_at`, `cancel_reason`, `refund_rate`, `refund_amount` và tạo giao dịch hoàn tiền trong `transactions`.
     - Chặn người khác hủy đơn không phải của mình (`403`) và chặn hủy đơn đã hoàn thành/đang thuê/đã hủy (`409`).
     - API `GET /orders/my` lọc chuẩn `scope=all|active|history`, trả đầy đủ `summary` và `history_events`; `GET /orders/{id}/cancel-preview` và `POST /orders/{id}/cancel` hoạt động đúng.

3. **Bước 3 — Xây dựng Schema, Service & Router Backend (TDD GREEN)**:
   - Tạo `backend/app/schemas/order_cancellation_history_schemas.py`.
   - Tạo `backend/app/services/order_cancellation_history_services.py` (kèm docstring và comment tiếng Việt rõ ràng từng hàm).
   - Tạo `backend/app/routers/order_cancellation_history_routers.py` và đăng ký vào `backend/app/main.py`.
   - Chạy `pytest` xác nhận toàn bộ test pass.

4. **Bước 4 — Nâng cấp giao diện khách hàng (`my-orders`)**:
   - Cập nhật `Frontend/pages/my-orders.html`: thanh tab lọc, modal hủy đơn xem trước BR-04, modal chi tiết & lịch sử đơn.
   - Bổ sung CSS trong `Frontend/css/my-orders.css`.
   - Nâng cấp `Frontend/js/my-orders.js`: gọi `GET /orders/my`, `GET /orders/{id}/cancel-preview`, `POST /orders/{id}/cancel` (có fallback offline) và render timeline lịch sử.

5. **Bước 5 — Kiểm thử tổng thể & Đẩy Git**:
   - Chạy toàn bộ bộ test Backend (`pytest`) và script kiểm tra Frontend.
   - Commit, push nhánh `feature/task-TF14841` và kiểm tra `git merge-tree` với `origin/developers`.
