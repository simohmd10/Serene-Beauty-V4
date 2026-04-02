import { useState } from "react";
import { useAdminData } from "@/context/AdminDataContext";
import { Input } from "@/components/ui/input";
import { Search, Users, Mail, Phone } from "lucide-react";

export default function Customers() {
  const { customers } = useAdminData();
  const [search, setSearch] = useState("");

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {customers.length} customers · ${totalRevenue.toLocaleString()} total revenue
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Customer", "Phone", "Joined", "Orders", "Spent"].map((h) => (
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
            {filtered.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-rose-600">
                        {customer.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-400">{customer.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{customer.phone}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{customer.joinDate}</td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {customer.totalOrders}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  ${customer.totalSpent}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No customers found</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((customer) => (
          <div key={customer.id} className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-rose-600">
                  {customer.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
                <p className="text-xs text-gray-500 truncate">{customer.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">${customer.totalSpent}</p>
                <p className="text-xs text-gray-400">{customer.totalOrders} orders</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {customer.phone}
              </span>
              <span>Joined {customer.joinDate}</span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
