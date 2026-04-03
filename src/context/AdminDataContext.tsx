import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Product } from "@/data/products";
import { useQueryClient } from "@tanstack/react-query";
import {
  useProducts,
  insertProduct,
  updateProductById,
  deleteProductById,
} from "@/hooks/useProducts";
import { useOrders, updateOrderStatusById } from "@/hooks/useOrders";
import { useCustomers } from "@/hooks/useCustomers";
import {
  fetchCategories,
  saveCategory,
  deleteCategoryById,
  type Category,
} from "@/lib/category-service";

export type { Category };

export interface Order {
  id:            string;
  order_ref:     string;
  createdAt:     string;
  customer:      string;
  email:         string;
  phone:         string;
  address:       string;
  city:          string;
  state:         string;
  zip:           string;
  country:       string;
  date:          string;
  status:        "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  total:         number;
  items: {
    productId?: string;
    name:       string;
    quantity:   number;
    price:      number;
  }[];
  paymentMethod: string;
}

export interface Customer {
  id:          string;
  name:        string;
  email:       string;
  phone:       string;
  joinDate:    string;
  totalOrders: number;
  totalSpent:  number;
}

interface AdminDataContextType {
  products:        Product[];
  productsLoading: boolean;
  addProduct:      (product: Omit<Product, "id">) => Promise<void>;
  updateProduct:   (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct:   (id: string) => Promise<void>;

  orders:          Order[];
  ordersLoading:   boolean;
  updateOrderStatus: (id: string, status: Order["status"]) => Promise<void>;

  customers:       Customer[];

  categories:        Category[];
  categoriesLoading: boolean;
  addCategory:       (category: Omit<Category, "id">) => Promise<void>;
  updateCategory:    (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory:    (id: string) => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextType | null>(null);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();

  // Products — live from Supabase
  const { data: products = [], isLoading: productsLoading } = useProducts();

  // Clean up old localStorage keys
  useEffect(() => {
    localStorage.removeItem("admin_orders");
    localStorage.removeItem("admin_customers");
    localStorage.removeItem("admin_products");
    localStorage.removeItem("admin_categories");
  }, []);

  // Product CRUD
  const addProduct = async (product: Omit<Product, "id">) => {
    await insertProduct(product);
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    await updateProductById(id, data);
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const deleteProduct = async (id: string) => {
    await deleteProductById(id);
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  // Orders — live from Supabase
  const { data: orders = [], isLoading: ordersLoading } = useOrders();

  const updateOrderStatus = async (id: string, status: Order["status"]) => {
    await updateOrderStatusById(id, status);
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  // Customers — live from Supabase
  const { data: customers = [] } = useCustomers();

  // Categories
  const [categories,        setCategories]        = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const data = await fetchCategories();
      if (data.length === 0) {
        const initial: Category[] = [
          { id: crypto.randomUUID(), name: "Skincare",     slug: "skincare",  description: "Face & body care products" },
          { id: crypto.randomUUID(), name: "Makeup",       slug: "makeup",    description: "Cosmetics & color products" },
          { id: crypto.randomUUID(), name: "Fragrance",    slug: "fragrance", description: "Perfumes & scents" },
          { id: crypto.randomUUID(), name: "Beauty Tools", slug: "tools",     description: "Brushes & accessories" },
        ];
        for (const cat of initial) await saveCategory(cat, "add");
        setCategories(initial);
        qc.invalidateQueries({ queryKey: ["categories"] });
      } else {
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setCategoriesLoading(false);
    }
  }, [qc]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const addCategory = async (category: Omit<Category, "id">) => {
    const newCat: Category = { ...category, id: crypto.randomUUID() };
    await saveCategory(newCat, "add");
    await loadCategories();
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    const existing = categories.find((c) => c.id === id);
    if (!existing) return;
    await saveCategory({ ...existing, ...data }, "edit");
    await loadCategories();
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const deleteCategory = async (id: string) => {
    await deleteCategoryById(id);
    await loadCategories();
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  return (
    <AdminDataContext.Provider
      value={{
        products, productsLoading, addProduct, updateProduct, deleteProduct,
        orders, ordersLoading, updateOrderStatus,
        customers,
        categories, categoriesLoading, addCategory, updateCategory, deleteCategory,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminData must be used within AdminDataProvider");
  return ctx;
}
