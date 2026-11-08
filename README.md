# E-Commerce Backend API

A RESTful backend for an online store, built with **Node.js, Express 5 and PostgreSQL**.
It covers the full shopping flow: user accounts with email verification, a product catalog with
image uploads, shopping cart, coupon-based checkout with transactional stock handling, orders,
reviews, wishlist, and an admin analytics endpoint.

- **Live API:** https://ecommerce-backend-8zh3.onrender.com (all routes are under `/api`)
- **API reference:** [API.md](API.md)
- **Database diagram:** [docs/ER_DIAGRAM.md](docs/ER_DIAGRAM.md)

## Features

**Authentication & accounts**
- Registration with password policy (min. 8 characters, upper/lowercase, number and one of `@$!%*?&`)
- Email verification (single-use token, 24-hour expiry) and password reset (1-hour expiry) via Resend
- JWT login (7-day tokens), bcrypt password hashing, `user` / `admin` roles
- Responses that avoid revealing whether an email is registered (registration, resend-verification, password-reset request, login)

**Catalog**
- Public product and category listing, product search by name, filter by category
- Admin-only product create / update / delete, with optional image upload to Cloudinary (images up to 5 MB)

**Shopping**
- Per-user cart with stock and ownership checks
- Checkout runs in a database transaction: validates stock, applies an optional percentage coupon
  (rejects unknown or expired codes), creates the order and its items, deducts stock with an atomic
  conditional update (prevents overselling under concurrent checkouts), and empties the cart
- Orders with an admin-controlled status workflow (`pending → paid / cancelled`, `paid → shipped / cancelled`,
  `shipped → delivered`)
- Admin-managed coupons with optional expiry

**Engagement**
- Product reviews (one per user per product, updatable); `products.avg_rating` is recalculated by the API
- Wishlist

**Admin**
- Analytics endpoint (user, product and order counts, revenue, order status counts)

**Security & robustness**
- `helmet` security headers; rate limiting (300 requests / 15 min on `/api`, 20 / 15 min on `/api/auth`)
- Input validation for registration, products, cart, coupons and reviews
- Parameterized SQL queries, a JSON error handler that does not leak stack traces,
  and CORS restricted to the configured frontend origin (plus `http://localhost:3000`)

## Tech stack

| Area | Technology |
| --- | --- |
| Runtime / framework | Node.js 22, Express 5 |
| Database | PostgreSQL (hosted on Neon), `pg` |
| Auth & security | `jsonwebtoken`, `bcrypt`, `helmet`, `express-rate-limit`, `cors` |
| File uploads | `multer` (in memory) + Cloudinary |
| Email | Resend |
| Testing | Node's built-in test runner (`node:test`) |
| Hosting | Render (API), Neon (database) |

## Architecture & folder structure

The app follows a simple routes → middleware → controllers → database layering.

```text
.
├── index.js                 # Express app: security middleware, rate limiting, route mounting, error handler
├── db.js                    # PostgreSQL connection pool
├── config/
│   ├── cloudinary.js        # Cloudinary client configuration
│   └── mailer.js            # Resend email client wrapper
├── routes/                  # Route definitions (one file per resource)
├── controllers/             # Request handling and SQL queries
├── middlewares/
│   ├── auth.middleware.js   # JWT authentication
│   ├── admin.middleware.js  # Admin-only authorization
│   ├── upload.js            # Multer image upload (type and size limits)
│   ├── validateProduct.js   # Product input validation
│   └── validateRegister.js  # Password policy validation
├── migrations/              # SQL migrations for existing databases
├── sql/manual/              # Manual maintenance scripts (never run automatically)
├── schema.sql               # Full database schema (non-destructive, IF NOT EXISTS)
├── neon_schema.sql          # Schema as deployed on Neon
├── tests/                   # Automated tests
├── docs/ER_DIAGRAM.md       # Database ER diagram (Mermaid)
├── API.md                   # API reference
└── .env.example             # Required environment variables (placeholders)
```

Database design is documented in [docs/ER_DIAGRAM.md](docs/ER_DIAGRAM.md).

## Getting started

### Prerequisites

- Node.js 22 and npm
- A PostgreSQL database (a free [Neon](https://neon.tech) project works)
- A [Resend](https://resend.com) account (verification and password-reset emails)
- A [Cloudinary](https://cloudinary.com) account (only needed for product image uploads)

### Installation

```bash
git clone https://github.com/Maha-Elsheikhe/ecommerce-backend.git
cd ecommerce-backend
npm install
```

### Environment variables

Copy the template and fill in your own values:

```bash
cp .env.example .env
```

All variables are listed in [`.env.example`](.env.example): `PORT`, `DATABASE_URL_POOLED`, `JWT_SECRET`,
`FRONTEND_URL`, `RESEND_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`.
`.env` is git-ignored; never commit real credentials.

### Database setup

Create the tables in an empty database by running [`schema.sql`](schema.sql), for example:

```bash
psql "$DATABASE_URL_POOLED" -f schema.sql
```

The script only creates objects (it uses `IF NOT EXISTS` and contains no `DROP` or seed data).
An older database that predates email-verification expiry needs
[`migrations/20261105_add_verification_token_expiry.sql`](migrations/20261105_add_verification_token_expiry.sql).

Two things have no API endpoint and are done directly in SQL:
- **Categories** can be read through the API but must be inserted in the database.
- **The first admin**: register and verify a normal account, then set its `role` to `admin` in the `users` table.

### Run

```bash
npm run dev     # development, auto-restart with nodemon
npm start       # production
```

The server listens on `PORT` (default `3000`). A health message is served at `GET /`,
and the API lives under `/api`.

### Tests

```bash
npm test
```

The suite uses Node's built-in test runner against the real Express app with the **database and mailer
mocked**, so it needs no database, network or credentials. It currently contains 34 tests covering:

- registration validation, login, and the no-enumeration responses
- authorization rules (public / authenticated / admin-only routes, invalid tokens)
- product validation and error handling
- wishlist input handling
- review handling, including `avg_rating` recalculation
- security headers, malformed JSON handling, and rate limiting

Not covered by automated tests: cart, checkout/orders, coupons and analytics logic.

## API documentation

Endpoints, request bodies, access levels and behavior notes are in [API.md](API.md). Summary of the
route groups (all under `/api`):

| Group | Base path |
| --- | --- |
| Authentication | `/auth` |
| Products / categories | `/products`, `/categories` |
| Cart / orders | `/cart`, `/orders` |
| Coupons | `/coupons` |
| Reviews / wishlist | `/reviews`, `/wishlist` |
| Admin analytics | `/admin/analytics` |

Protected routes require `Authorization: Bearer <JWT>`; admin routes also require the `admin` role.

## Deployment

The API is deployed on **Render** at https://ecommerce-backend-8zh3.onrender.com, using a PostgreSQL
database on **Neon**. To deploy your own instance:

1. Create a Web Service on Render from this repository (Node environment, install command `npm install`,
   start command `npm start`).
2. Set the environment variables from [`.env.example`](.env.example) in the Render dashboard
   (`FRONTEND_URL` should be your deployed frontend origin).
3. Apply [`schema.sql`](schema.sql) (new database) or the files in [`migrations/`](migrations/)
   (existing database) to your PostgreSQL instance.

The app sets `trust proxy` to `1` so rate limiting sees the client IP behind Render's proxy.

## Known limitations

- No payment gateway: checkout creates a `pending` order only.
- No API endpoints to create or edit categories.
- Cancelling an order does not return its items to stock.
- `products.avg_rating` is maintained by the API, not by a database trigger; ratings created before that
  logic existed can be fixed with [`sql/manual/recalculate_avg_rating.sql`](sql/manual/recalculate_avg_rating.sql).
