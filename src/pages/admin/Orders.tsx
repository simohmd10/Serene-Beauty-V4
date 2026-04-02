import { useState } from "react";
import { useAdminData, Order } from "@/context/AdminDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Search, ChevronRight, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const statuses: Order["status"][] = [
  "pending", "processing", "shipped", "delivered", "cancelled",
];

export default function Orders() {
  const { orders, updateOrderStatus } = useAdminData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = async (id: string, status: Order["status"]) => {
    await updateOrderStatus(id, status);
    if (selected?.id === id) setSelected((o) => o ? { ...o, status } : o);
    toast.success(`Order status updated to ${status}`);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-500 text-sm mt-0.5">{orders.length} total orders</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Order", "Customer", "Date", "Status", "Total", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.id}</td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900">{order.customer}</p>
                  <p className="text-xs text-gray-400">{order.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{order.date}</td>
                <td className="px-4 py-3">
                  <Select
                    value={order.status}
                    onValueChange={(v) => handleStatusChange(order.id, v as Order["status"])}
                  >
                    <SelectTrigger
                      className={`h-7 w-32 text-xs border-0 px-2 rounded-full font-medium ${
                        statusColors[order.status]
                      }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize text-sm">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  ${order.total}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(order)}
                    className="h-7 text-xs text-gray-500"
                  >
                    Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No orders found</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-xl border shadow-sm p-4"
            onClick={() => setSelected(order)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{order.customer}</p>
                <p className="text-xs text-gray-500 mt-0.5">{order.id} · {order.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                    statusColors[order.status]
                  }`}
                >
                  {order.status}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t flex items-center justify-between">
              <p className="text-xs text-gray-500">{order.items.length} item(s)</p>
              <p className="text-sm font-bold text-gray-900">${order.total}</p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No orders found</p>
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Customer</p>
                  <p className="font-medium text-gray-900">{selected.customer}</p>
                  <p className="text-gray-500 text-xs">{selected.email}</p>
                  <p className="text-gray-500 text-xs">{selected.phone}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Date</p>
                  <p className="font-medium text-gray-900">{selected.date}</p>
                  <p className="text-gray-500 text-xs mt-1">Payment</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {selected.paymentMethod?.replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Shipping Address</p>
                <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  {[selected.address, selected.city, [selected.state, selected.zip].filter(Boolean).join(" "), selected.country].filter(Boolean).join(", ")}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Items</p>
                <div className="space-y-1.5">
                  {selected.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg"
                    >
                      <span className="text-gray-700">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-medium text-gray-900">
                        ${item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold px-3 py-1.5 border-t mt-1 pt-2">
                    <span>Total</span>
                    <span>${selected.total}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selected.id, s)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-opacity ${
                        selected.status === s
                          ? statusColors[s] + " ring-2 ring-offset-1 ring-current"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
