# Kế Hoạch Triển Khai — TF148C7: Xác Nhận Bàn Giao 2 Chiều (Khách + Nhân Viên → Đang Thuê)

1. **Bước 1 — Cơ sở dữ liệu & Model (`handover_records`)**:
   - Bổ sung 4 cột `staff_confirmed`, `staff_confirmed_at`, `customer_confirmed`, `customer_confirmed_at` vào `backend/app/models/handover_record.py` (kèm `.with_variant(Integer, "sqlite")` cho `handover_id`).
   - Tạo migration Alembic `backend/migrations/versions/e6a1c98d77f6_add_dual_handover_confirmation_fields.py` (`down_revision = 'd5f9b87c66e5'`).
   - Bổ sung câu lệnh `ALTER TABLE handover_records` vào `backend/sql/createtable.sql`.

2. **Bước 2 — Viết kiểm thử TDD (RED)**:
   - Tạo `backend/tests/test_dual_handover_confirmation.py` kiểm tra đầy đủ:
     - Chỉ nhân viên xác nhận → đơn VẪN ở `Đã xác nhận`, xe vẫn `Sẵn sàng`, `waiting_for == "customer"`.
     - Chỉ khách hàng xác nhận → đơn VẪN ở `Đã xác nhận`, xe vẫn `Sẵn sàng`, `waiting_for == "staff"`.
     - Cả nhân viên và khách hàng cùng xác nhận (theo cả 2 thứ tự: NV trước → Khách sau và Khách trước → NV sau) → đơn chuyển `Đang thuê`, xe chuyển `Đang thuê`, `both_confirmed == True`.
     - Kiểm tra phân quyền: khách hàng không được gọi `staff-confirm` (`403`), người khác không được gọi `customer-confirm` (`403`).
     - Chặn xác nhận bàn giao khi đơn chưa ở trạng thái `Đã xác nhận` (`409`).

3. **Bước 3 — Xây dựng Schema, Service & Router Backend (TDD GREEN)**:
   - Tạo `backend/app/schemas/handover_confirmation_schemas.py`.
   - Tạo `backend/app/services/handover_confirmation_services.py` (đầy đủ docstring và comment tiếng Việt từng hàm).
   - Tạo `backend/app/routers/handover_confirmation_routers.py` và đăng ký vào `backend/app/main.py`.
   - Chạy `pytest` xác nhận pass 100%.

4. **Bước 4 — Tích hợp Frontend 2 phía (`store-rental-orders.js` & `my-orders.js`)**:
   - Thêm nút **"NV xác nhận giao xe"** trên `store-rental-orders.js` và nút **"Xác nhận nhận xe"** trên `my-orders.js` kèm badge tiến độ 2 bên (`NV ✓/○ · Khách ✓/○`) và đồng bộ demo qua `localStorage`.

5. **Bước 5 — Kiểm thử tổng thể & Đẩy Git**:
   - Chạy toàn bộ bộ test Backend (`pytest`) và script kiểm tra Frontend.
   - Commit, push nhánh `feature/task-TF148C7` và kiểm tra `git merge-tree` với `origin/developers` (0 conflict).
