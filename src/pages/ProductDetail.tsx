import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Star, Heart, ShoppingBag, Minus, Plus, ArrowLeft, Banknote, Truck, RotateCcw, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useProduct, useProducts } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  // FIX M-1: Use useProduct(id) for a single-row fetch instead of
  // fetching ALL products and filtering client-side.
  const { data: product, isLoading } = useProduct(id);

  // Related products: fetch all only for the "related" section,
  // using the cached query (React Query deduplicates if already fetched).
  const { data: allProducts = [] } = useProducts();
  const related = product
    ? allProducts.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4)
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 container-beauty">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
            <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
            <div className="space-y-4 flex flex-col justify-center">
              <div className="h-6 bg-muted animate-pulse rounded w-1/4" />
              <div className="h-10 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
              <div className="h-20 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center container-beauty">
          <h1 className="font-display text-2xl text-foreground">Product not found</h1>
          <Link to="/shop" className="text-primary text-sm mt-4 inline-block">Back to Shop</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, quantity);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-beauty">
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Shop
          </Link>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="aspect-square rounded-2xl overflow-hidden bg-muted"
            >
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col justify-center"
            >
              {product.badge && (
                <span className="inline-block bg-accent text-accent-foreground text-[10px] font-body uppercase tracking-wider px-3 py-1 rounded-full w-fit mb-4">
                  {product.badge}
                </span>
              )}
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-3">
                {product.name}
              </h1>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
                    />
                  ))}
                </div>
                <span className="font-body text-sm text-muted-foreground">
                  {product.rating} ({product.reviewCount} reviews)
                </span>
              </div>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-display text-3xl font-semibold text-foreground">
                  ${product.price}
                </span>
                {product.originalPrice && (
                  <span className="font-body text-lg text-muted-foreground line-through">
                    ${product.originalPrice}
                  </span>
                )}
              </div>

              <p className="font-body text-sm text-muted-foreground leading-relaxed mb-8">
                {product.description}
              </p>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-body text-sm font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-11 h-11 flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Button variant="hero" size="lg" className="flex-1" onClick={handleAddToCart}>
                  <ShoppingBag className="w-4 h-4 mr-2" /> Add to Cart
                </Button>
                <button className="w-11 h-11 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <Heart className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-border">
                {[
                  { icon: Truck,      text: "Free shipping on orders $50+" },
                  { icon: RotateCcw,  text: "Easy 30-day returns" },
                  { icon: Banknote,   text: "Cash on delivery available" },
                  { icon: Headphones, text: "24/7 customer support" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-2">
                    <Icon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="font-body text-xs text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {related.length > 0 && (
            <section className="mt-20">
              <h2 className="font-display text-2xl font-semibold text-foreground mb-8">
                You May Also Like
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {related.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
