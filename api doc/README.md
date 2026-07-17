# The Celiac Store — Backend API Documentation (Phased)

This folder documents every REST endpoint exposed by the `theceliacstore-BE` Express server (`server.js`), split into 10 phases of related modules. All paths below are relative to the server's mount point (e.g. `http://localhost:5000`).

## Conventions (apply to every phase file)

**Response envelope** — every endpoint responds with the same JSON envelope, produced by `utils/ApiResponse.js`:

```json
{
  "statusCode": 200,
  "data": { "...": "endpoint-specific payload, or null" },
  "message": "Human readable message",
  "success": true
}
```

Only the endpoint-specific `data` shape is documented per-endpoint in each phase file; the wrapper is always the same. Several controllers call `res.json(...)` without setting the HTTP status via `res.status()`, so the actual HTTP status code may be `200` even when `statusCode` in the body says `400`/`404`/etc. — always check `success`/`statusCode` in the body, not just the HTTP status.

**Content type** — all requests/responses are `application/json` **except** endpoints that accept file uploads via `multer`, which require `multipart/form-data` (noted per-endpoint).

**Authentication** — protected routes require:

```
Authorization: Bearer <JWT>
```

Two independent token spaces exist — a user token (from `/api/auth/user/login`) and an admin/super-admin token (from `/api/auth/admin/login` or `/api/auth/super-admin`):

- **User auth** (`middleware/auth/userMiddleware.js`): any valid user JWT is accepted, populates `req.user`. Labeled **User** below.
- **Admin auth** (`middleware/auth/adminMiddleware.js`): JWT must belong to an `Admin` document whose `role` is in the route's allowed list, populates `req.admin`. Labeled **Admin (roles: ...)** below. Roles are `admin`, `sub_admin`, `super_admin`.

Some routes are marked in source as "DEVELOPMENT API's" and have **no auth middleware** at all — these are flagged explicitly.

**Mongo ObjectId validation** — most `:id` params are validated with `mongoose.Types.ObjectId.isValid()`; invalid IDs return `400` with `data: null`.

---

## Phases (115 endpoints total)

| Phase | File                                                                    | Modules                                        | Endpoints |
| ----- | ----------------------------------------------------------------------- | ---------------------------------------------- | --------- |
| 1     | [phase-01-authentication.md](./phase-01-authentication.md)               | Auth - User, Auth - Admin, Auth -/ Super Admin | 21        |
| 2     | [phase-02-catalog-taxonomy.md](./phase-02-catalog-taxonomy.md)           | Category, Sub-Category, Brand                  | 17        |
| 3     | [phase-03-products-bundles.md](./phase-03-products-bundles.md)           | Product, Bundle                                | 21        |
| 4     | [phase-04-cart-address.md](./phase-04-cart-address.md)                   | Cart, Address                                  | 9         |
| 5     | [phase-05-orders-payments.md](./phase-05-orders-payments.md)             | Order                                          | 15        |
| 6     | [phase-06-content-engagement.md](./phase-06-content-engagement.md)       | Reviews, Blogs, Contact Us                     | 10        |
| 7     | [phase-07-dashboard-analytics.md](./phase-07-dashboard-analytics.md)     | Dashboard                                      | 5         |
| 8     | [phase-08-delivery-shipping.md](./phase-08-delivery-shipping.md)         | Delivery Zone                                  | 8         |
| 9     | [phase-09-email-notifications.md](./phase-09-email-notifications.md)     | Email, Email Tracking                          | 8         |
| 10    | [phase-10-webhooks-integrations.md](./phase-10-webhooks-integrations.md) | Webhook                                        | 1         |

Grouping rationale: phases follow the natural build/consumption order of the store — identity & access first, then catalog structure, then sellable items, then the shopping flow (cart → order → payment), then supporting content, then internal ops tooling (analytics, shipping config, email ops, third-party webhooks).
