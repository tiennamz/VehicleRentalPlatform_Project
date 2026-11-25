# Design Spec: Frontend Integration for Vehicle Filtering & Sorting

**Date:** 2026-11-25  
**Approach Selected:** Approach A — Full customer vehicle discovery flow (`vehicle-search.html`, `customer-homepage.html`, `index.html`) backed by a shared API helper `Frontend/js/vehicle-api.js`.

## Intent & Why
Backend `GET /vehicles` now supports multi-criteria filtering (vehicle type, price range, brand, delivery method, minimum rating, date availability, max distance) and sorting (price, rating, Haversine distance). To make this usable end-to-end without duplicated fetch logic or broken links, all three existing customer-facing vehicle pages need to share one API client and render consistent real-time data (with automatic fallback to local cards when the backend is offline or unseeded).

## Key Codebase Finding
- `Frontend/pages/vehicle-detail.html` does **not** exist in the repository (`index.js` already uses an in-page modal `#chi-tiet-xe` instead of navigating to `vehicle-detail.html`, whereas `vehicle-search.html` still had dead `<a href="vehicle-detail.html">` links).
- Solution: Provide a shared preview modal in `Frontend/js/vehicle-api.js` so clicking **"Chi tiết"** on `vehicle-search.html` (and `index.html`) opens a rich detail dialog displaying real vehicle data (rating, reviews, store name/address, distance, delivery methods, specs, daily price, and direct "Thuê xe" CTA) instead of 404ing.

## Goals
1. Create `Frontend/js/vehicle-api.js` exposing `window.VRPVehicleAPI`:
   - `API_BASE` (`http://127.0.0.1:8000`, overridable via `window.VRP_API_BASE`)
   - `DEFAULT_COORDS` (`{ lat: 16.0678, lng: 108.2208 }`, Đà Nẵng center)
   - `haversineKm(lat1, lon1, lat2, lon2)`
   - `buildVehiclesQuery(filters)` mapping UI filters (`types`, `brands`, `deliveries`, `price`, `minRating`, `city`, `sort`, `userLat`, `userLng`, `startTime`, `endTime`) to `GET /vehicles` query params
   - `fetchVehicles(filters, timeoutMs)` calling `GET /vehicles` with `AbortController` timeout
   - `formatPrice(amount)` and `saveSelectedVehicle(vehicle)` (syncing `sessionStorage` for `weekly-vehicle-schedule.html` / `create-rental-order.html`)
   - `openVehicleModal(vehicle, extraParams)` rendering an accessible detail modal with delivery badges, distance, rating, specs, and rent button
2. Connect **`Frontend/pages/vehicle-search.html` + `Frontend/js/vehicle-search.js`**:
   - Include `<script src="../js/vehicle-api.js" defer></script>`.
   - Use `VRPVehicleAPI` for API calls, Haversine fallback, URL query param hydration (`?type=...&brand=...&sort=...`), and open `VRPVehicleAPI.openVehicleModal(...)` when clicking **Chi tiết**.
3. Connect **`Frontend/pages/customer-homepage.html` + `Frontend/js/customer-homepage.js`**:
   - Include `<script src="../js/vehicle-api.js" defer></script>`.
   - Connect FR-12/FR-13 filter sidebar and sort select to `VRPVehicleAPI.fetchVehicles(...)` with automatic fallback to local cards when backend is unreachable or empty; render delivery badges and distance (`km`), and bind **Thuê xe** to `VRPVehicleAPI.saveSelectedVehicle(...)`.
4. Connect **`Frontend/pages/index.html` + `Frontend/js/index.js`**:
   - Include `<script src="../js/vehicle-api.js" defer></script>`.
   - Load featured vehicles from `VRPVehicleAPI.fetchVehicles({ sort: "rating-desc" })` (top 6) with graceful fallback to existing static cards, preserving modal preview & rent flow.

## Non-Goals / Constraints
- Do not modify `store-registration.html` (separate mock partner onboarding flow).
- Must work both when FastAPI is running on `http://127.0.0.1:8000` AND when opened statically without backend (zero broken UI or uncaught errors).
- Preserve existing `VRPFavorites`, `VRPDataState`, and `window.__vrpGo` navigation compatibility.
