# E-Commerce Backend API

Base URL: `https://ecommerce-backend-8zh3.onrender.com`
Local default: `http://localhost:3000` (the `PORT` environment variable overrides it)

All routes are under `/api`. JSON endpoints use `Content-Type: application/json`.
Protected endpoints require `Authorization: Bearer <JWT>`. Admin endpoints also
require a JWT whose `role` is `admin`.

## Authentication

| Method | Path | Access | Request |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | `{ "fname": "Maha", "lname": "Example", "email": "user@example.com", "password": "Strong123!" }` |
| POST | `/auth/login` | Public | `{ "email": "user@example.com", "password": "Strong123!" }` |
| GET | `/auth/verify-email?token=...` | Public | Verification token in query string |
| POST | `/auth/resend-verification` | Public | `{ "email": "user@example.com" }` |
| POST | `/auth/request-reset-password` | Public | `{ "email": "user@example.com" }` |
| POST | `/auth/reset-password` | Public | `{ "token": "...", "newPassword": "Strong123!" }` |

Passwords must be at least 8 characters and contain uppercase, lowercase,
numeric, and one of `@$!%*?&`. Login returns `{ token, user }`; unverified
accounts receive HTTP 403. Registration creates a pending account even if the
email provider is temporarily unavailable; its response includes
`verificationEmailSent: false` in that case, and the user can request a new link.
To prevent account enumeration, `register` returns the same 201 response whether or
not the email already exists, and `resend-verification` and `request-reset-password`
always return HTTP 200 with a generic message (an email is only sent when an
eligible account exists). Login returns the same 401 for an unknown email and a
wrong password.
Verification links expire after 24 hours and can only be used once. Password
reset links expire after one hour.

## Categories and products

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/categories` | Public | Returns categories ordered by name |
| GET | `/products` | Public | Optional `search` and `category_id` query parameters |
| GET | `/products/:id` | Public | Returns one product; 404 when absent |
| POST | `/products` | Admin | `multipart/form-data`; fields `name`, `description`, `price`, `stock`, optional `category_id`, optional image file field `image` |
| PUT | `/products/:id` | Admin | `multipart/form-data`; send `name`, `description`, `price`, `stock`, optional `category_id`, and optional replacement image field `image` |
| DELETE | `/products/:id` | Admin | Deletes product and its Cloudinary image when present |

`POST` and `PUT /products` return HTTP 200 with the product JSON (not 201). Both
validate `name`, `description`, `price` (> 0) and `stock` (integer >= 0).
Product image uploads are limited to 5 MB and image MIME types. The API returns
Cloudinary's secure image URL in `image_url` when an image is uploaded.

## Cart and orders

| Method | Path | Access | Request |
| --- | --- | --- | --- |
| GET | `/cart` | User | — |
| POST | `/cart` | User | `{ "product_id": 12, "quantity": 2 }` |
| PUT | `/cart/:id` | User | `{ "quantity": 3 }` |
| DELETE | `/cart/:id` | User | — |
| GET | `/orders` | User; admins see all | — |
| GET | `/orders/:id` | Owner or admin | — |
| POST | `/orders/checkout` | User | Optional `{ "couponCode": "SAVE10" }` |
| PATCH | `/orders/:id/status` | Admin | `{ "status": "paid" }` |

Quantities must be positive integers. Checkout rejects an empty cart,
insufficient stock, and invalid or expired coupons. Allowed order statuses are
`pending`, `paid`, `shipped`, `delivered`, and `cancelled`, subject to the
transition rules enforced by the backend.

## Coupons, reviews, wishlist, analytics

| Method | Path | Access | Request |
| --- | --- | --- | --- |
| POST | `/coupons` | Admin | `{ "code": "SAVE10", "discount_percent": 10, "expires_at": "2026-12-01T00:00:00Z" }`; `expires_at` may be omitted or `null` |
| GET | `/coupons` | Admin | — |
| POST | `/coupons/validate` | User | `{ "code": "SAVE10" }` |
| DELETE | `/coupons/:id` | Admin | — |
| GET | `/reviews/:productId` | Public | Returns reviews with reviewer first and last names |
| POST | `/reviews/:productId` | User | `{ "rating": 5, "comment": "Great" }`; a user's existing review is updated; `products.avg_rating` is recomputed by the API on add, update and delete; 404 for an unknown product |
| DELETE | `/reviews/:id` | Review owner | — |
| GET | `/wishlist` | User | — |
| POST | `/wishlist/:productId` | User | Adds product; duplicate adds are harmless; 404 for an unknown product, 400 for an invalid id |
| DELETE | `/wishlist/:productId` | User | Removes product |
| GET | `/admin/analytics` | Admin | Counts users, products and orders; revenue includes paid, shipped and delivered orders |

## Integration notes

- Security: `helmet` headers are enabled. Rate limits (per IP, 15-minute window):
  300 requests for `/api/*` and 20 for `/api/auth/*`; exceeding them returns
  HTTP 429 `{ "message": "Too many requests, please try again later." }`.
  `trust proxy` is set to 1 (one reverse proxy, as on Render).
- Tests: `npm test` runs the automated suite (database and mailer are mocked; it
  never connects to a real database).
- CORS permits the configured `FRONTEND_URL` and `http://localhost:3000`.
- Required environment variables: `DATABASE_URL_POOLED`, `JWT_SECRET`,
  `FRONTEND_URL`, `RESEND_API_KEY`, `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Existing databases must apply `migrations/20261105_add_verification_token_expiry.sql`
  before running this version; it adds the nullable `users.verification_token_expires`
  column and gives pending verification tokens a 24-hour grace period. New databases
  can use `schema.sql`, which already includes the column.
- See `.env.example` for the full list of environment variables.
