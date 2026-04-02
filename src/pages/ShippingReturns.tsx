import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Truck, RotateCcw, Clock, MapPin } from "lucide-react";

const sections = [
  {
    icon: Truck,
    title: "Shipping",
    items: [
      { label: "Standard Shipping", desc: "2–5 business days · Free on orders over $50" },
      { label: "Express Shipping", desc: "1–2 business days · $9.99" },
      { label: "International Shipping", desc: "7–14 business days · Rates vary by destination" },
    ],
  },
  {
    icon: Clock,
    title: "Processing Time",
    items: [
      { label: "Order Processing", desc: "All orders are processed within 1–2 business days after payment confirmation." },
      { label: "Weekend & Holidays", desc: "Orders placed on weekends or public holidays will be processed the next business day." },
    ],
  },
  {
    icon: RotateCcw,
    title: "Returns & Exchanges",
    items: [
      { label: "7-Day Return Policy", desc: "You may return unused, unopened items within 7 days of delivery for a full refund." },
      { label: "How to Return", desc: "Contact us at hello@serenebeauty.com with your order number. We'll send you a prepaid return label." },
      { label: "Refund Processing", desc: "Refunds are processed within 5–7 business days after we receive the returned item." },
    ],
  },
  {
    icon: MapPin,
    title: "Exceptions",
    items: [
      { label: "Non-Returnable Items", desc: "Opened beauty products, gift cards, and sale items cannot be returned for hygiene reasons." },
      { label: "Damaged or Incorrect Items", desc: "If you received a damaged or wrong item, please contact us within 48 hours of delivery." },
    ],
  },
];

const ShippingReturns = () => {
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
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-4">
              Shipping & Returns
            </h1>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              We want your Serene Beauty experience to be seamless — from the moment you order to the day it arrives at your door.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-8">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-8 shadow-soft"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-foreground">{section.title}</h2>
                </div>
                <ul className="space-y-4">
                  {section.items.map((item) => (
                    <li key={item.label} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                      <p className="font-body text-sm font-semibold text-foreground mb-1">{item.label}</p>
                      <p className="font-body text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShippingReturns;
