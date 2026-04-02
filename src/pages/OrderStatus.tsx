import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Package, CheckCircle2, Clock,
  Truck, XCircle, RotateCcw, ArrowLeft, Key,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { lookupOrder, type OrderLookupResult } from "@/hooks/useOrders";

// ── Zod schema — v4: uses access_token instead of email ──────────────────────

const schema = z.object({
  orderRef: z
    .string()
    .min(1, "Order reference is required")
    .transform((v) => v.trim().toUpperCase()),
  accessToken: z
    .string()
    .min(32, "Access token is required")  // UUIDs are 36 chars
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Invalid token format"
    ),
});

type FormData = z.infer<typeof schema>;

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; icon: React.ElementType;
  color: string; bg: string; step: number;
}> = {
  pending:    { label: "Order Received", icon: Clock,        color: "text-amber-600",  bg: "bg-amber-50",  step: 1 },
  processing: { label: "Processing",     icon: RotateCcw,    color: "text-blue-600",   bg: "bg-blue-50",   step: 2 },
  shipped:    { label: "Shipped",        icon: Truck,        color: "text-purple-600", bg: "bg-purple-50", step: 3 },
  delivered:  { label: "Delivered",      icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50",  step: 4 },
  cancelled:  { label: "Cancelled",      icon: XCircle,      color: "text-red-600",    bg: "bg-red-50",    step: 0 },
};

const STEPS = ["pending", "processing", "shipped", "delivered"];

// ── Saved order entry from localStorage ──────────────────────────────────────

interface SavedOrder {
  orderRef:    string;
  accessToken: string;
  placedAt:    string;
}

function getSavedOrders(): SavedOrder[] {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("order_token_"));
    return keys
      .map((k) => JSON.parse(localStorage.getItem(k) ?? "null"))
      .filter(Boolean)
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
  } catch {
    return [];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrderStatus() {
  const [result,   setResult]   = useState<OrderLookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saved,    setSaved]    = useState<SavedOrder[]>([]);

  useEffect(() => {
    setSaved(getSavedOrders());
  }, []);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  // Auto-fill from saved orders
  const fillSaved = (order: SavedOrder) => {
    setValue("orderRef",    order.orderRef);
    setValue("accessToken", order.accessToken);
  };

  const onSubmit = async (data: FormData) => {
    setResult(null);
    setNotFound(false);
    setApiError(null);

    try {
      const found = await lookupOrder(data.orderRef, data.accessToken);
      if (!found) {
        setNotFound(true);
      } else {
        setResult(found);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const cfg = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG.pending) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-beauty max-w-lg">

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
              Track Your Order
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              Enter your order reference and the access token from your confirmation screen.
            </p>
          </div>

          {/* Auto-fill from saved orders */}
          {saved.length > 0 && !result && (
            <div className="mb-6 bg-muted/40 border border-border rounded-xl p-4">
              <p className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" /> Recent orders on this device
              </p>
              <div className="space-y-2">
                {saved.slice(0, 3).map((s) => (
                  <button
                    key={s.orderRef}
                    onClick={() => fillSaved(s)}
                    className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <span className="font-mono text-sm font-medium text-foreground">
                      {s.orderRef}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.placedAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lookup form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-8">
            <div className="flex flex-col gap-1">
              <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                Order Reference
              </label>
              <input
                {...register("orderRef")}
                placeholder="SB-XXXXXX"
                className={`h-11 px-4 rounded-lg border bg-card font-mono text-sm tracking-wider
                  text-foreground uppercase placeholder:normal-case placeholder:tracking-normal
                  focus:outline-none focus:ring-2 transition-all
                  ${errors.orderRef ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-primary/30"}`}
              />
              {errors.orderRef && (
                <p className="text-xs text-destructive">{errors.orderRef.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Key className="w-3 h-3" /> Access Token
              </label>
              <input
                {...register("accessToken")}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className={`h-11 px-4 rounded-lg border bg-card font-mono text-xs text-foreground
                  placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all
                  ${errors.accessToken ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-primary/30"}`}
              />
              {errors.accessToken && (
                <p className="text-xs text-destructive">{errors.accessToken.message}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                The access token was shown on your order confirmation screen.
              </p>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Looking up…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" /> Check Order Status
                </span>
              )}
            </Button>
          </form>

          {/* Results */}
          <AnimatePresence mode="wait">

            {apiError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive font-body"
              >
                {apiError}
              </motion.div>
            )}

            {notFound && !apiError && (
              <motion.div
                key="not-found"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-display text-base font-semibold text-foreground mb-1">
                  Order not found
                </p>
                <p className="font-body text-sm text-muted-foreground">
                  No order matches that reference and token. Please check your confirmation screen.
                </p>
              </motion.div>
            )}

            {result && cfg && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Status card */}
                <div className={`rounded-xl border p-5 ${cfg.bg}`}>
                  <div className="flex items-center gap-3 mb-1">
                    <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                    <p className={`font-display text-base font-semibold ${cfg.color}`}>
                      {cfg.label}
                    </p>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    Ref: {result.order_ref}
                  </p>
                </div>

                {/* Progress bar */}
                {result.status !== "cancelled" && (
                  <div className="flex items-center gap-1">
                    {STEPS.map((step, i) => {
                      const done = (STATUS_CONFIG[step]?.step ?? 0) <= (cfg.step ?? 0);
                      return (
                        <div
                          key={step}
                          className={`h-1.5 flex-1 rounded-full transition-colors
                            ${done ? "bg-primary" : "bg-muted"}
                            ${i === 0 ? "rounded-l-full" : ""}
                            ${i === STEPS.length - 1 ? "rounded-r-full" : ""}`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Summary */}
                <div className="bg-card border border-border rounded-xl divide-y">
                  <div className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="text-muted-foreground font-body">Order Date</span>
                    <span className="font-body text-foreground">
                      {new Date(result.created_at).toLocaleDateString("en-US", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="text-muted-foreground font-body">Payment</span>
                    <span className="font-body text-foreground capitalize">
                      {result.payment_method.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="font-body font-semibold text-foreground">Total</span>
                    <span className="font-display font-semibold text-foreground">
                      ${Number(result.total).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                {result.items.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      Items
                    </p>
                    <div className="space-y-2">
                      {result.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-foreground font-body">
                            {item.name}
                            <span className="text-muted-foreground"> × {item.quantity}</span>
                          </span>
                          <span className="font-body text-foreground">
                            ${(item.price_at_purchase * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}
