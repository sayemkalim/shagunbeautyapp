# Phase 2 — Catalog Taxonomy
`/api/category`, `/api/sub-category`, `/api/brand` (17 endpoints)

See [README.md](./README.md) for the shared response envelope, auth header format, and conventions.

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
