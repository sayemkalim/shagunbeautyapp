# Phase 6 — Content & Engagement
`/api/reviews`, `/api/blogs`, `/api/contact-us` (10 endpoints)

See [README.md](./README.md) for the shared response envelope, auth header format, and conventions.

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
