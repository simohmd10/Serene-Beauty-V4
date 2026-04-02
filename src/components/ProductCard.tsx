import { Star, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/data/products";
import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { addToCart } = useCart();
  const [wishlisted, setWishlisted] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
    >
      <Link to={`/product/${product.id}`} className="group block">
        <div className="relative bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-card-hover transition-all duration-500">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            {product.badge && (
              <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-body uppercase tracking-wider px-3 py-1 rounded-full">
                {product.badge}
              </span>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                setWishlisted(!wishlisted);
              }}
              className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
              aria-label="Add to wishlist"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  wishlisted ? "fill-primary text-primary" : "text-muted-foreground"
                }`}
              />
            </button>

            {/* Quick add overlay */}
            <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <Button
                variant="elegant"
                size="sm"
                className="w-full"
                onClick={handleAddToCart}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Add to Cart
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(product.rating) ? "fill-gold text-gold" : "text-border"
                  }`}
                />
              ))}
              <span className="text-[11px] text-muted-foreground ml-1">({product.reviewCount})</span>
            </div>
            <h3 className="font-display text-sm font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{product.description}</p>
            <div className="flex items-center gap-2">
              <span className="font-body font-semibold text-foreground">${product.price}</span>
              {product.originalPrice && (
                <span className="text-xs text-muted-foreground line-through">${product.originalPrice}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
