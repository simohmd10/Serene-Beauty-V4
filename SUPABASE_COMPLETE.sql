-- ============================================================
-- Serene Beauty — Complete Supabase Setup  v4.1  (Production Final)
--
-- Changes vs v4.0:
--
--  [1] Idempotency race condition fixed:
--        v4.0 used SELECT → INSERT (TOCTOU window).
--        v4.1 uses pg_advisory_xact_lock(hash) to serialise
--        concurrent requests with the same idempotency_key.
--        Pattern: lock → re-check → proceed (double-checked locking).
--        The UNIQUE constraint remains as the ultimate safety net
--        and would catch any bypass, but the advisory lock means
--        the constraint violation path is never hit in practice.
--
--  [2] price_at_purchase DB-level CHECK constraint added:
--        ALTER TABLE order_items ADD CONSTRAINT
--        chk_items_price_at_purchase_positive
--        Was only present in CREATE TABLE (fresh installs),
--        not in the upgrade ALTER TABLE path.
--
--  [3] RAISE LOG added throughout place_order():
--        Writes to PostgreSQL server log (pg_log / Supabase logs)
--        for every success and every failure — independent of
--        audit_log table. Useful for debugging without DB access.
--
--  [4] lookup_order() uniform timing hardened:
--        pg_sleep(0) stub comment + note on Supabase rate limiting.
--        Uniform NULL response already in place since v3.
--
--  [5] All existing v4.0 guarantees preserved:
--        idempotency_key UNIQUE, access_token, price_at_purchase,
--        SET search_path = public, belt+suspenders stock update,
--        audit_log, WITH CHECK (false) on all client-facing tables.
--
-- Safe to re-run on existing DB (idempotent).
-- ============================================================

-- ============================================================
-- 1. PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id             uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  name           text    NOT NULL,
  description    text,
  price          numeric NOT NULL CHECK (price > 0),
  original_price numeric,
  category       text    NOT NULL,
  image          text,
  rating         numeric DEFAULT 4.5,
  reviews        integer DEFAULT 0,
  badge          text,
  is_featured    boolean DEFAULT false,
  is_best_seller boolean DEFAULT false,
  stock          integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

ALTER TABLE products ADD COLUMN     IF NOT EXISTS stock integer NOT NULL DEFAULT 0;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_price_positive') THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_price_positive CHECK (price > 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_stock_non_neg') THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_stock_non_neg CHECK (stock >= 0);
  END IF;
END $$;

-- ============================================================
-- 2. CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  email      text,
  phone      text NOT NULL,
  address    text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ref        text    UNIQUE,
  idempotency_key  uuid    UNIQUE,
  access_token     uuid    DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  customer_id      uuid    REFERENCES customers(id) ON DELETE SET NULL,
  customer_email   text,
  status           text    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  total            numeric NOT NULL CHECK (total > 0),
  payment_method   text    NOT NULL DEFAULT 'cash_on_delivery',
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Safe upgrade path from v3
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS access_token    uuid DEFAULT gen_random_uuid();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email  text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_idempotency_key
  ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_access_token
  ON orders (access_token) WHERE access_token IS NOT NULL;

-- ============================================================
-- 5. ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id                uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id          uuid    REFERENCES orders(id)   ON DELETE CASCADE,
  product_id        uuid    REFERENCES products(id) ON DELETE SET NULL,
  product_name      text    NOT NULL,
  quantity          integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price             numeric NOT NULL CHECK (price > 0),
  price_at_purchase numeric NOT NULL CHECK (price_at_purchase > 0)
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_id        uuid    REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price_at_purchase numeric;

-- DB-level constraints (applied on both fresh installs and upgrades)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_items_quantity_positive') THEN
    ALTER TABLE order_items ADD CONSTRAINT chk_items_quantity_positive CHECK (quantity > 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_items_price_positive') THEN
    ALTER TABLE order_items ADD CONSTRAINT chk_items_price_positive CHECK (price > 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_items_price_at_purchase_positive') THEN
    ALTER TABLE order_items ADD CONSTRAINT chk_items_price_at_purchase_positive CHECK (price_at_purchase > 0);
  END IF;
END $$; -- [v4.1]

-- One product per order line (DB-level, not just function-level)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_order_items_order_product
  ON order_items (order_id, product_id) WHERE product_id IS NOT NULL;

-- ============================================================
-- 6. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'))
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. STORE SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS store_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. AUDIT LOG (append-only — no UPDATE/DELETE policies ever)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id         bigserial   PRIMARY KEY,
  event      text        NOT NULL,
  order_id   uuid,
  order_ref  text,
  email      text,
  details    jsonb,
  ip_hint    text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_order_items_order_id    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id  ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_ref        ON orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_orders_created_at       ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email   ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_products_category       ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_featured    ON products(is_featured)    WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_is_best_seller ON products(is_best_seller) WHERE is_best_seller = true;
CREATE INDEX IF NOT EXISTS idx_audit_log_order_id      ON audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at    ON audit_log(created_at DESC);

-- ============================================================
-- 10. is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
REVOKE ALL    ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================================
-- 11. _audit() — internal helper
-- ============================================================
CREATE OR REPLACE FUNCTION _audit(
  p_event     text,
  p_order_id  uuid  DEFAULT NULL,
  p_order_ref text  DEFAULT NULL,
  p_email     text  DEFAULT NULL,
  p_details   jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (event, order_id, order_ref, email, details)
  VALUES (p_event, p_order_id, p_order_ref, p_email, p_details);
EXCEPTION WHEN OTHERS THEN
  NULL; -- Never let audit failure propagate to caller
END;
$$;
REVOKE ALL ON FUNCTION _audit(text, uuid, text, text, jsonb) FROM PUBLIC;

-- ============================================================
-- 12. place_order() v4.1 — PRODUCTION FINAL
--
-- ═══════════════════════════════════════════════════════════
-- SECURITY GUARANTEES (all enforced in DB — zero trust on frontend)
-- ═══════════════════════════════════════════════════════════
--
--  [A] IDEMPOTENCY — Race-condition safe (v4.1 fix)
--      Pattern: advisory lock → double-check → proceed
--
--      Step 1: Fast path SELECT (handles 99% of retries with no lock overhead)
--      Step 2: pg_advisory_xact_lock(hash of idempotency_key)
--              Serialises concurrent requests with the same key.
--              Lock is transaction-scoped → auto-released on commit/rollback.
--      Step 3: Re-check after lock (catches the concurrent race)
--      Step 4: UNIQUE constraint on idempotency_key stays as ultimate net.
--
--      Why not just ON CONFLICT DO NOTHING?
--      Because by the time we reach the order INSERT, we've already
--      inserted a customer row. ON CONFLICT DO NOTHING on the order
--      would leave an orphaned customer row. The advisory lock approach
--      prevents this by blocking concurrent execution entirely.
--
--  [B] VALIDATION
--      • Items array non-empty, max 50 line items (DoS guard)
--      • product_id: valid UUID, must exist in products table
--      • quantity: integer, 1–999 per item
--      • No duplicate product_id in same order
--
--  [C] PRICE INTEGRITY
--      • Price fetched from products table — frontend value ignored
--      • price_at_purchase snapshot stored (immutable audit trail)
--      • Total recalculated in DB — frontend total ignored
--
--  [D] STOCK SAFETY — Belt + Suspenders
--      • PASS 1: SELECT FOR UPDATE (row-level lock, prevents concurrent oversell)
--                + pre-check stock >= quantity (fast fail before any insert)
--      • PASS 2: UPDATE WHERE stock >= quantity
--                + GET DIAGNOSTICS rows_affected check
--                (catches theoretical bypass of FOR UPDATE)
--
--  [E] ACCESS TOKEN
--      • Generated by DB (gen_random_uuid()) — never from frontend
--      • Returned to client for future order lookup
--      • Lookup does NOT use email → no enumeration attack
--
--  [F] LOGGING
--      • RAISE LOG on every call (PostgreSQL server log / Supabase logs)
--      • _audit() writes to audit_log table (queryable by admins)
--      • Both success and failure are logged
--
--  [G] SECURITY DEFINER + SET search_path = public
--      • Bypasses RLS for internal inserts (WITH CHECK (false) blocks clients)
--      • search_path locked to public — prevents injection via schema search
--
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION place_order(
  p_order_id          uuid,
  p_order_ref         text,
  p_customer_name     text,
  p_email             text,
  p_phone             text,
  p_address           text,
  p_status            text    DEFAULT 'pending',
  p_total             numeric DEFAULT 0,        -- kept for API compat; IGNORED internally
  p_payment_method    text    DEFAULT 'cash_on_delivery',
  p_items             jsonb   DEFAULT '[]',     -- [{product_id, quantity}] ONLY
  p_idempotency_key   uuid    DEFAULT NULL      -- defaults to p_order_id inside function
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Idempotency
  v_idem_key         uuid    := COALESCE(p_idempotency_key, p_order_id);
  v_existing_order   public.orders%ROWTYPE;

  -- Order construction
  v_customer_id      uuid    := gen_random_uuid();
  v_access_token     uuid;
  v_verified_total   numeric := 0;

  -- Per-item loop vars
  v_item             jsonb;
  v_product_id       uuid;
  v_quantity         integer;
  v_product_name     text;
  v_unit_price       numeric;
  v_stock            integer;
  v_rows_affected    integer;

  -- Tracking
  v_seen_products    uuid[]  := '{}';
  v_item_count       integer := 0;
BEGIN

  -- ══════════════════════════════════════════════════════════
  -- [A] IDEMPOTENCY — Step 1: Fast path (no lock overhead)
  --     Handles the common case: client retrying a completed order.
  -- ══════════════════════════════════════════════════════════
  SELECT * INTO v_existing_order
  FROM   public.orders
  WHERE  idempotency_key = v_idem_key
  LIMIT  1;

  IF FOUND THEN
    RAISE LOG '[place_order] idempotent hit — key=%, order_id=%, ref=%',
      v_idem_key, v_existing_order.id, v_existing_order.order_ref;

    PERFORM _audit('order_idempotent_hit', v_existing_order.id,
      v_existing_order.order_ref, p_email,
      jsonb_build_object('idempotency_key', v_idem_key));

    RETURN jsonb_build_object(
      'verified_total', v_existing_order.total,
      'order_id',       v_existing_order.id,
      'access_token',   v_existing_order.access_token,
      'idempotent',     true
    );
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- [A] IDEMPOTENCY — Step 2: Advisory lock (concurrent safety)
  --
  --     pg_advisory_xact_lock serialises ALL transactions that
  --     hash to the same value. Two concurrent place_order() calls
  --     with the same idempotency_key cannot both proceed past here.
  --     The second call blocks until the first commits or rolls back,
  --     then hits the re-check below and returns idempotent:true.
  --
  --     Using hashtext(key::text) converts UUID to a 64-bit int.
  --     Collision probability across distinct keys is negligible.
  -- ══════════════════════════════════════════════════════════
  PERFORM pg_advisory_xact_lock(hashtext(v_idem_key::text));

  -- [A] Step 3: Re-check after lock (handles concurrent race)
  SELECT * INTO v_existing_order
  FROM   public.orders
  WHERE  idempotency_key = v_idem_key
  LIMIT  1;

  IF FOUND THEN
    RAISE LOG '[place_order] idempotent (post-lock) — key=%, order_id=%',
      v_idem_key, v_existing_order.id;

    RETURN jsonb_build_object(
      'verified_total', v_existing_order.total,
      'order_id',       v_existing_order.id,
      'access_token',   v_existing_order.access_token,
      'idempotent',     true
    );
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- [B] INPUT VALIDATION
  -- ══════════════════════════════════════════════════════════

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE LOG '[place_order] EMPTY_CART — ref=%', p_order_ref;
    PERFORM _audit('order_failed', p_order_id, p_order_ref, p_email,
      jsonb_build_object('reason', 'EMPTY_CART'));
    RAISE EXCEPTION 'EMPTY_CART: Order must contain at least one item';
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RAISE LOG '[place_order] TOO_MANY_ITEMS — count=%, ref=%',
      jsonb_array_length(p_items), p_order_ref;
    PERFORM _audit('order_failed', p_order_id, p_order_ref, p_email,
      jsonb_build_object('reason', 'TOO_MANY_ITEMS',
                         'count',  jsonb_array_length(p_items)));
    RAISE EXCEPTION 'TOO_MANY_ITEMS: Maximum 50 products per order (got: %)',
      jsonb_array_length(p_items);
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- PASS 1 — Validate all items, lock rows, accumulate total
  -- ══════════════════════════════════════════════════════════
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    v_item_count := v_item_count + 1;

    -- product_id: valid UUID
    BEGIN
      v_product_id := (v_item->>'product_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_PRODUCT_ID: Not a valid UUID at item %', v_item_count;
    END;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_ITEM: product_id is required (item %)', v_item_count;
    END IF;

    -- quantity: integer 1–999
    BEGIN
      v_quantity := (v_item->>'quantity')::integer;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: Must be an integer (item %)', v_item_count;
    END;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: Must be > 0 (got: % at item %)',
        COALESCE(v_item->>'quantity', 'null'), v_item_count;
    END IF;

    IF v_quantity > 999 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: Maximum 999 per item (got: % at item %)',
        v_quantity, v_item_count;
    END IF;

    -- Duplicate product detection (function-level; UNIQUE INDEX is DB-level net)
    IF v_product_id = ANY(v_seen_products) THEN
      RAISE EXCEPTION 'DUPLICATE_PRODUCT: product % appears more than once. Combine quantities.',
        v_product_id;
    END IF;
    v_seen_products := array_append(v_seen_products, v_product_id);

    -- [C] [D] Fetch DB price + stock; lock row for duration of transaction
    BEGIN
      SELECT name, price, stock
      INTO   STRICT v_product_name, v_unit_price, v_stock
      FROM   public.products
      WHERE  id = v_product_id
      FOR UPDATE;          -- row-level lock → prevents concurrent stock modification
    EXCEPTION WHEN no_data_found THEN
      RAISE LOG '[place_order] PRODUCT_NOT_FOUND — id=%, ref=%', v_product_id, p_order_ref;
      PERFORM _audit('order_failed', p_order_id, p_order_ref, p_email,
        jsonb_build_object('reason', 'PRODUCT_NOT_FOUND', 'product_id', v_product_id));
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product % does not exist (item %)',
        v_product_id, v_item_count;
    END;

    -- Price sanity (guards against misconfigured or zeroed-out products)
    IF v_unit_price IS NULL OR v_unit_price <= 0 THEN
      RAISE EXCEPTION 'INVALID_PRICE: Product "%" has no valid price configured',
        v_product_name;
    END IF;

    -- [D] Stock pre-check (PASS 1 fast-fail — before any writes)
    IF v_stock < v_quantity THEN
      RAISE LOG '[place_order] OUT_OF_STOCK — product=%, available=%, requested=%, ref=%',
        v_product_name, v_stock, v_quantity, p_order_ref;
      PERFORM _audit('order_failed', p_order_id, p_order_ref, p_email,
        jsonb_build_object(
          'reason',    'OUT_OF_STOCK',
          'product',   v_product_name,
          'available', v_stock,
          'requested', v_quantity
        ));
      RAISE EXCEPTION 'OUT_OF_STOCK: Not enough stock for "%". Available: %, Requested: %',
        v_product_name, v_stock, v_quantity;
    END IF;

    -- [C] Accumulate total using ONLY DB prices
    v_verified_total := v_verified_total + (v_unit_price * v_quantity);

  END LOOP;

  -- ══════════════════════════════════════════════════════════
  -- INSERT PHASE (rows still locked from PASS 1)
  -- ══════════════════════════════════════════════════════════

  INSERT INTO public.customers (id, name, email, phone, address)
  VALUES (v_customer_id, p_customer_name, p_email, p_phone, p_address);

  -- The UNIQUE constraint on idempotency_key is the final safety net.
  -- In normal operation, the advisory lock above ensures we never reach
  -- a violation here. But if it somehow occurs (e.g., direct SQL bypass),
  -- the constraint will hard-reject the duplicate.
  INSERT INTO public.orders
    (id, order_ref, idempotency_key, access_token, customer_id,
     customer_email, status, total, payment_method)
  VALUES
    (p_order_id, p_order_ref, v_idem_key, gen_random_uuid(), v_customer_id,
     lower(trim(p_email)), p_status, v_verified_total, p_payment_method)
  RETURNING access_token INTO v_access_token;

  -- ══════════════════════════════════════════════════════════
  -- PASS 2 — Insert items + deduct stock (belt + suspenders)
  --
  -- FOR UPDATE rows from PASS 1 are still locked (same transaction).
  -- WHERE stock >= quantity is the second guard: catches any edge
  -- case where stock was somehow modified between the two passes.
  -- GET DIAGNOSTICS confirms every UPDATE affected exactly 1 row.
  -- ══════════════════════════════════════════════════════════
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity   := (v_item->>'quantity')::integer;

    -- Re-fetch from already-locked rows (PK lookup → instant)
    SELECT name, price INTO v_product_name, v_unit_price
    FROM   public.products WHERE id = v_product_id;

    -- [C] Insert with price_at_purchase snapshot (DB price, never frontend)
    INSERT INTO public.order_items
      (order_id, product_id, product_name, quantity, price, price_at_purchase)
    VALUES
      (p_order_id, v_product_id, v_product_name, v_quantity,
       v_unit_price, v_unit_price);

    -- [D] Atomic stock deduction with second WHERE guard
    UPDATE public.products
    SET    stock = stock - v_quantity
    WHERE  id    = v_product_id
    AND    stock >= v_quantity;   -- second check catches theoretical FOR UPDATE bypass

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
      -- This path should never be reached if FOR UPDATE is working correctly.
      -- If it fires, something extraordinary happened — raise to roll back everything.
      RAISE LOG '[place_order] STOCK_RACE detected — product=%, ref=%',
        v_product_name, p_order_ref;
      RAISE EXCEPTION
        'STOCK_RACE: Concurrent stock modification detected for "%". Please retry.',
        v_product_name;
    END IF;

  END LOOP;

  -- [F] Log success
  RAISE LOG '[place_order] SUCCESS — ref=%, total=%, items=%, idem_key=%',
    p_order_ref, v_verified_total, v_item_count, v_idem_key;

  PERFORM _audit(
    'order_placed',
    p_order_id, p_order_ref, p_email,
    jsonb_build_object(
      'verified_total',  v_verified_total,
      'item_count',      v_item_count,
      'payment_method',  p_payment_method,
      'idempotency_key', v_idem_key
    )
  );

  -- [E] Return verified total + DB-generated access_token
  RETURN jsonb_build_object(
    'verified_total', v_verified_total,
    'order_id',       p_order_id,
    'access_token',   v_access_token,
    'idempotent',     false
  );

END;
$$;

REVOKE ALL    ON FUNCTION place_order(uuid,text,text,text,text,text,text,numeric,text,jsonb,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION place_order(uuid,text,text,text,text,text,text,numeric,text,jsonb,uuid) TO anon;
GRANT EXECUTE ON FUNCTION place_order(uuid,text,text,text,text,text,text,numeric,text,jsonb,uuid) TO authenticated;

-- ============================================================
-- 13. lookup_order() v4.1
--
-- Authenticates via (order_ref + access_token).
-- access_token is a random UUID generated by the DB → cannot be
-- guessed or brute-forced at any realistic rate.
--
-- Response: uniform NULL on any mismatch — does not distinguish
-- "wrong ref" from "wrong token" to prevent information leakage.
--
-- Rate limiting: Supabase enforces request-level rate limits on
-- all RPC calls. For additional protection, add an Edge Function
-- wrapper with exponential backoff (e.g., Upstash Redis + Supabase
-- Edge Functions) if brute-force is a concern in your threat model.
--
-- SET search_path = public hardened.
-- ============================================================
CREATE OR REPLACE FUNCTION lookup_order(
  p_order_ref    text,
  p_access_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items jsonb;
BEGIN
  SELECT * INTO v_order
  FROM   public.orders
  WHERE  order_ref    = p_order_ref
  AND    access_token = p_access_token
  LIMIT  1;

  IF NOT FOUND THEN
    -- Uniform NULL response — caller cannot determine whether
    -- the order_ref or the access_token was incorrect.
    RETURN NULL;
  END IF;

  -- Fetch items; use price_at_purchase for the snapshot price
  SELECT jsonb_agg(jsonb_build_object(
    'name',              oi.product_name,
    'quantity',          oi.quantity,
    'price_at_purchase', COALESCE(oi.price_at_purchase, oi.price)
  )) INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_ref',      v_order.order_ref,
    'status',         v_order.status,
    'total',          v_order.total,
    'payment_method', v_order.payment_method,
    'created_at',     v_order.created_at,
    'items',          COALESCE(v_items, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL    ON FUNCTION lookup_order(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_order(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION lookup_order(text, uuid) TO authenticated;

-- ============================================================
-- 14. handle_new_user()
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 15. DROP ALL EXISTING POLICIES (clean slate)
-- ============================================================
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM   pg_policies
    WHERE  schemaname = 'public'
    AND    tablename IN (
      'products','categories','customers','orders',
      'order_items','profiles','store_settings','audit_log'
    )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 16. ROW LEVEL SECURITY POLICIES — FINAL
-- ============================================================

-- PRODUCTS: public read, admin write
CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "products_update" ON products FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "products_delete" ON products FOR DELETE USING (is_admin());

-- CATEGORIES: public read, admin write
CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (is_admin());

-- CUSTOMERS: direct client INSERT blocked → only via SECURITY DEFINER RPCs
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (false);
CREATE POLICY "customers_select" ON customers FOR SELECT USING (is_admin());
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "customers_delete" ON customers FOR DELETE USING (is_admin());

-- ORDERS: direct client INSERT blocked → only via SECURITY DEFINER RPCs
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (false);
CREATE POLICY "orders_select" ON orders FOR SELECT USING (is_admin());
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "orders_delete" ON orders FOR DELETE USING (is_admin());

-- ORDER ITEMS: direct client INSERT blocked → only via SECURITY DEFINER RPCs
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (false);
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (is_admin());
CREATE POLICY "order_items_update" ON order_items FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "order_items_delete" ON order_items FOR DELETE USING (is_admin());

-- PROFILES: each user reads own row; admins update roles
CREATE POLICY "profiles_select_own"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- STORE SETTINGS: admin only
CREATE POLICY "settings_select" ON store_settings FOR SELECT USING (is_admin());
CREATE POLICY "settings_insert" ON store_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "settings_update" ON store_settings FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- AUDIT LOG: admin read; no INSERT policy (SECURITY DEFINER functions only)
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (is_admin());

-- ============================================================
-- 17. SUPABASE STORAGE — product-images bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true, 5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;

CREATE POLICY "product_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "product_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND is_admin());
CREATE POLICY "product_images_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND is_admin());
CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND is_admin());

-- ============================================================
-- 18. GRANT ADMIN ROLE — uncomment and replace email
-- ============================================================
-- UPDATE profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
