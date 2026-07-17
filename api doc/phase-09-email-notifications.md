# Phase 9 — Email & Notifications
`/api/email`, `/api/email-tracking` (8 endpoints)

See [README.md](./README.md) for the shared response envelope, auth header format, and conventions.

---

## Email
Base path: `/api/email`. **Note:** the route file imports `adminOrSubAdminOrSuperAdmin` middleware but never attaches it to any route — all endpoints below are currently reachable with **no authentication** despite being admin-facing utilities.

### `POST /api/email/send-custom`
Send an arbitrary email.
- **Auth:** None (middleware imported but unused)
- **Body:** `{ "to": "string", "subject": "string", "html"?: "string", "text"?: "string" }` (one of `html`/`text` required)
- **Response `data`:** `{ "messageId": "string" }` — `400` missing fields, `500` send failure

### `POST /api/email/send-test`
- **Auth:** None
- **Body:** `{ "to": "string" }`
- **Response `data`:** `{ "messageId": "string" }` — `400` missing `to`, `500` send failure

### `POST /api/email/resend-order-confirmation`
- **Auth:** None
- **Body:** `{ "orderId": "<id>" }`
- **Response `data`:** `null` — `400` missing/invalid id, `404` order/user not found, `500` send failure

### `POST /api/email/resend-status-update`
Resends the status-update email for an order's **current** status (order status must already equal `status`).
- **Auth:** None
- **Body:** `{ "orderId": "<id>", "status": "string" }`
- **Response `data`:** `null` — `400` missing fields / status mismatch, `404` order/user not found

### `POST /api/email/resend-welcome`
- **Auth:** None
- **Body:** `{ "userId": "<id>" }`
- **Response `data`:** `null` — `400` missing/invalid id, `404` user not found

### `GET /api/email/failed-emails`
Lists orders with failed confirmation or status-update emails, for manual resend triage.
- **Auth:** None
- **Response `data`:**
```json
{
  "confirmation": [{ "orderId","user": { "name","email" },"failedAt","error","attempts" }],
  "statusUpdates": [{ "orderId","user": { "name","email" },"status","failedAt","error","attempts" }]
}
```

---

## Email Tracking
Base path: `/api/email-tracking`. Both endpoints are embedded in outgoing emails (image pixel / link redirects) and intentionally require **no auth**.

### `GET /api/email-tracking/pixel/:orderId/:emailType`
1×1 transparent GIF tracking pixel; marks the referenced order's email as opened.
- **Auth:** None
- **Path params:** `orderId` (ObjectId), `emailType` (`"confirmation"` or `"status-<status>"`, e.g. `"status-shipped"`)
- **Response:** raw `image/gif` binary (not JSON), always `200` regardless of tracking outcome

### `GET /api/email-tracking/click/:orderId/:emailType`
Records a link click then 302-redirects to the target URL.
- **Auth:** None
- **Path params:** `orderId`, `emailType` (same as above)
- **Query params:** `url` (required — URL-encoded redirect target)
- **Response:** HTTP redirect to `decodeURIComponent(url)`; `400` plain-text `"Missing redirect URL"` if `url` absent
