import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAdminData } from "@/context/AdminDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle } from "lucide-react";

const categoryLabels: Record<string, string> = {
  skincare: "Skincare", makeup: "Makeup", fragrance: "Fragrance", tools: "Tools",
};

/** Stock badge — color-coded by level */
function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 font-medium">
        <AlertTriangle className="w-3 h-3" /> Out of stock
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
        ⚠ {stock} left
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium">
      {stock} in stock
    </span>
  );
}

export default function Products() {
  const { products, deleteProduct } = useAdminData();
  const [search, setSearch] = useState("");

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock   = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {products.length} products
            {outOfStock > 0 && <span className="text-red-500 ml-2">· {outOfStock} out of stock</span>}
            {lowStock   > 0 && <span className="text-amber-500 ml-2">· {lowStock} low stock</span>}
          </p>
        </div>
        <Link to="/admin/products/new">
          <Button className="bg-rose-500 hover:bg-rose-600 text-white h-9 gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Product","Category","Price","Stock","Rating","Actions"].map((h) => (
                <th key={h} className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-400" /></div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      {product.badge && <span className="text-xs text-rose-500">{product.badge}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {categoryLabels[product.category] ?? product.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">${product.price}</span>
                    {product.originalPrice && <span className="text-xs text-gray-400 line-through ml-1.5">${product.originalPrice}</span>}
                  </div>
                </td>
                {/* SECURITY v2: Stock column */}
                <td className="px-4 py-3">
                  <StockBadge stock={product.stock ?? 0} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">⭐ {product.rating} ({product.reviewCount})</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/admin/products/${product.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900"><Pencil className="w-4 h-4" /></Button>
                    </Link>
                    <DeleteButton id={product.id} name={product.name} onDelete={deleteProduct} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No products found</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((product) => (
          <div key={product.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{categoryLabels[product.category]} · ⭐ {product.rating}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-bold text-gray-900">${product.price}</p>
                <StockBadge stock={product.stock ?? 0} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Link to={`/admin/products/${product.id}/edit`}>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0"><Pencil className="w-3.5 h-3.5" /></Button>
              </Link>
              <DeleteButton id={product.id} name={product.name} onDelete={deleteProduct} size="sm" />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteButton({
  id, name, onDelete, size,
}: {
  id: string; name: string; onDelete: (id: string) => Promise<void>; size?: "sm" | "default";
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size={size === "sm" ? "sm" : "icon"}
          className={`${size === "sm" ? "h-8 w-8 p-0" : "h-8 w-8"} text-red-400 hover:text-red-600 hover:border-red-200`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              try { await onDelete(id); }
              catch { toast.error("Failed to delete product. Please try again."); }
            }}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
