# Phase 5 — Orders & Payments
`/api/order` (15 endpoints)

See [README.md](./README.md) for the shared response envelope, auth header format, and conventions.

---

## Order
Base path: `/api/order`

### `GET /api/order/export`
Exports all orders to XLSX and uploads the file.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `start_date`, `end_date` (filter `createdAt`)
- **Response:** **not wrapped in `ApiResponse`** — raw `{ "url": "<xlsx url>" }` (`200`), or `{ "error": "Failed to export orders" }` (`500`)

### `GET /api/order/`
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `service_id` (optional, resolves to categories→products), `page` (default `1`), `per_page` (default `50`), `search` (matches `orderNumber` or product name), `start_date`, `end_date`, `status` (one of `pending`,`confirmed`,`processing`,`shipped`,`delivered`,`cancelled`)
- **Response `data`:** `{ "data": [order, ...], "total": number }`

### `POST /api/order/`
Create an order from the caller's cart + a saved address; empties the cart on success; sends confirmation emails async.
- **Auth:** User
- **Body:** `{ "cartId": "<id>", "addressId": "<id>" }`
- **Response `data`:** created Order doc (`201`) — `400` invalid/missing cart or address, empty cart

### `POST /api/order/guest`
Create an order without a user account (checkout as guest).
- **Auth:** None
- **Body:**
```json
{
  "items": [
    { "type": "product", "product_id": "<id>", "quantity": 1 },
    { "type": "bundle", "bundle_id": "<id>", "quantity": 1 }
  ],
  "address": { "name","mobile","pincode","city","state","address"?,"locality"?,"landmark"?,"alternatePhone"?,"addressType"?,"email"? }
}
```
- **Response `data`:** created Order doc (`isGuestOrder: true`) (`201`) — `400` on invalid items/address/product/bundle refs

### `GET /api/order/history`
Order history for the caller.
- **Auth:** User
- **Response `data`:** `{ "data": [order, ...], "total": number }`

### `PATCH /api/order/bulk-status`
Bulk status update across multiple orders.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Body:** `{ "updates": [{ "id": "<orderId>" }, ...], "status": "confirmed" }` (status must be one of the valid enum values)
- **Response `data`:** `{ "total","successful": number,"failed": number,"notFound": number,"details": { "successful": [...],"failed": [...],"notFound": [...] } }`

### `GET /api/order/products-with-orders`
Aggregated per-product order stats (orders/quantity/revenue), including products sold only via bundles.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `page` (default `1`), `per_page` (default `50`), `search`, `status` (optional order-status filter), `sort_by` (`totalOrders`|`totalQuantity`|`totalRevenue`|`totalDiscountedRevenue`, default `totalOrders`), `sort_order` (`asc`|`desc`, default `desc`)
- **Response `data`:** `{ "data": [{ "product": {...},"totalOrders","totalQuantity","totalRevenue","totalDiscountedRevenue" }],"total": number }`

### `GET /api/order/by-product/:productId`
Orders (direct or via bundle) containing a given product, with stats.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `productId`
- **Query params:** `status` (optional filter)
- **Response `data`:** `{ "product","totalOrders","totalQuantity","totalRevenue","totalDiscountedRevenue","orders": [order, ...] }`

### `GET /api/order/:id/email-status`
Email delivery/open/click tracking summary for an order.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** `{ "orderId","orderStatus","orderDate","confirmation": { "status","queuedAt","sentAt","deliveredAt","bouncedAt","failedAt","opened","openedAt","openCount","clicked","clickedAt","clickCount","attempts","lastAttempt","error" },"statusUpdates": [...],"summary": { "totalEmailsSent","totalEmailsFailed","totalEmailsOpened","totalEmailsClicked","lastEmailSent" } }`

### `PATCH /api/order/:id`
General-purpose order editor: add/update products & bundles, change address, override or recalculate shipping, update notes.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Body (all optional, applied additively):**
```json
{
  "status": "confirmed",
  "addressId": "<id>",
  "addProducts": [{ "productId": "<id>", "quantity": 1 }],
  "products": [{ "productId": "<id>", "newQuantity": 2 }],
  "addBundles": [{ "bundleId": "<id>", "quantity": 1 }],
  "bundles": [{ "bundleId": "<id>", "newQuantity": 2 }],
  "shippingCost": 50,
  "deliveryZoneId": "<id>",
  "notes": "string"
}
```
- **Response `data`:** updated Order doc — `400` on invalid ids/quantities/duplicate items, `404` not found

### `PATCH /api/order/:id/status`
Dedicated status-only update; sends a status-update email async.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Body:** `{ "status": "pending"|"confirmed"|"processing"|"shipped"|"delivered"|"cancelled" }`
- **Response `data`:** updated Order doc — `400` invalid/missing status, `404` not found

### `PATCH /api/order/edit/:id`
Caller edits their own **pending** order (items/address); recalculates totals & shipping.
- **Auth:** User
- **Path params:** `id`
- **Body:** `{ "addressId"?: "<id>", "items"?: [{ "type": "product"|"bundle", "product"|"bundle": "<id>", "quantity": number }] }`
- **Response `data`:** updated Order doc — `400` if order isn't `pending` or address/items invalid, `404` not found for this user

### `GET /api/order/:id`
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** single Order doc, `404` if not found

### `GET /api/order/user/:id`
Fetch a single order by id (despite the path, it does **not** filter by user — any authenticated user can fetch any order id here).
- **Auth:** User
- **Path params:** `id` — Order ObjectId
- **Response `data`:** single Order doc, `404` if not found

### `POST /api/order/generate-payment-link`
Creates a Razorpay payment link for an order.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Body:** `{ "orderId": "<id>", "amount": number }`
- **Response `data`:** `{ "paymentLink": "<short_url>","paymentLinkId","orderId","amount" }` — `400` invalid input/Razorpay error, `404` order not found

---

**Order document shape** (returned by most endpoints above):
```json
{
  "_id","orderNumber": 1001,"user": "<id>|null","isGuestOrder": boolean,
  "guestInfo": { "email","name","mobile" },
  "items": [{ "type": "product|bundle","product|bundle": {...snapshot...},"quantity","total_amount": number,"discounted_total_amount": number }],
  "address": { "name","mobile","pincode","locality","address","city","state","landmark","alternatePhone","addressType" },
  "totalAmount": number,"discountedTotalAmount": number,"shippingCost": number,
  "shippingDetails": { "deliveryZoneId","zoneName","pricingType","isManual","calculatedAt" },
  "finalTotalAmount": number,
  "emailTracking": { "confirmation": {...},"statusUpdates": [...] },
  "status": "pending","paymentLink","paymentLinkId","paymentStatus": "pending|paid|failed|cancelled","paymentId","paymentMethod","paidAt",
  "createdAt","updatedAt"
}
```
