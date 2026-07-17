# Phase 10 — Webhooks & Integrations
`/api/webhook` (1 endpoint)

See [README.md](./README.md) for the shared response envelope, auth header format, and conventions.

---

## Webhook
Base path: `/api/webhook`

### `POST /api/webhook/razorpay/payment`
Razorpay payment-event webhook (`payment.captured` / `payment.failed`). Verifies `X-Razorpay-Signature` via HMAC-SHA256 using `RAZORPAY_WEBHOOK_SECRET`, then updates the matching `Order` (matched by `paymentLinkId`).
- **Auth:** None (must be publicly reachable by Razorpay) — protected instead by signature verification
- **Headers:** `X-Razorpay-Signature: <hmac-sha256 hex digest of the raw JSON body>`
- **Body:** Razorpay webhook event payload, e.g.:
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": { "entity": { "id","amount","status","method" } },
    "payment_link": { "entity": { "id" } }
  }
}
```
- **Response:** **not wrapped in `ApiResponse`** — `{ "status": "success" }` (`200`), `{ "error": "Invalid signature" }` (`400`), or `{ "error": "Webhook processing failed" }` (`500`)
- **Side effects:** on `payment.captured` with matching amount, sets `order.paymentStatus = "paid"`, `paymentId`, `paymentMethod`, `paidAt`, and bumps `status` from `pending` → `confirmed`; on `payment.failed`, sets `paymentStatus = "failed"`
