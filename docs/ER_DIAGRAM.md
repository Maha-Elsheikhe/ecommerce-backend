# Database ER Diagram

Entity-relationship diagram of the PostgreSQL schema defined in
[`schema.sql`](../schema.sql) (identical in structure to
[`neon_schema.sql`](../neon_schema.sql) and verified against the Neon database).
Only tables, columns and foreign keys that exist in the schema are shown.

```mermaid
erDiagram
    users ||--o{ cart : "has (CASCADE)"
    users ||--o{ orders : "places (RESTRICT)"
    users ||--o{ reviews : "writes (CASCADE)"
    users ||--o{ wishlist : "saves (CASCADE)"

    categories |o--o{ products : "groups (SET NULL)"

    products ||--o{ cart : "in (CASCADE)"
    products ||--o{ order_items : "sold as (RESTRICT)"
    products ||--o{ reviews : "reviewed in (CASCADE)"
    products ||--o{ wishlist : "saved in (CASCADE)"

    orders ||--o{ order_items : "contains (CASCADE)"

    users {
        int id PK
        varchar fname
        varchar lname
        varchar email UK
        varchar password_hash
        varchar role "admin | user, default user"
        boolean is_verified
        text verification_token
        timestamp verification_token_expires
        text reset_password_token
        timestamp reset_password_expires
        timestamp created_at
    }

    categories {
        int id PK
        varchar name UK
        text description
        timestamp created_at
    }

    products {
        int id PK
        varchar name
        text description
        numeric price "price > 0"
        int stock "stock >= 0"
        text image_url
        int category_id FK "nullable"
        varchar cloudinary_id
        boolean is_active
        timestamp created_at
        timestamp updated_at
        numeric avg_rating "0 to 5"
    }

    cart {
        int id PK
        int user_id FK
        int product_id FK
        int quantity "quantity > 0"
        timestamp created_at
    }

    orders {
        int id PK
        int user_id FK
        numeric total_price "total_price >= 0"
        varchar status "pending | paid | shipped | delivered | cancelled"
        timestamp created_at
    }

    order_items {
        int id PK
        int order_id FK
        int product_id FK
        int quantity "quantity > 0"
        numeric unit_price "unit_price >= 0"
    }

    reviews {
        int id PK
        int user_id FK
        int product_id FK
        int rating "1 to 5"
        text comment
        timestamp created_at
    }

    wishlist {
        int id PK
        int user_id FK
        int product_id FK
        timestamp created_at
    }

    coupons {
        int id PK
        varchar code UK
        int discount_percent "1 to 100"
        timestamp expires_at
        timestamp created_at
    }
```

## Notes

- **Composite unique constraints** (not expressible in Mermaid): `cart(user_id, product_id)`,
  `reviews(user_id, product_id)` and `wishlist(user_id, product_id)`, so a user has at most one
  row per product in each of these tables.
- **Foreign key delete rules**: deleting a user or product cascades to their cart, review and
  wishlist rows. Deleting a user who has orders, or a product that appears in `order_items`, is
  rejected (`RESTRICT`). Deleting a category sets `products.category_id` to `NULL`.
  Deleting an order cascades to its `order_items`.
- **`coupons` is standalone**: it has no foreign keys. A coupon is looked up by `code` at
  checkout and only its discount is applied; the order does not store which coupon was used.
- **`products.avg_rating`** is not maintained by a database trigger. The API recalculates it
  when a review is added, updated or deleted. A manual script for recalculating stale existing
  values is provided in [`sql/manual/recalculate_avg_rating.sql`](../sql/manual/recalculate_avg_rating.sql).
- **Indexes** (besides primary keys and unique constraints): `products(category_id)`,
  `cart(user_id)`, `orders(user_id)`, `orders(status)`, `orders(created_at)`,
  `order_items(order_id)`, `order_items(product_id)`, `reviews(product_id)`, `wishlist(user_id)`.
- Existing databases created before the email-verification expiry feature need
  [`migrations/20261105_add_verification_token_expiry.sql`](../migrations/20261105_add_verification_token_expiry.sql)
  to add `users.verification_token_expires`.
