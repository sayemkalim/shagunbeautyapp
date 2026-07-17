# Phase 1 — Authentication
`/api/auth/user`, `/api/auth/admin`, `/api/auth/super-admin` (21 endpoints)

See [README.md](./README.md) for the shared response envelope, auth header format, and conventions.

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
