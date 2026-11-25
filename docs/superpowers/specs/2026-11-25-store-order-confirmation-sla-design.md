# Design Spec — TF14679: Store 15-Minute Order Confirmation, Rejection with Reason & Operator Escalation

## Goal
Allow stores to confirm or reject incoming rental orders (with a mandatory rejection reason) within a **15-minute SLA window**. Any unconfirmed order exceeding the 15-minute deadline is automatically transitioned to **`Chờ vận hành viên xử lý`** (pending operator handling), blocking late store confirmation/rejection.

## Data Model Changes (`orders` table)
Add 4 columns to `Order` (`backend/app/models/order.py`), Alembic migration `c4e8a76b55d4_add_store_confirmation_sla_fields.py` (`down_revision = 'b3d7f65a44c3'`), and `backend/sql/createtable.sql`:
- `confirmation_deadline`: `DateTime`, nullable=True (set to `created_at + 15 minutes` on order creation; configurable via `system_config.store_confirmation_timeout_minutes`, default `15`)
- `store_responded_at`: `DateTime`, nullable=True
- `rejection_reason`: `Text`, nullable=True
- `escalated_at`: `DateTime`, nullable=True

## Order Statuses & Transitions
- Pending confirmation statuses: `Chờ cửa hàng xác nhận`, `Chờ thanh toán`, `Đã đặt cọc`
- Store confirms within 15 min → `Đã xác nhận` (`store_responded_at = now`)
- Store rejects within 15 min with reason (3–500 chars) → `Cửa hàng từ chối` (`rejection_reason`, `store_responded_at = now`)
- Exceeds 15 min without store response → `Chờ vận hành viên xử lý` (`escalated_at = now`)
  - Late store confirm/reject triggers auto-escalation and returns HTTP `409 Conflict`.

## Backend APIs (`backend/app/routers/store_order_confirmation_routers.py`)
1. `GET /stores/orders` — List store orders (optional `store_id`, `owner_id`, `order_status`), auto-escalates overdue orders first, returns `confirmation_deadline`, `remaining_seconds`, `is_overdue`, `rejection_reason`, `escalated_at`.
2. `POST /stores/orders/{order_id}/confirm` — Store confirms order within 15-minute SLA (validates store ownership → `403` if mismatch, `409` if overdue or already processed).
3. `POST /stores/orders/{order_id}/reject` — Store rejects order within 15-minute SLA with mandatory `rejection_reason` (validates 3–500 chars, store ownership, SLA deadline).
4. `POST /orders/escalate-overdue` — Sweep and escalate all overdue pending orders to `Chờ vận hành viên xử lý`.
5. `GET /operator/orders/escalated` — List orders currently in `Chờ vận hành viên xử lý` for operations staff.

## Frontend Integration (`Frontend/pages/store-rental-orders.html`, `store-rental-orders.js`, `store-rental-orders.css`)
- Add `Chờ VHV xử lý` tab and working tab filtering with live counters.
- Render live 15-minute countdown badges on pending orders; automatically transition UI row to `Chờ vận hành viên xử lý` when countdown reaches `00:00`.
- Wire **Xác nhận** button → `POST /stores/orders/{id}/confirm` (with offline demo fallback).
- Add **Từ chối** button + reason modal (quick reason presets + required custom textarea) → `POST /stores/orders/{id}/reject` (with offline demo fallback).
- Display rejection reason on rejected orders.
