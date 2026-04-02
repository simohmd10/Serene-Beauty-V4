import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-beauty.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Luxury beauty products"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background/90 sm:bg-gradient-to-r sm:from-background/85 sm:via-background/50 sm:to-transparent" />
      </div>

      <div className="container-beauty relative z-10 py-24 sm:py-32 w-full">
        <div className="max-w-xl mx-auto sm:ml-auto sm:mr-8 lg:mr-16 text-center sm:text-right">

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-body text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
          >
            Premium Cosmetics Collection
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-4xl sm:text-5xl lg:text-7xl font-semibold text-foreground leading-tight mb-6"
          >
            Timeless
            <br />
            <span className="text-gradient-rose italic">Elegance</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="font-body text-sm sm:text-base text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto sm:ml-auto"
          >
            Premium cosmetics designed to enhance your natural beauty. Discover our curated collection of skincare, makeup, and fragrances.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center sm:justify-end"
          >
            <Button variant="hero" size="xl" asChild className="w-full sm:w-auto">
              <Link to="/shop">Shop Now</Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild className="w-full sm:w-auto">
              <Link to="/shop">Browse Categories</Link>
            </Button>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
