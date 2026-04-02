import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Leaf, Heart, Sparkles, Recycle } from "lucide-react";

const values = [
  { icon: Leaf, title: "Clean Beauty", desc: "Every product is formulated without harmful chemicals. We believe in beauty that's good for you and the planet." },
  { icon: Heart, title: "Cruelty Free", desc: "We never test on animals. All our products are certified cruelty-free and vegan-friendly." },
  { icon: Sparkles, title: "Premium Quality", desc: "We source the finest ingredients from around the world to create formulas that deliver real results." },
  { icon: Recycle, title: "Sustainable", desc: "From recyclable packaging to carbon-neutral shipping, sustainability is at the heart of everything we do." },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-beauty">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-4">Our Values</h1>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              At Serene Beauty, we believe that true beauty comes from within. Our mission is to create premium, conscious cosmetics that enhance your natural radiance while caring for our planet.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl p-8 shadow-soft text-center"
              >
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                  <v.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{v.title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
