import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/context/AdminDataContext";

const isDev = import.meta.env.DEV;

// ── DB row shapes ─────────────────────────────────────────────────────────────

interface CustomerRow {
  id: string; name: string; email: string;
  phone: string; address: string; created_at: string;
}

interface OrderItemRow {
  id: string; order_id: string; product_id: string | null;
  product_name: string; quantity: number;
  price: number; price_at_purchase: number | null; // v4: explicit snapshot
}

interface OrderRow {
  id: string; order_ref: string | null; customer_id: string;
  customer_email: string | null; idempotency_key: string | null;
  status: string; total: number; payment_method: string; created_at: string;
  customers: CustomerRow | null;
  order_items: OrderItemRow[];
}

// ── Row → domain type ─────────────────────────────────────────────────────────

function toOrder(row: OrderRow): Order {
  const c = row.customers;
  return {
    id:           row.id,
    order_ref:    row.order_ref ?? row.id.slice(0, 8).toUpperCase(),
    createdAt:    row.created_at,
    customer:     c?.name  ?? "",
    email:        c?.email ?? row.customer_email ?? "",
    phone:        c?.phone ?? "",
    address:      c?.address ?? "",
    city: "", state: "", zip: "", country: "",
    status:        row.status as Order["status"],
    total:         row.total,
    items: (row.order_items ?? []).map((i) => ({
      productId:       i.product_id ?? undefined,
      name:            i.product_name,
      quantity:        i.quantity,
      // Prefer price_at_purchase; fall back to price for rows created before v4
      price:           i.price_at_purchase ?? i.price,
    })),
    paymentMethod: row.payment_method ?? "cash_on_delivery",
    date: new Date(row.created_at).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    }),
  };
}

// ── Admin read hook ───────────────────────────────────────────────────────────

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, order_ref, customer_id, customer_email, idempotency_key,
          status, total, payment_method, created_at,
          customers ( id, name, email, phone, address ),
          order_items ( id, order_id, product_id, product_name, quantity, price, price_at_purchase )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        if (isDev) console.error("[Supabase] SELECT orders failed:", error.message);
        throw error;
      }
      return (data as unknown as OrderRow[]).map(toOrder);
    },
    retry: 1,
    staleTime: 30_000,
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderItem {
  productId: string;   // required — DB fetches price from products table
  name:      string;   // display only
  quantity:  number;
  price:     number;   // display only — DB ignores, uses products.price
}

export interface InsertOrderPayload {
  id:              string;
  order_ref:       string;
  idempotencyKey?: string; // v4: optional — defaults to id inside RPC
  customer:        string;
  email:           string;
  phone:           string;
  address:         string;
  city:            string;
  state:           string;
  zip:             string;
  country:         string;
  status:          Order["status"];
  total:           number;    // estimate — DB recalculates from products
  items:           OrderItem[];
  paymentMethod:   string;
}

export interface InsertOrderResult {
  verifiedTotal: number;   // DB-calculated total — use this, not cart total
  orderId:       string;
  accessToken:   string;   // v4: UUID for customer order lookup
  idempotent:    boolean;  // true if this was a duplicate request
}

// ── insertOrder() — atomic via place_order() RPC ──────────────────────────────
//
// v4 changes:
//   • Sends p_idempotency_key for retry-safety
//   • Receives access_token from DB — stored locally for order lookup
//   • Only sends product_id + quantity — price comes from DB
//
export async function insertOrder(
  order: InsertOrderPayload
): Promise<InsertOrderResult> {
  // Client-side pre-validation (belt-and-suspenders; DB enforces the same rules)
  if (order.items.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const seenIds = new Set(order.items.map((i) => i.productId));
  if (seenIds.size !== order.items.length) {
    throw new Error("Cart contains duplicate products. Please refresh and try again.");
  }

  const invalid = order.items.filter(
    (i) => !i.productId || i.quantity <= 0 || i.quantity > 999
  );
  if (invalid.length > 0) {
    throw new Error("Cart contains invalid items. Please refresh and try again.");
  }

  const { data, error } = await supabase.rpc("place_order", {
    p_order_id:        order.id,
    p_order_ref:       order.order_ref,
    p_customer_name:   order.customer,
    p_email:           order.email,
    p_phone:           order.phone,
    p_address:         [order.address, order.city, order.country]
                         .filter(Boolean).join(", "),
    p_status:          order.status,
    p_total:           order.total,       // passed but IGNORED by DB
    p_payment_method:  order.paymentMethod,
    p_items: order.items.map((i) => ({
        product_id: i.productId,
        quantity:   i.quantity,
      })),
    // v4: idempotency_key — defaults to p_order_id if null
    p_idempotency_key: order.idempotencyKey ?? null,
  });

  if (error) {
    if (isDev) console.error("[Supabase] place_order RPC failed:", error.message);
    throw new Error(parseDbError(error.message));
  }

  const result = data as {
    verified_total: number;
    order_id:       string;
    access_token:   string;
    idempotent:     boolean;
  };

  return {
    verifiedTotal: result.verified_total ?? order.total,
    orderId:       result.order_id       ?? order.id,
    accessToken:   result.access_token   ?? "",
    idempotent:    result.idempotent     ?? false,
  };
}

// ── lookupOrder() — v4: token-based, no email enumeration ────────────────────
//
// v4 change: uses access_token (UUID) instead of email for lookup.
// Token is returned by insertOrder() and stored in localStorage.
// No email → no enumeration attack possible.

export interface OrderLookupResult {
  order_ref:      string;
  status:         Order["status"];
  total:          number;
  payment_method: string;
  created_at:     string;
  items: {
    name:              string;
    quantity:          number;
    price_at_purchase: number;
  }[];
}

export async function lookupOrder(
  orderRef:    string,
  accessToken: string
): Promise<OrderLookupResult | null> {
  const { data, error } = await supabase.rpc("lookup_order", {
    p_order_ref:    orderRef.trim().toUpperCase(),
    p_access_token: accessToken.trim(),
  });

  if (error) {
    if (isDev) console.error("[Supabase] lookup_order failed:", error.message);
    throw new Error("Unable to look up order. Please try again.");
  }

  return data as OrderLookupResult | null;
}

// ── Admin: update order status ────────────────────────────────────────────────

export async function updateOrderStatusById(
  id:     string,
  status: Order["status"]
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) {
    if (isDev) console.error("[Supabase] UPDATE order status failed:", error.message);
    throw new Error(error.message);
  }
}

// ── Cache invalidation ────────────────────────────────────────────────────────

export function useInvalidateOrders() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["orders"] });
}

// ── DB error parser ───────────────────────────────────────────────────────────
// Maps structured error codes from place_order() into user-friendly messages.

function parseDbError(raw: string): string {
  if (!raw) return "Order placement failed. Please try again.";

  const map: Record<string, string> = {
    EMPTY_CART:         "Your cart is empty.",
    TOO_MANY_ITEMS:     "Too many products in one order (max 50).",
    INVALID_ITEM:       "Cart contains an invalid item. Please refresh.",
    INVALID_PRODUCT_ID: "Cart contains an invalid product. Please refresh.",
    INVALID_QUANTITY:   "Invalid quantity — each item must be between 1 and 999.",
    PRODUCT_NOT_FOUND:  "One or more products are no longer available.",
    INVALID_PRICE:      "A product has a pricing issue. Please contact support.",
    DUPLICATE_PRODUCT:  "Duplicate product in cart. Please refresh and try again.",
    STOCK_RACE:         "A stock conflict occurred. Please try your order again.",
    OUT_OF_STOCK:       afterColon(raw),  // keep the specific product name
  };

  for (const [code, msg] of Object.entries(map)) {
    if (raw.includes(code)) return msg;
  }

  return afterColon(raw) || "Order placement failed. Please try again.";
}

function afterColon(s: string): string {
  const i = s.indexOf(":");
  return i > -1 ? s.slice(i + 1).trim() : s;
}
