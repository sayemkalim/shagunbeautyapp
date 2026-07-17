# Phase 8 — Delivery & Shipping
`/api/delivery-zone` (8 endpoints)

See [README.md](./README.md) for the shared response envelope, auth header format, and conventions.

---

## Delivery Zone
Base path: `/api/delivery-zone`

### `GET /api/delivery-zone/calculate`
Public shipping-price calculator for a pincode + weight (used at checkout).
- **Auth:** None
- **Query params:** `pincode` (required), `weight_in_grams` (required, > 0)
- **Response `data`:** `{ success, delivery_price, zone info... }` (from `DeliveryZoneService.calculateDeliveryPrice`) — `400` missing params, `404` if no matching/active zone

### `POST /api/delivery-zone/check-duplicates`
Checks whether given pincodes already belong to another zone.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Body:** `{ "pincodes": ["string", ...] | "comma,separated,string", "exclude_zone_id"?: "<id>" }`
- **Response `data`:** `{ "has_duplicates": boolean, "duplicates": [...] }`

### `GET /api/delivery-zone/`
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `page` (default `1`), `per_page` (default `50`), `search` (default `""`), `sort` (default `"latest"`), `is_active` (`"true"`/`"false"`)
- **Response `data`:** paged delivery zone list

### `POST /api/delivery-zone/`
Create a delivery zone. Required fields depend on `pricing_type`.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Body:**
```json
{
  "zone_name": "string",
  "pincodes": ["110001", "110002"],
  "pricing_type": "free | flat_rate | fixed_rate | flat_rate_plus_dynamic",
  "weight_unit_grams": 500,
  "price": 40,
  "flat_rate_base": 20,
  "min_weight_grams": 1000,
  "fixed_amount": 99,
  "is_active": true,
  "description": "string"
}
```
  (`weight_unit_grams`+`price` required for `flat_rate`/`flat_rate_plus_dynamic`; `flat_rate_base`+`min_weight_grams` additionally required for `flat_rate_plus_dynamic`; `fixed_amount` required for `fixed_rate`)
- **Response `data`:** created DeliveryZone doc (`201`) — `400` validation errors, `409` duplicate zone name or pincodes (`data: { duplicates }`)

### `GET /api/delivery-zone/:id`
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** single DeliveryZone doc, `404` if not found

### `PUT /api/delivery-zone/:id`
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Body:** any subset of the create-body fields
- **Response `data`:** updated DeliveryZone doc — `409` duplicate name/pincodes, `404` not found

### `DELETE /api/delivery-zone/:id`
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** `null`, `404` if not found

### `PUT /api/delivery-zone/:id/set-default`
Marks this zone as the default (fallback) delivery zone.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** updated DeliveryZone doc (`is_default: true`), `404` if not found

---

**DeliveryZone document shape:**
```json
{ "_id","zone_name","pincodes": ["..."],"pricing_type","weight_unit_grams","price","flat_rate_base","min_weight_grams","fixed_amount","is_default": boolean,"is_active": boolean,"description","createdAt","updatedAt" }
```
