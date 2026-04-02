import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { motion } from "framer-motion";

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const searchQuery    = searchParams.get("search")   || "";
  const activeBadge    = searchParams.get("badge")    || "";
  const [sortBy, setSortBy] = useState(activeBadge === "Best Seller" ? "rating" : "featured");

  const { data: allProducts = [], isLoading, error: productsError } = useProducts();

  // FIX H-2: Use dynamic categories from Supabase instead of static array from products.ts
  const { data: categories = [], isLoading: catsLoading } = useCategories();

  const filtered = allProducts
    .filter((p) => activeCategory === "all" || p.category === activeCategory)
    .filter((p) => !activeBadge || p.badge === activeBadge)
    .filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "price-low":  return a.price - b.price;
      case "price-high": return b.price - a.price;
      case "rating":     return b.rating - a.rating;
      default:           return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-beauty">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-3">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : activeBadge === "Best Seller"
                ? "Best Sellers"
                : activeBadge === "New"
                ? "New Arrivals"
                : "Shop"}
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              {searchQuery
                ? `${sorted.length} product${sorted.length !== 1 ? "s" : ""} found`
                : "Discover our curated collection"}
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <button
                  onClick={() => setSearchParams({})}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-body bg-primary/10 text-primary border border-primary/20 transition-all hover:bg-primary/20"
                >
                  <X className="w-3 h-3" />
                  Clear search
                </button>
              )}
              <button
                onClick={() => setSearchParams(searchQuery ? { search: searchQuery } : {})}
                className={`px-4 py-2 rounded-full text-xs font-body uppercase tracking-wider transition-all ${
                  activeCategory === "all"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                All
              </button>

              {/* FIX H-2: Render categories from DB, not from static products.ts */}
              {!catsLoading && categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() =>
                    setSearchParams(
                      searchQuery
                        ? { search: searchQuery, category: cat.slug }
                        : { category: cat.slug }
                    )
                  }
                  className={`px-4 py-2 rounded-full text-xs font-body uppercase tracking-wider transition-all ${
                    activeCategory === cat.slug
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-card font-body text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {productsError ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <p className="font-display text-xl text-foreground mb-2">Unable to load products</p>
              <p className="font-body text-sm text-muted-foreground">
                Could not connect to the database. Please try again later.
              </p>
            </motion.div>
          ) : isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <p className="font-display text-xl text-foreground mb-2">No products found</p>
              <p className="font-body text-sm text-muted-foreground mb-6">
                {searchQuery
                  ? `No results for "${searchQuery}". Try a different search term.`
                  : "No products in this category yet."}
              </p>
              <button
                onClick={() => setSearchParams({})}
                className="font-body text-sm text-primary hover:underline"
              >
                View all products
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {sorted.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Shop;
