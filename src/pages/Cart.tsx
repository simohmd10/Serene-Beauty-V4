import { Link } from "react-router-dom";
import { Minus, Plus, X, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { motion } from "framer-motion";


const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-beauty max-w-4xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl md:text-4xl font-semibold text-foreground text-center mb-12"
          >
            Shopping Cart
          </motion.h1>

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
              <p className="font-body text-muted-foreground mb-6">Your cart is empty</p>
              <Button variant="hero" size="lg" asChild>
                <Link to="/shop">Continue Shopping</Link>
              </Button>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <motion.div
                    key={item.product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 bg-card rounded-xl p-4 shadow-soft"
                  >
                    <Link to={`/product/${item.product.id}`} className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/product/${item.product.id}`} className="font-display text-sm font-medium text-foreground hover:text-primary transition-colors">
                          {item.product.name}
                        </Link>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">${item.product.price}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2 border border-border rounded-md">
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1.5 text-muted-foreground hover:text-foreground">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1.5 text-muted-foreground hover:text-foreground">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-body font-semibold text-sm text-foreground">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-card rounded-xl p-6 shadow-soft h-fit sticky top-24">
                <h3 className="font-display text-lg font-semibold text-foreground mb-6">Order Summary</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-foreground">Free</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-body font-semibold text-foreground">Total</span>
                    <span className="font-display text-lg font-semibold text-foreground">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
                <Button variant="hero" size="lg" className="w-full" asChild>
                  <Link to="/checkout">Checkout</Link>
                </Button>
                <Link to="/shop" className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-4">
                  <ArrowLeft className="w-3 h-3" /> Continue Shopping
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
