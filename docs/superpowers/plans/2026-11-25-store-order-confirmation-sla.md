# Implementation Plan — TF14679: Store 15-Min Order Confirmation & Escalation

1. **Task 1 — Database & Model**:
   - Add `confirmation_deadline`, `store_responded_at`, `rejection_reason`, `escalated_at` to `backend/app/models/order.py`.
   - Set `confirmation_deadline = now_utc + timedelta(minutes=15)` in `create_rental_order` (`backend/app/services/booking_eligibility_services.py`) and expose the new fields in `_serialize_order` (`backend/app/routers/booking_eligibility_routers.py`).
   - Create Alembic migration `backend/migrations/versions/c4e8a76b55d4_add_store_confirmation_sla_fields.py` (`down_revision = 'b3d7f65a44c3'`).
   - Append `ALTER TABLE orders` to `backend/sql/createtable.sql`.

2. **Task 2 — TDD RED Tests**:
   - Create `backend/tests/test_store_order_confirmation_sla.py` testing:
     - Store confirms order within 15 minutes (`200`, `Đã xác nhận`).
     - Store rejects order within 15 minutes with valid reason (`200`, `Cửa hàng từ chối`, persists `rejection_reason`).
     - Store rejects with empty/too-short reason (`422`).
     - Another store owner cannot confirm/reject (`403`).
     - Overdue order (> 15 min) automatically escalates to `Chờ vận hành viên xử lý` on `POST /orders/escalate-overdue`, `GET /stores/orders`, and late confirm/reject (`409`).
     - `GET /operator/orders/escalated` lists escalated orders.

3. **Task 3 — Backend Schemas, Services & Routers (TDD GREEN)**:
   - Create `backend/app/schemas/store_order_confirmation_schemas.py`.
   - Create `backend/app/services/store_order_confirmation_services.py`.
   - Create `backend/app/routers/store_order_confirmation_routers.py` and register in `backend/app/main.py`.
   - Run `pytest` and verify all tests pass.

4. **Task 4 — Frontend (`store-rental-orders`)**:
   - Update `Frontend/pages/store-rental-orders.html`: add `Chờ VHV xử lý` tab + Reject Reason modal.
   - Append modal/badge/action styles to `Frontend/css/store-rental-orders.css`.
   - Upgrade `Frontend/js/store-rental-orders.js`: live 15-min countdown, tab filter, Confirm/Reject API integration with offline fallback, auto-escalation on `00:00`.

5. **Task 5 — Final Verification & Git**:
   - Run full `pytest` suite + frontend verification script.
   - Commit & push `feature/task-TF14679` and verify `git merge-tree` has 0 conflicts.
