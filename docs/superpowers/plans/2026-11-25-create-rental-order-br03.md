# Create Rental Order & BR-03 Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement end-to-end rental order creation with delivery method selection, customer note, schedule conflict check, and BR-03 pricing (rental amount, delivery fee, deposit 30% clamped to 200,000–1,000,000 VNĐ, remaining amount on pickup) across Backend and Frontend.

**Architecture:** Extend `Order` model & migration with `note`, `rental_amount`, `deposit_amount`, `remaining_amount`; centralize BR-03 & cost calculation in `booking_eligibility_services.py`; expose `POST /orders/calculate`, enhanced `POST /orders`, and `GET /orders/{order_id}`; create `Frontend/pages/create-rental-order.html` and wire `weekly-vehicle-schedule.html` → `create-rental-order.html` → `deposit-payment.html`.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic v2, Vanilla HTML/CSS/JS, Pytest.

**Spec:** `docs/superpowers/specs/2026-11-25-create-rental-order-br03-design.md`

## Global Constraints
- Must keep 100% backward compatibility with all existing tests (`test_tf13d97_age_and_booking_guard.py`, `test_delivery_config_and_fee.py`, `test_vehicle_filter_sort.py`).
- BR-03 deposit: 30% of `total_amount` (or `deposit_rate` from `system_config`), min `200,000`, max `1,000,000`, capped at `total_amount` if `total_amount < 200,000`.
- Frontend must work both with live FastAPI backend and in static offline mode.

## Review Focus
1. `total_amount < 200,000`: Deposit capped at `total_amount`, `remaining_amount == 0` (never negative).
2. `total_amount * 30% < 200,000` (e.g., `330,000 * 30% = 99,000`): Minimum deposit `200,000` applies; `remaining_amount = 130,000`.
3. `total_amount * 30% > 1,000,000` (e.g., `5,000,000 * 30% = 1,500,000`): Maximum deposit `1,000,000` applies; `remaining_amount = 4,000,000`.
4. `total_amount * 30%` strictly inside `[200,000, 1,000,000]` (e.g., `1,000,000 * 30% = 300,000`): Exact 30% applies; `remaining_amount = 700,000`.
5. Active overlapping order on the same vehicle returns HTTP 409; cancelled/completed orders do NOT block booking.

---

### Task 1: Model, Migration & SQL Schema

**Files:**
- Modify: `backend/app/models/order.py`
- Create: `backend/migrations/versions/b3d7f65a44c3_add_order_note_and_br03_amounts.py`
- Modify: `backend/sql/createtable.sql`

- [ ] **Step 1:** Add `note` (`Text`, nullable), `rental_amount`, `deposit_amount`, `remaining_amount` (`Numeric(12, 2)`, default 0) to `Order` model.
- [ ] **Step 2:** Create Alembic migration `b3d7f65a44c3_add_order_note_and_br03_amounts.py` (`down_revision = 'a2c6e54f33b2'`) and append `ALTER TABLE orders` to `backend/sql/createtable.sql`.

---

### Task 2: BR-03 Pricing, Preview, Conflict Guard & Order Endpoints (TDD)

**Files:**
- Modify: `backend/app/schemas/booking_eligibility_schemas.py`
- Modify: `backend/app/services/booking_eligibility_services.py`
- Modify: `backend/app/routers/booking_eligibility_routers.py`
- Create: `backend/tests/test_order_creation_and_br03.py`

- [ ] **Step 1:** Write `backend/tests/test_order_creation_and_br03.py` covering all BR-03 tiers (below 200k, min 200k, mid 30%, max 1M), delivery fee + note persistence, `POST /orders/calculate`, `POST /orders`, `GET /orders/{order_id}`, and 409 overlapping booking conflict.
- [ ] **Step 2:** Run pytest on `test_order_creation_and_br03.py` and confirm RED (ImportError / missing fields).
- [ ] **Step 3:** Implement `OrderCalculateRequestSchema`, `note` in `OrderCreateSchema`, `calculate_deposit_br03`, `calculate_order_pricing`, overlap check & BR-03 persistence in `create_rental_order`, `get_order_by_id`, and router endpoints `POST /orders/calculate`, `POST /orders`, `GET /orders/{order_id}`.
- [ ] **Step 4:** Run pytest on `test_order_creation_and_br03.py` and regression suites. Expected: ALL PASS.

---

### Task 3: Create `create-rental-order.html`, Upgrade `create-rental-order.js`, Link Schedule & Deposit Payment

**Files:**
- Create: `Frontend/pages/create-rental-order.html`
- Modify: `Frontend/css/create-rental-order.css` (append booking form & BR-03 breakdown styles)
- Modify: `Frontend/js/create-rental-order.js`
- Modify: `Frontend/pages/weekly-vehicle-schedule.html`
- Modify: `Frontend/js/weekly-vehicle-schedule.js`
- Modify: `Frontend/js/deposit-payment.js`

- [ ] **Step 1:** Create `Frontend/pages/create-rental-order.html` with vehicle summary, rental date/hour picker, delivery method toggle (`Nhận tại cửa hàng` / `Giao tận nơi` + address + distance km), note textarea, BR-03 breakdown card, and submit button.
- [ ] **Step 2:** Append clean styles to `Frontend/css/create-rental-order.css` and upgrade `Frontend/js/create-rental-order.js` to call `POST /orders/calculate` & `POST /orders` (with offline fallback) and pass `vrpPendingOrder` to `deposit-payment.html`.
- [ ] **Step 3:** Update `weekly-vehicle-schedule.html` & `weekly-vehicle-schedule.js` so `#spContinue` routes to `create-rental-order.html`, and update `deposit-payment.js` to hydrate from `sessionStorage.vrpPendingOrder`.

---

### Task 4: Full Verification (`verification-before-completion`)

- [ ] **Step 1:** Run full backend pytest suite (`test_order_creation_and_br03.py`, `test_vehicle_filter_sort.py`, `test_tf13d97_age_and_booking_guard.py`, `test_delivery_config_and_fee.py`, `test_vehicle_cloudinary_upload.py`). Expected: 0 failures.
- [ ] **Step 2:** Run Python frontend integrity verification checking `create-rental-order.html`, `weekly-vehicle-schedule.html`, `deposit-payment.html`, and all linked JS/CSS assets.
