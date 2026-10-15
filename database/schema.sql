CREATE DATABASE IF NOT EXISTS ecommerce_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecommerce_db;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(1000) DEFAULT NULL,
  stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (price >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('Pending', 'Processing', 'Shipped', 'Delivered') NOT NULL DEFAULT 'Pending',
  shipping_address TEXT NOT NULL,
  payment_method ENUM('Cash on Delivery') NOT NULL DEFAULT 'Cash on Delivery',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  product_name VARCHAR(160) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Sample catalogue for testing. Run this file once in MySQL Workbench or the mysql CLI.
INSERT INTO products (name, description, price, image_url, stock_quantity)
SELECT 'Everyday Backpack', 'A lightweight backpack for classes, work, and everyday trips.', 1299.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', 20
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Everyday Backpack');
INSERT INTO products (name, description, price, image_url, stock_quantity)
SELECT 'Wireless Headphones', 'Comfortable over-ear headphones for music and online classes.', 2499.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', 15
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Wireless Headphones');
INSERT INTO products (name, description, price, image_url, stock_quantity)
SELECT 'Classic Wrist Watch', 'A minimal everyday watch with a clean, classic design.', 1799.00, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80', 12
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Classic Wrist Watch');
INSERT INTO products (name, description, price, image_url, stock_quantity)
SELECT 'Running Shoes', 'Versatile trainers designed for daily walks and workouts.', 2199.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', 18
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Running Shoes');
INSERT INTO products (name, description, price, image_url, stock_quantity)
SELECT 'Ceramic Coffee Mug', 'A simple ceramic mug for coffee, tea, and study breaks.', 399.00, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80', 30
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Ceramic Coffee Mug');
INSERT INTO products (name, description, price, image_url, stock_quantity)
SELECT 'Desk Lamp', 'A compact desk lamp to brighten your reading or workspace.', 999.00, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80', 10
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Desk Lamp');
