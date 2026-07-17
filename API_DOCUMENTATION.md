# The Celiac Store — Backend API Documentation

This document covers every REST endpoint exposed by the `theceliacstore-BE` Express server (`server.js`). All paths below are relative to the server's mount point (e.g. `http://localhost:5000`).

## Conventions

**Response envelope** — every endpoint responds with the same JSON envelope, produced by `utils/ApiResponse.js`:

```json
{
  "statusCode": 200,
  "data": { /* endpoint-specific payload, or null */ },
  "message": "Human readable message",
  "success": true
}
```

Only the endpoint-specific `data` shape is documented per-endpoint below; the wrapper is always the same. Note several controllers call `res.json(...)` without setting the HTTP status via `res.status()`, so the actual HTTP status code may be `200` even when `statusCode` in the body says `400`/`404`/etc. — always check `success`/`statusCode` in the body, not just the HTTP status.

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

## Table of Contents

1. [Auth - User](#auth---user) — `/api/auth/user`
2. [Auth - Admin](#auth---admin) — `/api/auth/admin`
3. [Auth - Super Admin](#auth---super-admin) — `/api/auth/super-admin`
4. [Category](#category) — `/api/category`
5. [Sub-Category](#sub-category) — `/api/sub-category`
6. [Brand](#brand) — `/api/brand`
7. [Product](#product) — `/api/product`
8. [Cart](#cart) — `/api/cart`
9. [Reviews](#reviews) — `/api/reviews`
10. [Address](#address) — `/api/address`
11. [Blogs](#blogs) — `/api/blogs`
12. [Contact Us](#contact-us) — `/api/contact-us`
13. [Order](#order) — `/api/order`
14. [Bundle](#bundle) — `/api/bundles`
15. [Dashboard](#dashboard) — `/api/dashboard`
16. [Delivery Zone](#delivery-zone) — `/api/delivery-zone`
17. [Email Tracking](#email-tracking) — `/api/email-tracking`
18. [Email](#email) — `/api/email`
19. [Webhook](#webhook) — `/api/webhook`

---

## Auth - User

Base path: `/api/auth/user`

### `GET /api/auth/user/`

Get a paginated, searchable list of all users.

- **Auth:** Admin (role: `super_admin`)
- **Headers:** `Authorization: Bearer <admin JWT>`
- **Query params:** `search` (string, optional — matches `name`/`email` regex), `page` (number), `per_page` (number, default `50`)
- **Response `data`:** array of user objects (password excluded)

```json
[{ "_id": "...", "name": "...", "email": "...", "phone": "...", "createdAt": "...", "updatedAt": "..." }]
```

### `POST /api/auth/user/register`

Register a new user; sends a welcome email asynchronously.

- **Auth:** None
- **Body:** `{ "name": "string", "email": "string", "phone": "string", "password": "string" }`
- **Response `data`:** `{ "id", "name", "email", "token" }` (`201`) — `400` if email or phone already exists

### `POST /api/auth/user/login`

- **Auth:** None
- **Body:** `{ "email": "string", "password": "string" }`
- **Response `data`:** `{ "id", "name", "email", "token", "phone" }` (`200`) — `401` on invalid credentials

### `POST /api/auth/user/google`

Google OAuth login/registration. Verifies the ID token server-side, links to existing account by email or creates a new one.

- **Auth:** None
- **Body:** `{ "idToken": "string" }` (Google ID token from client-side Google Sign-In)
- **Response `data`:** `{ "id", "name", "email", "phone", "profilePicture", "authProvider", "token" }` — `400` if no idToken/email, `401` on invalid/expired token

### `POST /api/auth/user/forgot-password`

Generates a random password, saves it (hashed), and emails the plaintext password to the user.

- **Auth:** None
- **Body:** `{ "email": "string" }`
- **Response `data`:** `null` — `404` if no user with that email

### `GET /api/auth/user/:id`

- **Auth:** None (no middleware applied)
- **Path params:** `id` — user ObjectId
- **Response `data`:** single user object (password excluded), `404` if not found

### `PATCH /api/auth/user/:id`

Partial update of a user's own profile fields.

- **Auth:** None (no middleware applied)
- **Path params:** `id`
- **Body:** `{ "name"?, "email"?, "phone"? }` (all optional, partial update)
- **Response `data`:** updated user object

### `DELETE /api/auth/user/:id`

Marked "DEVELOPMENT API" in source — no auth middleware.

- **Auth:** None
- **Path params:** `id`
- **Response `data`:** `null`, `404` if not found

---

## Auth - Admin

Base path: `/api/auth/admin`

### `GET /api/auth/admin/`

- **Auth:** Admin (role: `super_admin`)
- **Query params:** `search` (default `""`), `page` (default `1`), `per_page` (default `50`)
- **Response `data`:** `{ "data": [admin, ...], "total": number }` (password excluded)

### `POST /api/auth/admin/register`

- **Auth:** None
- **Body:** `{ "name", "email", "password", "role" }` (`role` e.g. `"admin"`, `"sub_admin"`, `"super_admin"`)
- **Response `data`:** `{ "id", "name", "email", "token", "role" }` (`201`) — `400` if email exists

### `POST /api/auth/admin/login`

- **Auth:** None
- **Body:** `{ "email", "password" }`
- **Response `data`:** `{ "id", "name", "email", "role", "token" }` — `401` on invalid credentials

### `GET /api/auth/admin/sub-admin`

List sub-admins created by the calling admin.

- **Auth:** Admin (role: `admin`)
- **Response `data`:** array of sub-admin docs (`role: "sub_admin"`, `created_by: <admin _id>`), password excluded

### `POST /api/auth/admin/sub-admin`

Create a sub-admin under the calling admin. Only callers whose own role is exactly `"admin"` may create one.

- **Auth:** Admin (role: `admin`)
- **Body:** `{ "name", "email", "password", "role" }` (role is forced to `"sub_admin"` server-side regardless of body)
- **Response `data`:** `{ "id", "name", "email", "token", "role", "created_by" }` (`201`) — `400` if caller isn't `admin` role or email exists

### `GET /api/auth/admin/:id`

- **Auth:** Admin (role: `super_admin`)
- **Path params:** `id`
- **Response `data`:** single admin object, `404` if not found

### `PATCH /api/auth/admin/edit/:id`

Marked "DEVELOPMENT API" — no auth middleware.

- **Auth:** None
- **Path params:** `id`
- **Body:** `{ "name"?, "email"?, "role"? }` (partial update)
- **Response `data`:** updated admin

### `DELETE /api/auth/admin/delete/:id`

Marked "DEVELOPMENT API" — no auth middleware.

- **Auth:** None
- **Path params:** `id`
- **Response `data`:** `null`

---

## Auth - Super Admin

Base path: `/api/auth/super-admin`. **All routes gated by `router.use(superAdmin)`** (role must be `super_admin`).

### `GET /api/auth/super-admin/get-admin/:id`

- **Path params:** `id`
- **Response `data`:** single super-admin doc, `404` if not found/not a super_admin

### `PATCH /api/auth/super-admin/update/:id`

- **Path params:** `id`
- **Body:** `{ "name"?, "email"?, "password"? }` (password re-hashed via pre-save hook)
- **Response `data`:** updated super-admin (password excluded)

### `DELETE /api/auth/super-admin/delete/:id`

Cannot delete yourself.

- **Path params:** `id`
- **Response `data`:** `null` — `400` if `id` matches the caller's own `_id`; `404` if target not found

### `GET /api/auth/super-admin/get-all`

- **Query params:** `search` (default `""`), `page` (default `1`), `per_page` (default `50`)
- **Response `data`:** `{ "data": [superAdmin, ...], "total": number }`

### `POST /api/auth/super-admin/register`

- **Body:** `{ "name", "email", "password" }` (role forced to `"super_admin"`)
- **Response `data`:** `{ "id", "name", "email", "role" }` (`201`) — `400` if email exists

---

## Category

Base path: `/api/category`

### `POST /api/category/`

Create a category with images.

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Form-data fields:** `images` (files, multiple, field name `images`), plus body fields: `name` (string, required), `description` (string), `discount_label_text` (string), `newly_launched` (bool), `is_active` (bool), `meta_data` (JSON string, parsed server-side)
- **Response `data`:** created Category doc (`201`) — `404` if no images provided

```json
{ "_id","name","description","discount_label_text","meta_data": {},"newly_launched": false,"is_active": true,"images": ["url1","url2"],"createdAt","updatedAt" }
```

### `GET /api/category/`

Public listing.

- **Auth:** None
- **Query params:** `service_id` (optional), `page` (default `1`), `per_page` (default `50`), `search` (default `""`), `sort` (default `"latest"`)
- **Response `data`:** `{ "total": number, ...(service result, typically array/paged data) }`

### `GET /api/category/admin`

Categories created by/scoped to the calling admin.

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `page` (default `1`), `per_page` (default `50`), `search` (default `""`)
- **Response `data`:** category list result from `CategoryService.getCategoriesByAdmin`

### `PUT /api/category/:id`

Update a category; optionally replace images.

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Path params:** `id`
- **Form-data fields:** same as create, all optional; `images` files replace `images` array if provided
- **Response `data`:** updated Category doc — `400` invalid id / bad `meta_data` JSON, `404` not found

### `GET /api/category/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** single Category doc, `404` if not found

### `DELETE /api/category/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** `null`, `404` if not found

---

## Sub-Category

Base path: `/api/sub-category`

### `POST /api/sub-category/`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Form-data fields:** `images` (files), `name` (required), `description`, `category` (ObjectId ref `Category`, required), `is_active` (bool), `meta_data` (JSON string)
- **Response `data`:** created SubCategory doc (`201`)

```json
{ "_id","name","description","category":"<CategoryId>","meta_data": {},"is_active": true,"images": [],"createdAt","updatedAt" }
```

### `GET /api/sub-category/`

- **Auth:** None
- **Query params:** `category` (ObjectId filter, optional), `page` (default `1`), `per_page` (default `50`), `search` (default `""`)
- **Response `data`:** paged sub-category list from service

### `PUT /api/sub-category/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Path params:** `id`
- **Form-data fields:** same as create, optional/partial; `images` replaces if files provided
- **Response `data`:** updated doc — `400` invalid id/bad JSON, `404` not found

### `GET /api/sub-category/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** single SubCategory doc, `404` if not found

### `DELETE /api/sub-category/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** `null`, `404` if not found

---

## Brand

Base path: `/api/brand`

### `POST /api/brand/`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Form-data fields:** `images` (files), `name` (required), `description`, `slug` (string, unique — checked before create), `newly_launched` (bool), `is_active` (bool), `meta_data` (JSON string)
- **Response `data`:** created Brand doc (`201`) — `404` no images, `409` if slug already exists

```json
{ "_id","name","description","meta_data": {},"newly_launched": false,"is_active": true,"images": [],"slug","createdAt","updatedAt" }
```

### `GET /api/brand/`

- **Auth:** None
- **Query params:** `service_id` (optional), `page` (default `1`), `per_page` (default `50`), `search` (default `""`), `sort` (default `"latest"`)
- **Response `data`:** `{ "total": number, ...(service result) }`

### `GET /api/brand/admin`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `page` (default `1`), `per_page` (default `50`), `search` (default `""`)
- **Response `data`:** brand list scoped to calling admin

### `PUT /api/brand/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Path params:** `id`
- **Form-data fields:** same as create, optional
- **Response `data`:** updated Brand doc — `409` slug conflict, `404` not found

### `GET /api/brand/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** single Brand doc, `404` if not found

### `DELETE /api/brand/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** `null`, `404` if not found

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

## Reviews

Base path: `/api/reviews`

### `GET /api/reviews/get-all`

- **Auth:** None
- **Query params:** `productId` (required, ObjectId)
- **Response `data`:** array of Review docs, `404` if no reviews or product not found, `400` invalid id

```json
[{ "_id","title","rating": 1-5,"userId","description","productId","createdAt","updatedAt" }]
```

### `POST /api/reviews/add`

Add a review. Caller must have purchased the product (checked via `Order` containing this product for this user).

- **Auth:** User
- **Query params:** `productId` (required, ObjectId)
- **Body:** `{ "title": "string", "rating": 1-5, "description": "string" }`
- **Response `data`:** created Review doc (`201`) — `400` missing productId/body, `401` unauthenticated, `403` if user hasn't purchased the product

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

---

## Blogs

Base path: `/api/blogs`

### `POST /api/blogs/`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Form-data fields:** `banner_image_url` (file, single), `title` (required), `short_description` (required), `content` (required), `is_featured` (bool, optional)
- **Response `data`:** created Blog doc (`201`) — `404` if any required field/image missing

```json
{ "_id","title","content","short_description","banner_image_url","author": "<adminId>","published": false,"is_featured": false,"createdAt","updatedAt" }
```

### `GET /api/blogs/`

- **Auth:** None
- **Query params:** `search` (title regex), `page`, `per_page` (default `50`), `featured` (`"true"`/`"false"`), `published` (`"true"`/`"false"`)
- **Response `data`:** array of Blog docs (or `[]` with `success:false` if none found — note: HTTP status here is `201` per source, not `200`)

### `GET /api/blogs/:id`

- **Auth:** None
- **Path params:** `id`
- **Response `data`:** single Blog doc, `404` if not found, `400` invalid id

### `PUT /api/blogs/edit/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Headers:** `Content-Type: multipart/form-data`
- **Path params:** `id`
- **Form-data fields:** `banner_image_url` (file, optional replacement), plus any of `title`,`short_description`,`content`,`is_featured`,`published`
- **Response `data`:** updated Blog doc

### `DELETE /api/blogs/delete/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** `null`, `404` if not found, `400` invalid id

---

## Contact Us

Base path: `/api/contact-us`

### `POST /api/contact-us/`

Public "contact us" form submission.

- **Auth:** None
- **Body:** `{ "name","email","subject" }` (all required)
- **Response `data`:** created ContactForm doc (`201`)

```json
{ "_id","name","email","subject","createdAt","updatedAt" }
```

### `GET /api/contact-us/`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Query params:** `search` (default `""`, matches name/email/subject), `page` (default `1`), `per_page` (default `10`), `start_date`, `end_date` (filter `createdAt`)
- **Response `data`:** `{ "data": [contactForm, ...], "total": number }`

### `DELETE /api/contact-us/:id`

- **Auth:** Admin (roles: `admin`, `super_admin`)
- **Path params:** `id`
- **Response `data`:** deletion result from repository

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

**DeliveryZone document shape:**

```json
{ "_id","zone_name","pincodes": ["..."],"pricing_type","weight_unit_grams","price","flat_rate_base","min_weight_grams","fixed_amount","is_default": boolean,"is_active": boolean,"description","createdAt","updatedAt" }
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
