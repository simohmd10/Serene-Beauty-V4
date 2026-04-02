import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { motion } from "framer-motion";

const BestSellers = () => {
  const { data: allProducts = [], isLoading } = useProducts();
  const bestSellers = allProducts.filter((p) => p.isBestSeller).slice(0, 4);

  return (
    <section className="py-20 lg:py-28">
      <div className="container-beauty">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="font-body text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            Most Loved
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
            Best Sellers
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
              ))
            : bestSellers.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
        </div>
      </div>
    </section>
  );
};

export default BestSellers;
