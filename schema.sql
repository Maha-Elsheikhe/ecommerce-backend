-- ============================================
-- DROP TABLES (optional for development)
-- ============================================

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;


-- ============================================
-- CREATE TABLES
-- ============================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    fname VARCHAR(50) NOT NULL,
    lname VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('admin','user')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10,2) NOT NULL
        CHECK(price > 0),
    stock INTEGER NOT NULL DEFAULT 0
        CHECK(stock >= 0),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_price NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','paid','shipped','cancelled')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE wishlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percent INTEGER NOT NULL
        CHECK(discount_percent > 0 AND discount_percent <= 100),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================
-- ALTER TABLES
-- ============================================

ALTER TABLE cart
ADD CONSTRAINT unique_user_product
UNIQUE (user_id, product_id);

ALTER TABLE products
ADD COLUMN cloudinary_id VARCHAR(255);

ALTER TABLE products
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE products
ADD COLUMN category_id INT;

ALTER TABLE products
ADD CONSTRAINT fk_products_category
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE SET NULL;

ALTER TABLE products
ADD COLUMN avg_rating NUMERIC(3,2) DEFAULT 0;

ALTER TABLE orders
DROP CONSTRAINT orders_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_status_check
CHECK (
    status IN (
        'pending',
        'paid',
        'shipped',
        'delivered',
        'cancelled'
    )
);

ALTER TABLE users
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token TEXT;

ALTER TABLE users
ADD COLUMN reset_password_token TEXT,
ADD COLUMN reset_password_expires TIMESTAMP;


-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_cart_user ON cart(user_id);
CREATE INDEX idx_cart_product ON cart(product_id);
CREATE INDEX idx_products_cloudinary ON products(cloudinary_id);
CREATE INDEX idx_wishlist_user ON wishlist(user_id);
CREATE INDEX idx_wishlist_product ON wishlist(product_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);


-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

INSERT INTO users (fname, lname, email, password_hash, role)
VALUES
('Ahmad','Ali','ahmad@test.com','hash123','admin'),
('Sara','Omar','sara@test.com','hash123','user'),
('Mohammad','Khaled','mohammad@test.com','hash123','user');

INSERT INTO products (name,description,price,stock,image_url)
VALUES
('Laptop HP','Gaming laptop i7',1200.00,5,'https://img.com/laptop.jpg'),
('iPhone 14','Apple smartphone',900.00,10,'https://img.com/iphone.jpg'),
('Headphones','Wireless headphones',150.00,20,'https://img.com/headphones.jpg'),
('Keyboard','Mechanical keyboard',80.00,15,'https://img.com/keyboard.jpg');

INSERT INTO cart (user_id,product_id,quantity)
VALUES
(2,1,1),
(2,3,2),
(3,2,1);

INSERT INTO orders (user_id,total_price,status)
VALUES
(2,1350.00,'pending');


-- ============================================
-- OPTIONAL UPDATES
-- ============================================

UPDATE users
SET role = 'admin'
WHERE email = 'maha@test.com';

UPDATE users
SET role = 'admin'
WHERE email = 'mesho@test.com';

UPDATE users
SET is_verified = TRUE
WHERE email = 'mesho@test.com';

UPDATE users
SET is_verified = TRUE
WHERE email = 'joi@test.com';

UPDATE users
SET reset_password_token = NULL
WHERE email = 'basilelshakhe@gmail.com';


-- ============================================
-- TEST QUERIES
-- ============================================

SELECT * FROM users;
SELECT * FROM products;
SELECT * FROM cart;
SELECT * FROM orders;
SELECT * FROM order_items;