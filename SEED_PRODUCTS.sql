-- ============================================================
-- Serene Beauty — Seed original 12 products
-- Run this in Supabase → SQL Editor
-- Safe to run multiple times (skips existing products by name)
-- ============================================================

-- 1. Add badge column if it doesn't exist yet
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge text;

-- 2. Insert the 12 original products (skip if name already exists)

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Rose Petal Moisturizer', 'Hydrating cream infused with organic rose extract', 58, NULL, 'skincare', '/images/product-skincare.jpg', 4.8, 234, 'Best Seller', true, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Rose Petal Moisturizer');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Velvet Matte Lipstick', 'Long-lasting, richly pigmented matte lipstick', 32, NULL, 'makeup', '/images/product-makeup.jpg', 4.9, 189, 'New', false, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Velvet Matte Lipstick');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Radiance Serum', 'Vitamin C brightening serum for glowing skin', 72, 89, 'skincare', '/images/product-skincare.jpg', 4.7, 312, NULL, true, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Radiance Serum');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Silk Foundation', 'Lightweight, buildable coverage with a natural finish', 45, NULL, 'makeup', '/images/product-makeup.jpg', 4.6, 156, NULL, false, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Silk Foundation');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Éternelle Eau de Parfum', 'A sophisticated floral fragrance with rose and jasmine', 120, NULL, 'fragrance', '/images/product-fragrance.jpg', 4.9, 98, 'Exclusive', true, false
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Éternelle Eau de Parfum');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Jade Face Roller', 'Natural jade stone roller for facial massage', 38, NULL, 'tools', '/images/product-tools.jpg', 4.5, 267, NULL, false, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Jade Face Roller');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Hydra Eye Cream', 'Anti-aging eye cream with peptides and hyaluronic acid', 65, NULL, 'skincare', '/images/product-skincare.jpg', 4.8, 143, NULL, true, false
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Hydra Eye Cream');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Blush Palette', 'Four harmonious blush shades for every skin tone', 42, NULL, 'makeup', '/images/product-makeup.jpg', 4.7, 201, 'Trending', false, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Blush Palette');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Luxury Brush Set', 'Professional 12-piece brush set with rose gold handles', 85, 110, 'tools', '/images/product-tools.jpg', 4.9, 178, NULL, true, false
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Luxury Brush Set');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Night Recovery Mask', 'Overnight sleeping mask for deep skin repair', 55, NULL, 'skincare', '/images/product-skincare.jpg', 4.6, 134, NULL, false, false
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Night Recovery Mask');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Rose Body Mist', 'Light refreshing body spray with delicate rose scent', 35, NULL, 'fragrance', '/images/product-fragrance.jpg', 4.4, 89, NULL, false, false
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Rose Body Mist');

INSERT INTO products (name, description, price, original_price, category, image, rating, reviews, badge, is_featured, is_best_seller)
SELECT 'Glow Setting Spray', 'Dewy finish setting spray for all-day makeup wear', 28, NULL, 'makeup', '/images/product-makeup.jpg', 4.7, 245, NULL, false, false
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Glow Setting Spray');

-- Verify
SELECT id, name, price, category, badge, is_featured, is_best_seller FROM products ORDER BY created_at;
