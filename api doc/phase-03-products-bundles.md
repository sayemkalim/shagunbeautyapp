# Phase 3 — Products & Bundles
`/api/product`, `/api/bundles` (21 endpoints)

See [README.md](./README.md) for the shared response envelope, auth header format, and conventions.

---

## Product
Base path: `/api/product`

### `POST /api/product/`
Create a product (with optional variants). Requires a unique `sku`.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Form-data fields:**
  - `images` (files, multiple) — product gallery
  - `banner_image` (file, single)
  - `variants[<idx>][images]` (files) — per-variant images, `<idx>` matching the variant's index in the `variants` array
  - Body fields: `name` (required), `sku` (required, unique), `small_description`, `full_description`, `price` (required, number), `discounted_price`, `tags` (array of enum: `no_palm_oil`,`organic`,`no_gmo`,`no_aritificial_flavors`,`vegan`,`sugar_free`,`gluten_free`,`soya_free`,`no_preservatives`,`lactose_free`,`no_flavor_enhancer`), `inventory` (0 or 1, default 0), `status` (`published`|`draft`), `weight_in_grams`, `manufacturer`, `consumed_type`, `expiry_date`, `brand` (ObjectId ref Brand), `sub_category` (ObjectId ref SubCategory, required), `is_best_seller`, `is_imported_picks`, `is_bakery`, `celiacFriendly` (booleans), `meta_data` (JSON string), `variants` (JSON string array: `[{ "sku","name","attributes","price","discounted_price","inventory","images" }]`)
- **Response `data`:** created Product doc (`201`) — `404` no images/banner, `400` missing/duplicate `sku` or bad JSON
```json
{ "_id","name","sku","price": 199.0,"discounted_price": 149.0,"tags": [],"inventory": 0,"status": "draft","banner_image": "url","images": ["url"],"variants": [{ "sku","name","attributes": {},"price": 0,"discounted_price": null,"inventory": 0,"images": [] }],"sub_category": "<id>","brand": "<id>|null","created_by_admin": "<id>","createdAt","updatedAt" }
```

### `GET /api/product/`
Public product catalog with filters. Decimal128 price fields are converted to numbers.
- **Auth:** None
- **Query params:** `page` (default `1`), `per_page` (default `10`), `price_range`, `category` (ObjectId or comma-separated list), `rating`, `sub_category` (ObjectId or comma-separated list), `is_best_seller`, `is_imported_picks`, `is_bakery`, `search`, `brands` (ObjectId or comma-separated list), `sort_by` (default `"created_at"`)
- **Response `data`:** `{ "data": [product, ...], ...(pagination meta from service) }`

### `GET /api/product/export`
Exports all products (flattened per-variant) to XLSX/CSV, uploads the file, and returns a download URL.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `fileType` (`"xlsx"` default | `"csv"`), `start_date`, `end_date` (filter by `createdAt`)
- **Response `data`:** `{ "url", "mimeType", "filename" }` — `400` unsupported fileType

### `GET /api/product/sample`
Generates a downloadable product-import template (XLSX/CSV) prefilled with category/sub-category dropdown options.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `fileType` (`"xlsx"` default | `"csv"`)
- **Response `data`:** `{ "url","mimeType","filename","categories": number,"subCategories": number,"instructions","columns": number,"dropdownSetup" }`

### `GET /api/product/admin`
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `page` (default `1`), `per_page` (default `10`), `search`
- **Response `data`:** products created by the calling admin

### `GET /api/product/recommendations`
- **Auth:** None
- **Query params:** `product_id` (required, ObjectId), `page` (default `1`), `per_page` (default `10`)
- **Response `data`:** related-products result from service — `400` if missing/invalid `product_id`

### `GET /api/product/check-purchased`
Checks whether the authenticated user has purchased a given product.
- **Auth:** User
- **Query params:** `product_id` (required, ObjectId)
- **Response `data`:** `{ "is_purchased": boolean, "product_id": "<id>" }` — `401` if unauthenticated, `400` if missing/invalid id

### `POST /api/product/migrate-images/all`
Bulk-migrates any non-Cloudinary image URLs (banner/gallery/variants) across products to Cloudinary.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `limit` (default `10`) — max products processed per call
- **Response `data`:** `{ "total_products_processed","total_images_migrated","products": [{ "product_id","product_name","images_migrated","errors": [] }],"remaining_products": number }`

### `POST /api/product/migrate-images/:id`
Migrates one product's images to Cloudinary.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** `{ "product_id","product_name","total_images_migrated","migration_details": { "banner_image": {...}, "images": [...], "variants": [...] } }` — `404` not found

### `GET /api/product/:id`
- **Auth:** None
- **Path params:** `id`
- **Response `data`:** single Product doc, `404` if not found, `400` invalid id

### `PUT /api/product/:id`
Update a product. Existing image URLs can be passed as strings in `images`/`banner_image`/`variant.images` to keep them; new files uploaded via the same field names replace/augment them.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Path params:** `id`
- **Form-data fields:** same shape as create (all optional/partial)
- **Response `data`:** updated Product doc, `404` not found

### `DELETE /api/product/:id`
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** `null`, `404` if not found

### `POST /api/product/bulk`
Bulk-create products (e.g. from a parsed import file).
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Body:** array of product objects (same fields as single create, JSON not multipart)
- **Response `data`:** per-row batch result from `ProductsServices.bulkCreateProducts` (`207 Multi-Status`) — `400` if body isn't a non-empty array

### `PATCH /api/product/bulk-update`
Bulk-update `status`/`inventory` only, on a set of products.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Body:** `{ "productIds": ["<id>", ...], "updates": { "status"?: "published"|"draft", "inventory"?: 0|1 } }`
- **Response `data`:** `{ "updated": number, "productIds": [...] }` — `400` on invalid ids, disallowed update fields, or invalid values

---

## Bundle
Base path: `/api/bundles`

### `POST /api/bundles/`
Create a bundle of products (with optional per-product variant selection).
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Form-data fields:** `images` (files), `name` (required), `description`, `price` (required), `discounted_price`, `is_active` (bool), `is_best_seller` (bool), `meta_data` (JSON string), `products` (JSON string array: `[{ "product": "<productId>", "variant_sku"?: "string", "quantity": 1 }]` — `variant_sku` required if the referenced product has variants)
- **Response `data`:** created Bundle doc (`201`) — `400` if a referenced product/variant_sku is invalid
```json
{ "_id","name","description","products": [{ "product","variant_sku","quantity": 1 }],"price": number,"discounted_price": number|null,"images": [],"is_active": true,"is_best_seller": false,"meta_data": {},"created_by_admin","createdAt","updatedAt" }
```

### `GET /api/bundles/`
- **Auth:** None
- **Query params:** `page` (default `1`), `per_page` (default `50`), `price_range`, `category`, `rating`, `sub_category`, `is_best_seller`, `search`, `brands`, `sort_by` (default `"created_at"`), `is_active`
- **Response `data`:** `{ "data": [bundle, ...], ...(pagination meta) }` — Decimal128 prices converted to numbers for bundle + nested products/variants

### `GET /api/bundles/export`
Exports bundles (flattened per-product) to XLSX/CSV.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `fileType` (`"xlsx"` default | `"csv"`), `start_date`, `end_date`
- **Response `data`:** `{ "url","mimeType","filename" }`

### `GET /api/bundles/sample`
Generates a bundle-import template file with product dropdown options.
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `fileType` (`"xlsx"` default | `"csv"`)
- **Response `data`:** `{ "url","mimeType","filename","categories","subCategories","products","instructions","columns" }`

### `GET /api/bundles/:id`
- **Auth:** None
- **Path params:** `id`
- **Response `data`:** single Bundle doc, `404` if not found, `400` invalid id

### `PUT /api/bundles/:id`
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Path params:** `id`
- **Form-data fields:** same as create, optional/partial
- **Response `data`:** updated Bundle doc, `404` if not found

### `DELETE /api/bundles/:id`
- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** `null`, `404` if not found
