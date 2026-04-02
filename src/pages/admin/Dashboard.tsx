import { useMemo } from "react";
import { useAdminData } from "@/context/AdminDataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ShoppingBag, Users, Package, DollarSign, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const statusColors: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped:    "bg-purple-100 text-purple-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-700",
};

const SHORT_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function Dashboard() {
  const { orders, products, customers } = useAdminData();

  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "processing"
  ).length;

  // FIX M-2: Sort by ISO createdAt instead of locale-formatted date string.
  // new Date(locale-string) is unreliable across environments; ISO is always safe.
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const weeklyRevenue = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      const dayLabel = SHORT_DAYS[date.getDay()];
      const revenue = orders
        .filter((o) => {
          if (o.status === "cancelled") return false;
          // FIX M-2: Compare against createdAt (ISO), not date (formatted string)
          return new Date(o.createdAt).toDateString() === date.toDateString();
        })
        .reduce((sum, o) => sum + o.total, 0);
      return { day: dayLabel, revenue };
    });
  }, [orders]);

  const stats = [
    { title: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-600",  bg: "bg-green-50",  sub: "All time" },
    { title: "Orders",        value: orders.length,                       icon: ShoppingBag, color: "text-blue-600",   bg: "bg-blue-50",   sub: `${pendingOrders} pending` },
    { title: "Products",      value: products.length,                     icon: Package,     color: "text-purple-600", bg: "bg-purple-50", sub: "In catalog" },
    { title: "Customers",     value: customers.length,                    icon: Users,       color: "text-rose-600",   bg: "bg-rose-50",   sub: "Registered" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Welcome back to Serene Beauty</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{stat.title}</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 lg:w-5 lg:h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            Weekly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyRevenue}>
              <defs>
                <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                formatter={(v: number) => [`$${v}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#f43f5e" strokeWidth={2} fill="url(#roseGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900">Recent Orders</CardTitle>
          <Link to="/admin/orders" className="text-sm text-rose-500 hover:text-rose-600 font-medium">View all</Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-6 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{order.customer}</p>
                    <p className="text-xs text-gray-500">
                      {order.order_ref} · {order.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">${order.total}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
