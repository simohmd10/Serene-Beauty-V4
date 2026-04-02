import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

const sections = [
  {
    title: "Information We Collect",
    content:
      "We collect information you provide directly to us, such as when you create an account, place an order, or contact us for support. This includes your name, email address, shipping address, phone number, and payment information.",
  },
  {
    title: "How We Use Your Information",
    content:
      "We use the information we collect to process your orders, send order confirmations and shipping updates, respond to your questions, and improve our products and services. We do not sell your personal data to third parties.",
  },
  {
    title: "Information Sharing",
    content:
      "We share your information only with trusted third-party service providers who assist us in operating our website and delivering your orders (e.g., payment processors, shipping carriers). These parties are contractually obligated to keep your data secure.",
  },
  {
    title: "Cookies",
    content:
      "Our website uses cookies to enhance your browsing experience, remember your preferences, and analyze site traffic. You can control cookie settings through your browser. Disabling cookies may affect some features of the site.",
  },
  {
    title: "Data Security",
    content:
      "We implement industry-standard security measures to protect your personal information. All payment transactions are encrypted using SSL technology. However, no method of transmission over the Internet is 100% secure.",
  },
  {
    title: "Your Rights",
    content:
      "You have the right to access, correct, or delete your personal data at any time. To exercise these rights, please contact us at hello@serenebeauty.com. We will respond to your request within 30 days.",
  },
  {
    title: "Changes to This Policy",
    content:
      "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date. Your continued use of our site constitutes acceptance of the revised policy.",
  },
  {
    title: "Contact Us",
    content:
      "If you have any questions about this Privacy Policy or how we handle your data, please contact us at hello@serenebeauty.com or write to us at 123 Beauty Boulevard, New York, NY 10001.",
  },
];

const PrivacyPolicy = () => {
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
              Privacy Policy
            </h1>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Last updated: March 2026. Your privacy matters to us. This policy explains how Serene Beauty collects, uses, and protects your personal information.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-6">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-8 shadow-soft"
              >
                <h2 className="font-display text-lg font-semibold text-foreground mb-3">
                  {section.title}
                </h2>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
