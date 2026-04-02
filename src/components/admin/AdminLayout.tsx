import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Package, ShoppingBag, Users,
  Tag, Settings, Menu, LogOut, Store, MoreHorizontal, ScrollText,
} from "lucide-react";

const navItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/products", icon: Package, label: "Products" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/categories", icon: Tag, label: "Categories" },
  { to: "/admin/audit-log",  icon: ScrollText, label: "Audit Log" },
  { to: "/admin/settings",   icon: Settings, label: "Settings" },
];

const bottomNavItems = navItems.slice(0, 4);

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { logout, userEmail } = useAdminAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
          <Store className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Serene Beauty</p>
          <p className="text-xs text-gray-500">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-rose-50 text-rose-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t pt-3">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-gray-500 truncate">{userEmail ?? "Admin"}</p>
        </div>
        <button
          onClick={async () => {
            await logout();
            navigate("/admin");
            onClose?.();
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const currentPage =
    navItems.find((n) => location.pathname.startsWith(n.to))?.label ?? "Admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r bg-white z-40 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b flex items-center justify-between px-4 z-30">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-600">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <span className="font-semibold text-gray-900">{currentPage}</span>

        <div className="w-9" />
      </header>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-30 safe-area-pb">
        <div className="flex">
          {bottomNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                  isActive ? "text-rose-500" : "text-gray-400"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}

          {/* More button */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                ["/admin/categories", "/admin/settings"].some((p) =>
                  location.pathname.startsWith(p)
                )
                  ? "text-rose-500"
                  : "text-gray-400"
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-medium">More</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="p-0 rounded-t-xl h-auto">
              <div className="p-4 space-y-1">
                <p className="text-xs text-gray-500 px-3 py-1 font-medium uppercase tracking-wide">
                  More
                </p>
                {navItems.slice(4).map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                        isActive
                          ? "bg-rose-50 text-rose-600"
                          : "text-gray-700"
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
