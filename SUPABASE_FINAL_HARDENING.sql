-- ============================================================
-- Serene Beauty — Final Hardening Patch  v3  (INCREMENTAL)
-- Run this ONLY if you already applied SUPABASE_COMPLETE.sql v2.
-- For a fresh setup, run SUPABASE_COMPLETE.sql (the full file).
-- ============================================================

-- 1. Add customer_email to orders (for lookup_order RPC)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email text;
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- 2. Unique constraint: one product per order line
CREATE UNIQUE INDEX IF NOT EXISTS uniq_order_items_order_product
  ON order_items (order_id, product_id)
  WHERE product_id IS NOT NULL;

-- 3. Audit log table (append-only)
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

CREATE INDEX IF NOT EXISTS idx_audit_log_order_id   ON audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- 4. Audit log RLS: admin read only; no INSERT policy (SECURITY DEFINER only)
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (is_admin());

-- 5. _audit() internal helper
CREATE OR REPLACE FUNCTION _audit(
  p_event    text,
  p_order_id uuid    DEFAULT NULL,
  p_order_ref text   DEFAULT NULL,
  p_email    text    DEFAULT NULL,
  p_details  jsonb   DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log (event, order_id, order_ref, email, details)
  VALUES (p_event, p_order_id, p_order_ref, p_email, p_details);
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
REVOKE ALL ON FUNCTION _audit(text,uuid,text,text,jsonb) FROM PUBLIC;

-- 6. Updated place_order() v3 — see SUPABASE_COMPLETE.sql for full version
--    Copy the full function from section 11 of SUPABASE_COMPLETE.sql here.
--    (Omitted to avoid duplication — run the full file instead.)

-- 7. lookup_order() — customer self-service order status
CREATE OR REPLACE FUNCTION lookup_order(p_order_ref text, p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_items jsonb;
BEGIN
  SELECT * INTO v_order FROM orders
  WHERE order_ref = p_order_ref AND customer_email = lower(trim(p_email))
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'name', oi.product_name, 'quantity', oi.quantity, 'price', oi.price
  )) INTO v_items FROM order_items oi WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_ref', v_order.order_ref, 'status', v_order.status,
    'total', v_order.total, 'payment_method', v_order.payment_method,
    'created_at', v_order.created_at, 'items', COALESCE(v_items, '[]'::jsonb)
  );
END;
$$;
REVOKE ALL    ON FUNCTION lookup_order(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_order(text,text) TO anon;
GRANT EXECUTE ON FUNCTION lookup_order(text,text) TO authenticated;
