-- ============================================================
-- Serene Beauty — Security Patch v2 (INCREMENTAL)
-- Run this ONLY if you already ran SUPABASE_COMPLETE.sql v1.
-- If setting up fresh, run SUPABASE_COMPLETE.sql instead.
-- ============================================================

-- ── 1. Add stock column to products ──────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;
ALTER TABLE products ADD CONSTRAINT IF NOT EXISTS chk_products_price_positive CHECK (price > 0);
ALTER TABLE products ADD CONSTRAINT IF NOT EXISTS chk_products_stock_non_neg  CHECK (stock >= 0);

-- ── 2. Add product_id to order_items ─────────────────────────────────────────
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD CONSTRAINT IF NOT EXISTS chk_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE order_items ADD CONSTRAINT IF NOT EXISTS chk_items_price_positive    CHECK (price > 0);

-- ── 3. Add status CHECK constraint to orders ─────────────────────────────────
ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS chk_orders_status
  CHECK (status IN ('pending','processing','shipped','delivered','cancelled'));

-- ── 4. Performance indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_order_items_order_id    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id  ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_ref        ON orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_orders_created_at       ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_category       ON products(category);

-- ── 5. Updated place_order() — price integrity + stock control ───────────────
CREATE OR REPLACE FUNCTION place_order(
  p_order_id       uuid,
  p_order_ref      text,
  p_customer_name  text,
  p_email          text,
  p_phone          text,
  p_address        text,
  p_status         text    DEFAULT 'pending',
  p_total          numeric DEFAULT 0,
  p_payment_method text    DEFAULT 'cash_on_delivery',
  p_items          jsonb   DEFAULT '[]'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id    uuid    := gen_random_uuid();
  v_verified_total numeric := 0;
  v_item           jsonb;
  v_product_id     uuid;
  v_quantity       integer;
  v_product_name   text;
  v_unit_price     numeric;
  v_stock          integer;
BEGIN

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART: Order must contain at least one item';
  END IF;

  -- PASS 1: Validate all items + lock rows (SELECT FOR UPDATE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    v_product_id := (v_item->>'product_id')::uuid;
    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_ITEM: product_id is required';
    END IF;

    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: quantity must be > 0 (got: %)',
        COALESCE(v_item->>'quantity', 'null');
    END IF;

    BEGIN
      SELECT name, price, stock
      INTO STRICT v_product_name, v_unit_price, v_stock
      FROM products
      WHERE id = v_product_id
      FOR UPDATE;
    EXCEPTION WHEN no_data_found THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product % not found', v_product_id;
    END;

    IF v_unit_price IS NULL OR v_unit_price <= 0 THEN
      RAISE EXCEPTION 'INVALID_PRICE: Product "%" has no valid price', v_product_name;
    END IF;

    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'OUT_OF_STOCK: Not enough stock for "%". Available: %, Requested: %',
        v_product_name, v_stock, v_quantity;
    END IF;

    v_verified_total := v_verified_total + (v_unit_price * v_quantity);

  END LOOP;

  -- Insert customer
  INSERT INTO customers (id, name, email, phone, address)
  VALUES (v_customer_id, p_customer_name, p_email, p_phone, p_address);

  -- Insert order with DB-verified total (frontend total discarded)
  INSERT INTO orders (id, order_ref, customer_id, status, total, payment_method)
  VALUES (p_order_id, p_order_ref, v_customer_id, p_status, v_verified_total, p_payment_method);

  -- PASS 2: Insert items + deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity   := (v_item->>'quantity')::integer;

    SELECT name, price INTO v_product_name, v_unit_price
    FROM products WHERE id = v_product_id;

    INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
    VALUES (p_order_id, v_product_id, v_product_name, v_quantity, v_unit_price);

    UPDATE products SET stock = stock - v_quantity WHERE id = v_product_id;

  END LOOP;

  RETURN jsonb_build_object('verified_total', v_verified_total, 'order_id', p_order_id);

END;
$$;

REVOKE ALL    ON FUNCTION place_order(uuid,text,text,text,text,text,text,numeric,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION place_order(uuid,text,text,text,text,text,text,numeric,text,jsonb) TO anon;
GRANT EXECUTE ON FUNCTION place_order(uuid,text,text,text,text,text,text,numeric,text,jsonb) TO authenticated;

-- ── 6. Harden RLS: block direct INSERT on orders, order_items, customers ─────
DROP POLICY IF EXISTS "orders_insert"      ON orders;
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "customers_insert"   ON customers;

-- Only place_order() SECURITY DEFINER can insert (bypasses RLS as postgres)
CREATE POLICY "orders_insert"      ON orders      FOR INSERT WITH CHECK (false);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (false);
CREATE POLICY "customers_insert"   ON customers   FOR INSERT WITH CHECK (false);
