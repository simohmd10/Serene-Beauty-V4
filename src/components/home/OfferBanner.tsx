import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import bannerImage from "@/assets/offer-banner.jpg";

const OfferBanner = () => {
  return (
    <section className="py-20 lg:py-28">
      <div className="container-beauty">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative rounded-2xl overflow-hidden min-h-[400px] flex items-center"
        >
          <img
            src={bannerImage}
            alt="Exclusive collection"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-foreground/40" />
          <div className="relative z-10 p-8 md:p-16 max-w-lg">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-background/80 mb-3">
              Exclusive Offer
            </p>
            <h2 className="font-display text-3xl md:text-5xl font-semibold text-background leading-tight mb-4">
              The Spring Collection
            </h2>
            <p className="font-body text-sm text-background/80 mb-8 leading-relaxed">
              Discover our limited edition spring collection. Luxurious formulas inspired by blooming gardens.
            </p>
            <Button variant="hero" size="lg" asChild className="bg-background text-foreground hover:bg-background/90">
              <Link to="/shop">Shop Collection</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default OfferBanner;
