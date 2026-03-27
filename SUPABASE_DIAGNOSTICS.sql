-- ============================================================
-- QUICK FIX — Run this entire block in Supabase → SQL Editor
-- Adds ALL missing columns to the existing tables safely
-- ============================================================

-- customers table — add missing address column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';

-- order_items table — add all missing columns
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name text    NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quantity     integer NOT NULL DEFAULT 1;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price        numeric NOT NULL DEFAULT 0;

-- Make sure RLS INSERT policies exist for anonymous checkout
DO $$
BEGIN
  -- customers: allow anon insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'customers' AND policyname = 'customers_insert'
  ) THEN
    CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (true);
  END IF;

  -- orders: allow anon insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'orders_insert'
  ) THEN
    CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (true);
  END IF;

  -- order_items: allow anon insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_items' AND policyname = 'order_items_insert'
  ) THEN
    CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Enable RLS on all three tables (safe even if already enabled)
ALTER TABLE customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFY — Run this after the fix to confirm the columns exist
-- ============================================================
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('customers', 'orders', 'order_items')
ORDER BY table_name, ordinal_position;
