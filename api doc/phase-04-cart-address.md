# Phase 4 — Cart & Address
`/api/cart`, `/api/address` (9 endpoints)

See [README.md](./README.md) for the shared response envelope, auth header format, and conventions.

---

## Cart
Base path: `/api/cart`. All routes require **User** auth.

### `GET /api/cart/`
Fetch the caller's cart, with shipping charge computed from the selected/primary address and item weights.
- **Auth:** User
- **Query params:** `addressId` (optional ObjectId — selects a specific address for shipping calc; defaults to the user's primary address)
- **Response `data`:** `{ "data": { ...cart, "shipping_charge": number, "final_price": number }, "total": 0|1 }`
```json
{ "data": { "_id","user","items": [{ "type": "product|bundle","product|bundle","variant_sku","quantity","price","total","addedAt","updatedAt" }],"total_price": number,"is_active": boolean,"shipping_charge": number,"final_price": number },"total": 1 }
```

### `POST /api/cart/`
Add/update an item in the cart.
- **Auth:** User
- **Body:** `{ "type": "product"|"bundle", "product_id"?: "<id>", "bundle_id"?: "<id>", "quantity": number, "variant_sku"?: "string" }` (`product_id` required if `type==="product"`, `bundle_id` required if `type==="bundle"`)
- **Response `data`:** updated cart item/cart doc (`201`), or `null` with message `"Cart is empty"` (`200`) — `400` on missing required fields

### `DELETE /api/cart/:id`
Deletes the cart belonging to the given user id (empties/removes the cart document).
- **Auth:** User
- **Path params:** `id` — **note:** this is actually the `user_id`, not a cart-item id (per controller: `CartService.deleteCart(user_id)`)
- **Response `data`:** `null`

---

## Address
Base path: `/api/address`. All routes require **User** auth.

### `GET /api/address/`
Returns **all** addresses in the system (not scoped to the caller — see note).
- **Auth:** User
- **Response `data`:** array of Address docs

### `GET /api/address/user/:id`
- **Auth:** User
- **Path params:** `id` — a `User` ObjectId
- **Response `data`:** array of that user's addresses, `404`/empty array if none found

### `GET /api/address/:id`
- **Auth:** User
- **Path params:** `id` — Address ObjectId
- **Response `data`:** single Address doc, `404` if not found

### `POST /api/address/`
Creates an address for the caller. First address for a user is auto-set primary; setting `isPrimary: true` unsets any other primary address.
- **Auth:** User
- **Body:** `{ "name","mobile","pincode","address","city","state","isPrimary"? }` (all required except `isPrimary`)
- **Response `data`:** created Address doc — `400` if required fields missing
```json
{ "_id","user","name","mobile","pincode","address","city","state","isPrimary": boolean,"createdAt","updatedAt" }
```

### `PUT /api/address/:id`
Partial update, scoped to the caller's own address.
- **Auth:** User
- **Path params:** `id`
- **Body:** any subset of `{ "name","mobile","pincode","address","city","state","isPrimary" }`
- **Response `data`:** updated Address doc, `404` if not found for this user

### `DELETE /api/address/:id`
- **Auth:** User
- **Path params:** `id`
- **Response `data`:** `null`, `404` if not found
