import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/context/AdminDataContext";

interface OrderSummary {
  id: string;
  total: number;
  status: string;
}

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string;
  created_at: string;
  orders: OrderSummary[];
}

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        // Nested select: pull each customer's orders in one query
        .select("id, name, email, phone, address, created_at, orders ( id, total, status )")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data as CustomerRow[]).map((row) => {
        const activeOrders = (row.orders ?? []).filter(
          (o) => o.status !== "cancelled"
        );
        return {
          id: row.id,
          name: row.name,
          email: row.email ?? "",
          phone: row.phone,
          joinDate: new Date(row.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          totalOrders: activeOrders.length,
          totalSpent: activeOrders.reduce((sum, o) => sum + (o.total ?? 0), 0),
        };
      });
    },
    retry: 1,
    staleTime: 30_000,
  });
}
