import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Heart, Menu, X, Search } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/shop?search=${encodeURIComponent(q)}`);
  };

  const links = [
    { to: "/", label: "Home" },
    { to: "/shop", label: "Shop" },
    { to: "/about", label: "Our Values" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled || mobileOpen || searchOpen
            ? "bg-card/98 backdrop-blur-md shadow-soft"
            : "bg-transparent"
        }`}
      >
        <nav className="container-beauty flex items-center justify-between h-14 md:h-20">

          <Link
            to="/"
            className="font-display text-lg md:text-2xl font-semibold tracking-wide text-foreground"
          >
            Serene Beauty
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-body text-sm tracking-wide uppercase transition-colors duration-300 hover:text-primary ${
                  location.pathname === link.to
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              className={`p-2 transition-colors ${searchOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={searchOpen ? "Close search" : "Search"}
              aria-expanded={searchOpen}
              onClick={() => {
                setSearchOpen(!searchOpen);
                setSearchQuery("");
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={searchOpen ? "close-search" : "open-search"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                </motion.div>
              </AnimatePresence>
            </button>

            <button
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
            </button>

            <Link
              to="/cart"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors relative"
              aria-label="Shopping cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                  {totalItems}
                </span>
              )}
            </Link>

            <button
              className="md:hidden p-2 text-foreground ml-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mobileOpen ? "close" : "open"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </nav>

        {/* Search overlay */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="border-t border-border overflow-hidden"
            >
              <form
                onSubmit={handleSearchSubmit}
                className="container-beauty py-3 flex items-center gap-3"
              >
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products…"
                  className="flex-1 bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="submit"
                    className="font-body text-xs uppercase tracking-wider text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                  >
                    Search
                  </button>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden bg-card/98 backdrop-blur-md border-t border-border overflow-hidden"
            >
              <div className="container-beauty py-4 flex flex-col">
                {links.map((link, index) => (
                  <motion.div
                    key={link.to}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.07, duration: 0.25 }}
                  >
                    <Link
                      to={link.to}
                      className={`font-body text-sm tracking-widest uppercase py-4 flex items-center justify-between border-b border-border/50 transition-colors duration-200 ${
                        location.pathname === link.to
                          ? "text-primary"
                          : "text-foreground hover:text-primary"
                      }`}
                    >
                      <span>{link.label}</span>
                      {/* Active indicator */}
                      {location.pathname === link.to && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  </motion.div>
                ))}

                <div className="pt-5 pb-2">
                  <Link
                    to="/shop"
                    className="block w-full text-center bg-primary text-primary-foreground font-body text-sm tracking-widest uppercase py-3 rounded-lg transition-opacity hover:opacity-90"
                  >
                    Shop Now
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
