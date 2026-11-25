# Frontend Vehicle Search & Sort Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect all customer-facing vehicle discovery pages (`vehicle-search.html`, `customer-homepage.html`, `index.html`) to backend `GET /vehicles` via a shared `Frontend/js/vehicle-api.js` helper, fixing dead `vehicle-detail.html` links with an in-page detail modal and graceful offline fallback.

**Architecture:** Extract API query building, `fetch` with timeout, Haversine distance, `sessionStorage` vehicle handoff, and the vehicle detail modal into `Frontend/js/vehicle-api.js` (`window.VRPVehicleAPI`), then wire `vehicle-search.js`, `customer-homepage.js`, and `index.js` to consume it.

**Tech Stack:** Vanilla HTML/CSS/JS (no bundler), FastAPI `GET /vehicles`, Python `pytest` verification.

**Spec:** `docs/superpowers/specs/2026-11-25-frontend-vehicle-search-integration-design.md`

## Global Constraints
- Must work when FastAPI backend runs at `http://127.0.0.1:8000` AND fall back cleanly to local static cards if backend is offline or returns empty baseline.
- Must not break `VRPFavorites`, `VRPDataState`, or `window.__vrpGo`.
- `Frontend/pages/vehicle-detail.html` does not exist; clicking "Chi tiết" must open an in-page modal rather than navigating to a 404 page.

## Review Focus
1. Backend offline / CORS / timeout: `fetchVehicles` must abort cleanly within ~2.2s and fall back to local cards without unhandled promise rejections.
2. Empty DB vs empty filtered result: Empty baseline (`apiMode === null`) falls back to local cards; once API mode is active (`apiMode === true`), a filter returning 0 rows must display the empty state ("Không tìm thấy xe phù hợp"), NOT revert to local cards.
3. XSS safety: All vehicle fields rendered from API (`brand`, `model`, `store_address`, `description`, `license_plate`) must be HTML-escaped.
4. Click interception in `vehicle-search.js` / `index.js`: `document.addEventListener("click", ..., true)` intercepts internal links; modal links (`#chi-tiet-xe`) must start with `#` so navigation scripts don't hijack them.
5. `price` range mapping: `"under-200"` -> `max_price=199999`, `"200-400"` -> `min_price=200000&max_price=400000`, `"over-400"` -> `min_price=400001`.

---

### Task 1: Create Shared Frontend Vehicle API & Modal Helper

**Files:**
- Create: `Frontend/js/vehicle-api.js`

**Interfaces:**
- Produces: `window.VRPVehicleAPI` with `{ API_BASE, DEFAULT_COORDS, FALLBACK_IMG, escapeHtml, formatPrice, haversineKm, buildVehiclesQuery, fetchVehicles, saveSelectedVehicle, openVehicleModal }`.

- [ ] **Step 1: Write `Frontend/js/vehicle-api.js`** implementing all methods in `window.VRPVehicleAPI`, including HTML escaping, `AbortController` fetch timeout, `sessionStorage` sync, and accessible modal dialog (`openVehicleModal`).
- [ ] **Step 2: Verify file exists and has balanced syntax** via Python static check.

---

### Task 2: Connect `vehicle-search.html` & `vehicle-search.js` to `VRPVehicleAPI`

**Files:**
- Modify: `Frontend/pages/vehicle-search.html` (include `../js/vehicle-api.js` before `vehicle-search.js`)
- Modify: `Frontend/js/vehicle-search.js` (consume `VRPVehicleAPI`, hydrate initial filters from URL query params `type`/`brand`/`delivery`/`rating`/`sort`, wire **"Chi tiết"** clicks on both API & local cards to `VRPVehicleAPI.openVehicleModal`, wire **"Thuê xe"** to `VRPVehicleAPI.saveSelectedVehicle`).

**Interfaces:**
- Consumes: `window.VRPVehicleAPI` from Task 1.

- [ ] **Step 1: Add `<script src="../js/vehicle-api.js" defer></script>` to `Frontend/pages/vehicle-search.html`.**
- [ ] **Step 2: Update `Frontend/js/vehicle-search.js`** to delegate query building, fetching, distance calculation, modal preview on "Chi tiết", and vehicle handoff on "Thuê xe" to `window.VRPVehicleAPI`.

---

### Task 3: Connect `customer-homepage.html` & `customer-homepage.js` to `VRPVehicleAPI`

**Files:**
- Modify: `Frontend/pages/customer-homepage.html` (include `../js/vehicle-api.js` before `customer-homepage.js`)
- Modify: `Frontend/js/customer-homepage.js` (connect FR-12/FR-13 filter sidebar + sort select to `VRPVehicleAPI.fetchVehicles(...)` with automatic fallback to local cards, render API cards with delivery tags & distance, bind "Thuê xe" to `saveSelectedVehicle`).

**Interfaces:**
- Consumes: `window.VRPVehicleAPI` from Task 1.

- [ ] **Step 1: Add `<script src="../js/vehicle-api.js" defer></script>` to `Frontend/pages/customer-homepage.html`.**
- [ ] **Step 2: Update `Frontend/js/customer-homepage.js`** FR-12/FR-13 section to call `VRPVehicleAPI.fetchVehicles(...)` and fall back gracefully to local filtering & sorting.

---

### Task 4: Connect `index.html` & `index.js` Featured Fleet to `VRPVehicleAPI`

**Files:**
- Modify: `Frontend/pages/index.html` (include `../js/vehicle-api.js` before `index.js`)
- Modify: `Frontend/js/index.js` (load featured vehicles from `GET /vehicles?sort_by=rating_desc`, render up to 6 cards when DB has vehicles, fall back to static cards otherwise, and use `VRPVehicleAPI.openVehicleModal` / `saveSelectedVehicle`).

**Interfaces:**
- Consumes: `window.VRPVehicleAPI` from Task 1.

- [ ] **Step 1: Add `<script src="../js/vehicle-api.js" defer></script>` to `Frontend/pages/index.html`.**
- [ ] **Step 2: Update `Frontend/js/index.js`** to hydrate `.vehicles-grid` from `VRPVehicleAPI.fetchVehicles({ sort: "rating-desc" })` with fallback to static HTML cards.

---

### Task 5: End-to-End Verification

**Files:**
- Test: `backend/tests/test_vehicle_filter_sort.py` (plus regression suites)
- Verify: Script tag references, JS balanced-syntax & API contract check against `GET /vehicles`.

- [ ] **Step 1: Run full backend pytest verification** (`test_vehicle_filter_sort.py`, `test_tf13d97_age_and_booking_guard.py`, `test_delivery_config_and_fee.py`, `test_vehicle_cloudinary_upload.py`). Expected: 44 passed, 0 failed.
- [ ] **Step 2: Run Python verification script** checking all 3 HTML pages load `../js/vehicle-api.js` before their page script, zero dead `href="vehicle-detail.html"` without handler, and valid balanced JS syntax across all modified `.js` files.
