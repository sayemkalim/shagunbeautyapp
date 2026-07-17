# Phase 7 — Dashboard & Analytics
`/api/dashboard` (5 endpoints)

See [README.md](./README.md) for the shared response envelope, auth header format, and conventions.

---

## Dashboard
Base path: `/api/dashboard`. All routes require **Admin** (roles: `admin`, `super_admin`) and accept the same query params.

- **Query params (all endpoints):** `startDate`, `endDate` (optional date-range filters passed through to the repository layer)

### `GET /api/dashboard/overview`
High-level dashboard summary cards.
- **Response `data`:** object of summary metrics (order counts, revenue totals, etc. — exact shape defined in `repositories/dashboard/index.js`)

### `GET /api/dashboard/sales-overview`
Data for a sales bar chart.
- **Response `data`:** time-series/grouped sales data

### `GET /api/dashboard/monthly-growth`
Data for a monthly growth line chart.
- **Response `data`:** month-over-month growth series

### `GET /api/dashboard/category-distribution`
Data for a category distribution pie chart.
- **Response `data`:** array of `{ category, value }`-style breakdown

### `GET /api/dashboard/revenue-trend`
Data for a revenue trend line chart.
- **Response `data`:** time-series revenue data

*(All five simply proxy to `services/dashboard` → `repositories/dashboard`; response is whatever aggregation that repository returns, wrapped in the standard envelope.)*
