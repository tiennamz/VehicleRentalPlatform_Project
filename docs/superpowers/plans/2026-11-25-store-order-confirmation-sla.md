# Kế Hoạch Triển Khai — TF14679: Cửa Hàng Xác Nhận / Từ Chối Trong 15 Phút & Chuyển Vận Hành Viên

1. **Bước 1 — Cơ sở dữ liệu & Model (`orders`)**:
   - Bổ sung 4 cột `confirmation_deadline`, `store_responded_at`, `rejection_reason`, `escalated_at` vào `backend/app/models/order.py`.
   - Khi tạo đơn mới trong `create_rental_order` (`backend/app/services/booking_eligibility_services.py`), tự động gán `confirmation_deadline = now_utc + 15 phút` và trả đầy đủ các trường SLA trong `_serialize_order` (`backend/app/routers/booking_eligibility_routers.py`).
   - Tạo migration Alembic `backend/migrations/versions/c4e8a76b55d4_add_store_confirmation_sla_fields.py` (`down_revision = 'b3d7f65a44c3'`).
   - Bổ sung câu lệnh `ALTER TABLE orders` vào cuối `backend/sql/createtable.sql`.

2. **Bước 2 — Viết kiểm thử TDD (RED) trước khi cài đặt**:
   - Tạo `backend/tests/test_store_order_confirmation_sla.py` phủ đủ các tình huống:
     - Cửa hàng xác nhận đơn trong hạn 15 phút (`200`, chuyển `Đã xác nhận`).
     - Cửa hàng từ chối đơn trong hạn 15 phút kèm lý do hợp lệ (`200`, chuyển `Cửa hàng từ chối`, lưu `rejection_reason`).
     - Cửa hàng từ chối nhưng để trống hoặc nhập lý do quá ngắn (`422`).
     - Chủ cửa hàng khác cố xác nhận/từ chối đơn không thuộc cửa hàng mình (`403`).
     - Đơn quá hạn 15 phút tự động chuyển sang `Chờ vận hành viên xử lý` khi gọi `POST /orders/escalate-overdue`, `GET /stores/orders`, hoặc khi cửa hàng bấm xác nhận/từ chối muộn (`409`).
     - API `GET /operator/orders/escalated` trả về đúng các đơn quá hạn cần vận hành viên xử lý.

3. **Bước 3 — Xây dựng Schema, Service & Router Backend (TDD GREEN)**:
   - Tạo `backend/app/schemas/store_order_confirmation_schemas.py` để validate dữ liệu xác nhận và lý do từ chối.
   - Tạo `backend/app/services/store_order_confirmation_services.py` xử lý nghiệp vụ SLA 15 phút, kiểm tra quyền cửa hàng, xác nhận, từ chối và tự động chuyển vận hành viên.
   - Tạo `backend/app/routers/store_order_confirmation_routers.py` và đăng ký router vào `backend/app/main.py`.
   - Chạy `pytest` đảm bảo toàn bộ test pass 100%.

4. **Bước 4 — Nâng cấp giao diện cửa hàng (`store-rental-orders`)**:
   - Cập nhật `Frontend/pages/store-rental-orders.html`: thêm tab `Chờ VHV xử lý` và modal nhập lý do từ chối đơn.
   - Bổ sung style trong `Frontend/css/store-rental-orders.css` cho badge quá hạn, nút từ chối và modal lý do.
   - Cập nhật `Frontend/js/store-rental-orders.js`: đếm ngược 15 phút theo thời gian thực, lọc tab, gọi API xác nhận/từ chối (có fallback offline) và tự động chuyển trạng thái khi hết giờ.

5. **Bước 5 — Kiểm thử tổng thể & Đẩy Git**:
   - Chạy toàn bộ bộ test `pytest` Backend + kiểm tra luồng Frontend.
   - Commit, push nhánh `feature/task-TF14679` và kiểm tra `git merge-tree` với `origin/developers` (0 conflict).
