import { Link } from "react-router-dom";
import { Instagram, Facebook, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background/80 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 text-center sm:text-left">
          {/* Brand */}
          <div>
            <h3 className="font-display text-xl font-semibold text-background mb-4">Serene Beauty</h3>
            <p className="text-sm leading-relaxed text-background/60">
              Premium cosmetics designed to enhance your natural beauty. Cruelty-free, sustainable, and made with love.
            </p>
            <div className="flex gap-4 mt-6 justify-center sm:justify-start">
              <a href="#" className="text-background/50 hover:text-background transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/50 hover:text-background transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/50 hover:text-background transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-sm uppercase tracking-wider text-background mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { label: "Shop All", to: "/shop" },
                { label: "Best Sellers", to: "/shop?badge=Best+Seller" },
                { label: "New Arrivals", to: "/shop?badge=New" },
                { label: "Gift Sets", to: "/shop?search=gift" },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm text-background/60 hover:text-background transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display text-sm uppercase tracking-wider text-background mb-4">Company</h4>
            <ul className="space-y-3">
              {[
                { label: "Our Values", to: "/about" },
                { label: "Contact", to: "/contact" },
                { label: "Track Your Order", to: "/order-status" },
                { label: "Shipping & Returns", to: "/shipping-returns" },
                { label: "Privacy Policy", to: "/privacy-policy" },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm text-background/60 hover:text-background transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-sm uppercase tracking-wider text-background mb-4">Get in Touch</h4>
            <ul className="space-y-3 text-sm text-background/60">
              <li>hello@serenebeauty.com</li>
              <li>+1 (555) 123-4567</li>
              <li>123 Beauty Boulevard<br />New York, NY 10001</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-12 pt-8 text-center">
          <p className="text-xs text-background/40">
            © {new Date().getFullYear()} Serene Beauty. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
