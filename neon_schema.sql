
-- =========================================
-- E-Commerce Database Schema
-- PostgreSQL / Neon
-- =========================================

-- 1. USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    fname VARCHAR(50) NOT NULL,
    lname VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('admin', 'user')),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token TEXT,
    verification_token_expires TIMESTAMP,
    reset_password_token TEXT,
    reset_password_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. CATEGORIES
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. PRODUCTS
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    category_id INTEGER
        REFERENCES categories(id) ON DELETE SET NULL,
    cloudinary_id VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0
        CHECK (avg_rating BETWEEN 0 AND 5)
);

-- 4. CART
CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL
        REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

-- 5. ORDERS
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'paid',
                'shipped',
                'delivered',
                'cancelled'
            )
        ),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. ORDER ITEMS
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL
        REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL
        REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

-- 7. COUPONS
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL
        CHECK (discount_percent BETWEEN 1 AND 100),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. REVIEWS
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL
        REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

-- 9. WISHLIST
CREATE TABLE wishlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL
        REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX idx_products_category_id
ON products(category_id);

CREATE INDEX idx_cart_user_id
ON cart(user_id);

CREATE INDEX idx_orders_user_id
ON orders(user_id);

CREATE INDEX idx_orders_status
ON orders(status);

CREATE INDEX idx_orders_created_at
ON orders(created_at);

CREATE INDEX idx_order_items_order_id
ON order_items(order_id);

CREATE INDEX idx_order_items_product_id
ON order_items(product_id);

CREATE INDEX idx_reviews_product_id
ON reviews(product_id);

CREATE INDEX idx_wishlist_user_id
ON wishlist(user_id);
