import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import { AdminDataProvider } from "@/context/AdminDataContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Checkout from "./pages/Checkout";
import OrderStatus from "./pages/OrderStatus";
import ShippingReturns from "./pages/ShippingReturns";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import ProductForm from "./pages/admin/ProductForm";
import Orders from "./pages/admin/Orders";
import Customers from "./pages/admin/Customers";
import Categories from "./pages/admin/Categories";
import Settings from "./pages/admin/Settings";
import AuditLog from "./pages/admin/AuditLog";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: {
      onError: import.meta.env.DEV
        ? (error: unknown) => console.error("[QueryClient] Mutation error:", error)
        : undefined,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return isAuthenticated ? <>{children}</> : <Navigate to="/admin" replace />;
}

function AdminRoot() {
  const { isAuthenticated, isLoading } = useAdminAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />;
}

// AdminDataProvider scoped to /admin/* only (Fix H-4: was wrapping entire app)
function AdminSection() {
  return (
    <AdminDataProvider>
      <Routes>
        <Route path="/" element={<AdminRoot />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard"         element={<Dashboard />} />
          <Route path="products"          element={<Products />} />
          <Route path="products/new"      element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="orders"            element={<Orders />} />
          <Route path="customers"         element={<Customers />} />
          <Route path="categories"        element={<Categories />} />
          <Route path="audit-log"         element={<AuditLog />} />
          <Route path="settings"          element={<Settings />} />
        </Route>
      </Routes>
    </AdminDataProvider>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <AdminAuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Storefront */}
                <Route path="/"                  element={<Index />} />
                <Route path="/shop"              element={<Shop />} />
                <Route path="/product/:id"       element={<ProductDetail />} />
                <Route path="/cart"              element={<Cart />} />
                <Route path="/about"             element={<About />} />
                <Route path="/contact"           element={<Contact />} />
                <Route path="/checkout"          element={<Checkout />} />
                <Route path="/order-status"      element={<OrderStatus />} />
                <Route path="/shipping-returns"  element={<ShippingReturns />} />
                <Route path="/privacy-policy"    element={<PrivacyPolicy />} />

                {/* Admin — isolated with its own data provider */}
                <Route path="/admin/*" element={<AdminSection />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AdminAuthProvider>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
