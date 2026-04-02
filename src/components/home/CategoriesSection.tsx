import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import skincare from "@/assets/product-skincare.jpg";
import makeup from "@/assets/product-makeup.jpg";
import fragrance from "@/assets/product-fragrance.jpg";
import tools from "@/assets/product-tools.jpg";

const cats = [
  { name: "Skincare", slug: "skincare", image: skincare, desc: "Nourish & protect your skin" },
  { name: "Makeup", slug: "makeup", image: makeup, desc: "Enhance your natural beauty" },
  { name: "Fragrance", slug: "fragrance", image: fragrance, desc: "Discover your signature scent" },
  { name: "Beauty Tools", slug: "tools", image: tools, desc: "Perfect your beauty routine" },
];

const CategoriesSection = () => {
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
            Explore
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
            Shop by Category
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {cats.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Link
                to={`/shop?category=${cat.slug}`}
                className="group block relative rounded-xl overflow-hidden aspect-[3/4]"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-display text-lg font-semibold text-background mb-1">
                    {cat.name}
                  </h3>
                  <p className="font-body text-xs text-background/70">{cat.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
