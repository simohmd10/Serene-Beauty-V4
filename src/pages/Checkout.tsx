import React, { useEffect, useRef } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, ShoppingBag, ArrowLeft, Truck,
  Banknote, Phone, AlertTriangle, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { insertOrder } from "@/hooks/useOrders";
import { COUNTRIES, getDialCode } from "@/data/countries";

// ── Zod schema ────────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  email:     z.string().email("Please enter a valid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName:  z.string().min(2, "Last name must be at least 2 characters"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[\d\s\+\-\(\)]+$/, "Phone number must contain only digits")
    .refine((v) => v.replace(/\D/g, "").length >= 7,  "Phone number is too short")
    .refine((v) => v.replace(/\D/g, "").length <= 15, "Phone number is too long"),
  address: z.string().min(5, "Please enter a valid street address"),
  city:    z.string().min(2, "Please enter a valid city"),
  state:   z.string().optional(),
  zip:     z.string().optional(),
  country: z.string().min(2, "Please select a country"),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

// ── Shared input component ────────────────────────────────────────────────────

const InputField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(({ label, error, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
      {label}
    </label>
    <input
      ref={ref}
      {...props}
      className={`h-11 px-4 rounded-lg border bg-card font-body text-sm text-foreground
        placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-all
        ${error
          ? "border-destructive focus:ring-destructive/30"
          : "border-border focus:ring-primary/30"
        }`}
    />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));
InputField.displayName = "InputField";

// ── Copy-to-clipboard button ──────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      className="ml-1 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();

  const [orderPlaced,  setOrderPlaced]  = useState(false);
  const [orderError,   setOrderError]   = useState<string | null>(null);
  const [savedTotal,   setSavedTotal]   = useState(0);
  const [priceChanged, setPriceChanged] = useState(false);

  // v4: access_token returned by DB — used for order lookup
  const [accessToken,  setAccessToken]  = useState<string | null>(null);

  // Stable UUIDs generated once per mount — survive re-renders
  // v4: orderId also serves as idempotency_key inside the RPC
  const [orderId]  = useState(() => crypto.randomUUID());
  const [orderRef] = useState(
    () => `SB-${Date.now().toString(36).toUpperCase().slice(-6)}`
  );

  const {
    register, handleSubmit, watch, setValue, setError, clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { country: "MA", phone: "+212 " },
  });

  const country    = watch("country");
  const phone      = watch("phone");
  const isMorocco  = country === "MA";
  const prevCountry = useRef("MA");

  // Auto-update phone prefix when country changes
  useEffect(() => {
    const prev = prevCountry.current;
    if (country === prev) return;
    prevCountry.current = country;
    const newDial  = getDialCode(country);
    if (!newDial) return;
    const prevDial = getDialCode(prev);
    const cur      = phone ?? "";
    const stripped = prevDial
      ? cur.startsWith(prevDial)
        ? cur.slice(prevDial.length).trimStart()
        : cur.replace(/^\+\d{1,4}\s?/, "").trimStart()
      : cur;
    setValue("phone", stripped ? `${newDial} ${stripped}` : `${newDial} `);
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live phone prefix validation
  useEffect(() => {
    if (!phone || !country) return;
    const dial   = getDialCode(country);
    if (!dial) return;
    const digits = phone.replace(/\D/g, "");
    const prefix = dial.replace("+", "");
    if (digits.length > prefix.length && !digits.startsWith(prefix)) {
      setError("phone", { type: "manual", message: `Phone must start with ${dial}` });
    } else {
      clearErrors("phone");
    }
  }, [phone, country, setError, clearErrors]);

  const onSubmit = async (data: CheckoutFormData) => {
    setOrderError(null);
    setPriceChanged(false);

    const missingId = items.find((i) => !i.product.id);
    if (missingId) {
      setOrderError("Cart contains invalid items. Please refresh and try again.");
      return;
    }

    const cartTotal = parseFloat(totalPrice.toFixed(2));

    try {
      const result = await insertOrder({
        id:        orderId,
        order_ref: orderRef,
        // v4: orderId doubles as idempotency_key — safe to retry
        // If user double-clicks, second call returns idempotent:true
        customer:      `${data.firstName} ${data.lastName}`,
        email:         data.email,
        phone:         data.phone,
        address:       data.address,
        city:          data.city,
        state:         data.state ?? "",
        zip:           data.zip   ?? "",
        country:       data.country,
        status:        "pending",
        total:         cartTotal,
        items: items.map((i) => ({
          productId: i.product.id,   // DB fetches real price from this
          name:      i.product.name,
          quantity:  i.quantity,
          price:     i.product.price, // display only — DB ignores
        })),
        paymentMethod: "cash_on_delivery",
      });

      setSavedTotal(result.verifiedTotal);
      setAccessToken(result.accessToken);

      // v4: persist token in localStorage so customer can track later
      if (result.accessToken) {
        localStorage.setItem(
          `order_token_${orderRef}`,
          JSON.stringify({
            orderRef:    orderRef,
            accessToken: result.accessToken,
            placedAt:    new Date().toISOString(),
          })
        );
      }

      // Show notice if DB-recalculated total differs from cart display
      if (Math.abs(result.verifiedTotal - cartTotal) > 0.01) {
        setPriceChanged(true);
      }

      setOrderPlaced(true);
      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Checkout] insertOrder failed:", msg);
      setOrderError(msg);
    }
  };

  const dialCode = getDialCode(country);

  // ── Empty cart guard ────────────────────────────────────────────────────────
  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-20">
          <div className="container-beauty max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
              <h1 className="font-display text-2xl font-semibold text-foreground mb-3">
                Your cart is empty
              </h1>
              <p className="font-body text-sm text-muted-foreground mb-8">
                Add items to your cart before checking out.
              </p>
              <Button variant="hero" size="lg" asChild>
                <Link to="/shop">Continue Shopping</Link>
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-beauty max-w-5xl">
          <AnimatePresence mode="wait">

            {/* ── Success screen ─────────────────────────────────────────── */}
            {orderPlaced ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16 max-w-lg mx-auto"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
                  className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-12 h-12 text-primary" />
                </motion.div>

                <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-3">
                  Order Placed Successfully!
                </h1>

                {/* Price change notice */}
                {priceChanged && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-left">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="font-body text-xs text-amber-700">
                      One or more prices were updated since you added items to your cart.
                      The confirmed total below reflects the current prices.
                    </p>
                  </div>
                )}

                <div className="bg-card border border-primary/20 rounded-xl p-5 mb-6 text-left">
                  <p className="font-body text-sm text-foreground font-medium mb-1">
                    Your order has been placed successfully.
                  </p>
                  <p className="font-body text-sm text-muted-foreground">
                    We will contact you shortly to confirm delivery. Please keep your phone nearby.
                  </p>
                </div>

                {/* Order details */}
                <div className="space-y-2 mb-8">
                  <div className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-4 py-2.5">
                    <span className="text-muted-foreground font-body">Order Reference</span>
                    <span className="flex items-center font-semibold text-foreground tracking-wider font-mono">
                      {orderRef}
                      <CopyButton value={orderRef} />
                    </span>
                  </div>

                  {/* v4: access_token shown to customer for order tracking */}
                  {accessToken && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                      <p className="font-body text-xs text-blue-700 mb-1 font-medium">
                        🔑 Your Order Access Token — save this to track your order
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-blue-800 break-all">
                          {accessToken}
                        </span>
                        <CopyButton value={accessToken} />
                      </div>
                      <p className="font-body text-[11px] text-blue-600 mt-1">
                        You'll need this together with your Order Reference to check order status.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-4 py-2.5">
                    <span className="text-muted-foreground font-body">Payment</span>
                    <span className="font-semibold text-foreground font-body">Cash on Delivery</span>
                  </div>
                  <div className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-4 py-2.5">
                    <span className="text-muted-foreground font-body">Confirmed Total</span>
                    <span className="font-semibold text-foreground font-display">
                      ${savedTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="hero" size="lg" asChild>
                    <Link to="/order-status">Track Order</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/shop">Continue Shopping</Link>
                  </Button>
                </div>
              </motion.div>

            ) : (
              /* ── Checkout form ─────────────────────────────────────────── */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Link
                  to="/cart"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Cart
                </Link>

                <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-10">
                  Checkout
                </h1>

                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid lg:grid-cols-5 gap-10">

                    {/* ── Left: Form ────────────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-10">

                      {/* Contact */}
                      <section>
                        <h2 className="font-display text-lg font-semibold text-foreground mb-5">
                          Contact Information
                        </h2>
                        <div className="space-y-4">
                          <InputField
                            label="Email address"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            error={errors.email?.message}
                            {...register("email")}
                          />
                          <div className="flex flex-col gap-1">
                            <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                              Phone number
                            </label>
                            <div className="flex gap-2 items-start">
                              {dialCode && (
                                <div className="flex-shrink-0 h-11 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-muted font-body text-sm text-muted-foreground select-none">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>{dialCode}</span>
                                </div>
                              )}
                              <div className="flex-1 flex flex-col gap-1">
                                <input
                                  type="tel"
                                  autoComplete="tel"
                                  placeholder={
                                    isMorocco ? "+212 6XX XXX XXX"
                                    : dialCode  ? `${dialCode} ...`
                                    : "+1 555 000 0000"
                                  }
                                  className={`h-11 px-4 rounded-lg border bg-card font-body text-sm
                                    text-foreground placeholder:text-muted-foreground/60 focus:outline-none
                                    focus:ring-2 transition-all w-full
                                    ${errors.phone ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-primary/30"}`}
                                  {...register("phone")}
                                />
                                {errors.phone && (
                                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Shipping */}
                      <section>
                        <h2 className="font-display text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-primary" />
                          Shipping Address
                        </h2>
                        <div className="space-y-4">
                          <div className="flex flex-col gap-1">
                            <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                              Country
                            </label>
                            <select
                              autoComplete="country"
                              className={`h-11 px-4 rounded-lg border bg-card font-body text-sm text-foreground
                                focus:outline-none focus:ring-2 transition-all
                                ${errors.country ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-primary/30"}`}
                              {...register("country")}
                            >
                              {COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>{c.name} ({c.dial})</option>
                              ))}
                            </select>
                            {errors.country && (
                              <p className="text-xs text-destructive">{errors.country.message}</p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <InputField label="First name" placeholder={isMorocco ? "Mohammed" : "Jane"}
                              autoComplete="given-name"  error={errors.firstName?.message} {...register("firstName")} />
                            <InputField label="Last name"  placeholder={isMorocco ? "El Amrani" : "Doe"}
                              autoComplete="family-name" error={errors.lastName?.message}  {...register("lastName")} />
                          </div>

                          <InputField label="City"
                            placeholder={isMorocco ? "Casablanca, Rabat, Marrakech…" : "City"}
                            autoComplete="address-level2" error={errors.city?.message} {...register("city")} />

                          <InputField label="Street address"
                            placeholder={isMorocco ? "Numéro, Rue, Quartier" : "123 Main Street, Apt 4B"}
                            autoComplete="street-address" error={errors.address?.message} {...register("address")} />

                          {!isMorocco && (
                            <InputField label="State / Province" placeholder="NY"
                              autoComplete="address-level1" error={errors.state?.message} {...register("state")} />
                          )}

                          <InputField
                            label={isMorocco ? "Postal code (optional)" : "ZIP / Postal code"}
                            placeholder={isMorocco ? "e.g. 20000" : "10001"}
                            autoComplete="postal-code" error={errors.zip?.message} {...register("zip")} />
                        </div>
                      </section>

                      {/* Payment */}
                      <section>
                        <h2 className="font-display text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-primary" />
                          Payment Method
                        </h2>
                        <div className="bg-card border-2 border-primary/30 rounded-xl p-5 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Banknote className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-body text-sm font-semibold text-foreground">
                              Cash on Delivery
                            </p>
                            <p className="font-body text-xs text-muted-foreground mt-1">
                              Pay when your order arrives. Our team will call to confirm the delivery time.
                            </p>
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* ── Right: Order summary ──────────────────────────── */}
                    <div className="lg:col-span-2">
                      <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                        <h3 className="font-display text-lg font-semibold text-foreground mb-5">
                          Order Summary
                        </h3>

                        <div className="space-y-4 mb-5">
                          {items.map((item) => (
                            <div key={item.product.id} className="flex gap-3 items-center">
                              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                <img
                                  src={item.product.image}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-body text-xs font-medium text-foreground truncate">
                                  {item.product.name}
                                </p>
                                <p className="font-body text-xs text-muted-foreground">
                                  Qty: {item.quantity}
                                </p>
                              </div>
                              <span className="font-body text-sm font-semibold text-foreground flex-shrink-0">
                                ${(item.product.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-border pt-4 space-y-2 mb-5">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="text-foreground">${totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Shipping</span>
                            <span className="text-primary font-medium">Free</span>
                          </div>
                          <div className="border-t border-border pt-3 flex justify-between">
                            <span className="font-body font-semibold text-foreground">Total</span>
                            <span className="font-display text-xl font-semibold text-foreground">
                              ${totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {orderError && (
                          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive font-body leading-relaxed">
                            {orderError}
                          </div>
                        )}

                        <Button
                          type="submit"
                          variant="hero"
                          size="lg"
                          className="w-full"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10"
                                  stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor"
                                  d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              Placing Order…
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Banknote className="w-4 h-4" />
                              Place Order · ${totalPrice.toFixed(2)}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>

                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
