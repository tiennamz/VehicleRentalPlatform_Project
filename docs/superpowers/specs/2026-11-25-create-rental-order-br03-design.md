# Design Spec: Create Rental Order, Delivery Options, Note & BR-03 Pricing

**Date:** 2026-11-25  
**Approach Selected:** Approach A — Complete Backend order pricing/BR-03 + create `Frontend/pages/create-rental-order.html` + wire full booking flow (`weekly-vehicle-schedule.html` → `create-rental-order.html` → `deposit-payment.html`).

## Business Rules (BR-03 & Delivery)
- **Rental duration**: `duration_days = max(1, ceil((end_time - start_time) / 86400s))`
- **Rental amount**: `rental_amount = unit_price * duration_days` (rounded to 2 decimal places)
- **Delivery fee**: validated and calculated via `calculate_and_validate_delivery_fee(db, delivery_method, delivery_distance_km, delivery_address)` (`0đ` for `"Nhận tại cửa hàng"`, `base_fee + distance * fee_per_km` within `max_delivery_radius_km` for `"Giao tận nơi"`).
- **Total amount**: `total_amount = rental_amount + delivery_fee`
- **Deposit amount (BR-03)**:
  - Rate from `system_config` key `deposit_rate` (default `30%`).
  - Min deposit: `200,000 VNĐ`, Max deposit: `1,000,000 VNĐ`.
  - Formula: `raw = total_amount * (deposit_rate / 100)`, `clamped = min(max(raw, 200000), 1000000)`.
  - Edge case (`total_amount < 200,000`): cap `deposit_amount = min(clamped, total_amount)` so `remaining_amount` is never negative.
- **Remaining amount (trả khi nhận xe)**: `remaining_amount = total_amount - deposit_amount`.
- **Schedule conflict check**: reject order creation (HTTP 409) if the vehicle already has an active overlapping order (`order_status` not in `{"Đã hủy", "Hoàn thành", "Cancelled", "Completed"}`, `start_time < new_end` and `end_time > new_start`).

## Backend Changes
1. **Model (`backend/app/models/order.py`)**:
   - Add `note = Column(Text, nullable=True)`
   - Add `rental_amount = Column(Numeric(12, 2), default=0)`
   - Add `deposit_amount = Column(Numeric(12, 2), default=0)`
   - Add `remaining_amount = Column(Numeric(12, 2), default=0)`
2. **Migration & SQL**:
   - New Alembic migration `backend/migrations/versions/b3d7f65a44c3_add_order_note_and_br03_amounts.py` (`down_revision = 'a2c6e54f33b2'`).
   - Update `backend/sql/createtable.sql`.
3. **Schemas (`backend/app/schemas/booking_eligibility_schemas.py`)**:
   - Extend `OrderCreateSchema` with `note: Optional[str] = None` (trimmed, max 500 chars).
   - Add `OrderCalculateRequestSchema` (`vehicle_id`, `price_id`, `start_time`, `end_time`, `delivery_method`, `delivery_address`, `delivery_distance_km`) with `end_time > start_time` validation.
4. **Services (`backend/app/services/booking_eligibility_services.py`)**:
   - Add `calculate_deposit_br03(db: Session, total_amount: Decimal) -> dict` returning `deposit_rate`, `deposit_min`, `deposit_max`, `deposit_amount`, `remaining_amount`, `rule_applied`.
   - Add `calculate_order_pricing(db: Session, calc_req: OrderCalculateRequestSchema) -> dict` returning full breakdown (`vehicle_id`, `price_id`, `duration_days`, `unit_price`, `rental_amount`, `delivery_method`, `delivery_address`, `delivery_distance_km`, `delivery_fee`, `total_amount`, `deposit_rate`, `deposit_amount`, `remaining_amount`, `deposit_rule_note`).
   - Update `create_rental_order(db, order_data)` to check active overlapping orders (409), compute BR-03 amounts via `calculate_order_pricing`, persist `note`, `rental_amount`, `deposit_amount`, `remaining_amount`, and return the created `Order`.
   - Add `get_order_by_id(db, order_id) -> Order` (404 if missing).
5. **Router (`backend/app/routers/booking_eligibility_routers.py`)**:
   - Add `POST /orders/calculate` (200) for real-time cost & BR-03 preview.
   - Update `POST /orders` (201) response to include `note`, `rental_amount`, `deposit_amount`, `remaining_amount`.
   - Add `GET /orders/{order_id}` (200) returning full order breakdown.

## Frontend Changes
1. **Create `Frontend/pages/create-rental-order.html`**:
   - Clean VRP-GO layout matching `vehicle-search.html` & `create-rental-order.css`:
     - Vehicle summary card (`#bkImg`, `#bkName`, `#bkType`, `#bkMeta`, `#bkBack`).
     - Rental time selectors (`startDate`, `startHour`, `endDate`, `endHour`).
     - Delivery method radio cards (`Nhận tại cửa hàng` vs `Giao tận nơi`) with conditional delivery address & distance (km) inputs.
     - Customer note textarea (`#bkNote`).
     - Real-time BR-03 cost breakdown panel (`Tiền thuê xe`, `Phí giao nhận`, `Tổng tiền đơn thuê`, `Tiền cọc (BR-03: 30%, 200k–1tr)`, `Trả khi nhận xe`) + countdown hold badge + submit button (`#btn-pay`).
2. **Upgrade `Frontend/js/create-rental-order.js`**:
   - Load vehicle/date/note from URL query + `sessionStorage.vrpSelectedVehicle`.
   - Call `POST http://127.0.0.1:8000/orders/calculate` on any date/delivery/distance change (with local BR-03 calculation fallback when backend is offline or vehicle has no DB `vehicle_id`).
   - On submit (`#btn-pay`), validate delivery address/distance if `Giao tận nơi`, call `POST http://127.0.0.1:8000/orders` when user & vehicle IDs are present (fallback gracefully to client order summary if offline/demo), save full order summary to `sessionStorage.vrpPendingOrder`, and navigate to `deposit-payment.html`.
3. **Update `Frontend/pages/weekly-vehicle-schedule.html` & `Frontend/js/weekly-vehicle-schedule.js`**:
   - Point `#spContinue` to `create-rental-order.html?...` so the booking flow goes `weekly-vehicle-schedule.html` → `create-rental-order.html` → `deposit-payment.html`.
4. **Update `Frontend/js/deposit-payment.js`**:
   - Read `sessionStorage.vrpPendingOrder` (when present) to populate exact `rental_amount`, `delivery_fee`, `deposit_amount`, `remaining_amount`, `total_amount`, `delivery_method`, `start_time`, `end_time`, `note`, and `order_id` on `deposit-payment.html`.
