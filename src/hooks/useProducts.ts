import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Product } from "@/data/products";

const isDev = import.meta.env.DEV;

// Supabase row type — mirrors DB columns exactly
export interface ProductRow {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  badge?: string | null;
  is_featured: boolean;
  is_best_seller: boolean;
  stock: number;          // SECURITY v2: inventory
  created_at: string;
}

export function toProduct(row: ProductRow): Product {
  return {
    id:            row.id,
    name:          row.name,
    description:   row.description,
    price:         row.price,
    originalPrice: row.original_price ?? undefined,
    category:      row.category as Product["category"],
    image:         row.image,
    rating:        row.rating,
    reviewCount:   row.reviews,
    badge:         row.badge ?? undefined,
    isFeatured:    row.is_featured,
    isBestSeller:  row.is_best_seller,
    stock:         row.stock ?? 0,  // SECURITY v2
  };
}

export function toRow(p: Omit<Product, "id">): Omit<ProductRow, "id" | "created_at"> {
  return {
    name:          p.name,
    description:   p.description,
    price:         Number(p.price),
    original_price: p.originalPrice ? Number(p.originalPrice) : null,
    category:      p.category,
    image:         p.image || null,
    rating:        Number(p.rating),
    reviews:       Number(p.reviewCount),
    badge:         p.badge || null,
    is_featured:   Boolean(p.isFeatured),
    is_best_seller: Boolean(p.isBestSeller),
    stock:         Number(p.stock ?? 0),  // SECURITY v2
  };
}

// ─── Fetch all products ───────────────────────────────────────────────────────

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (isDev) console.error("[Supabase] SELECT products failed:", error.message);
        throw error;
      }

      return (data as ProductRow[]).map(toProduct);
    },
    retry: 1,
    staleTime: 30_000,
  });
}

// ─── Fetch a single product by id ────────────────────────────────────────────

export function useProduct(id: string | undefined) {
  return useQuery<Product | null>({
    queryKey: ["products", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (isDev) console.error("[Supabase] SELECT product by id failed:", error.message);
        throw error;
      }
      return toProduct(data as ProductRow);
    },
    enabled: Boolean(id),
    retry: 1,
    staleTime: 30_000,
  });
}

// ─── Direct CRUD (used by AdminDataContext) ───────────────────────────────────

export async function insertProduct(product: Omit<Product, "id">): Promise<void> {
  const row = toRow(product);

  const { error } = await supabase
    .from("products")
    .insert([row]);

  if (error) {
    if (isDev) console.error("[Supabase] INSERT product failed:", error.message, "| code:", error.code);
    throw new Error(error.message || error.code || "Unknown Supabase error");
  }
}

export async function updateProductById(id: string, patch: Partial<Product>): Promise<void> {
  const partial: Partial<Omit<ProductRow, "id" | "created_at">> = {};
  if (patch.name          !== undefined) partial.name           = patch.name;
  if (patch.description   !== undefined) partial.description    = patch.description;
  if (patch.price         !== undefined) partial.price          = Number(patch.price);
  if (patch.originalPrice !== undefined) partial.original_price = patch.originalPrice ? Number(patch.originalPrice) : null;
  if (patch.category      !== undefined) partial.category       = patch.category;
  if (patch.image         !== undefined) partial.image          = patch.image || null;
  if (patch.rating        !== undefined) partial.rating         = Number(patch.rating);
  if (patch.reviewCount   !== undefined) partial.reviews        = Number(patch.reviewCount);
  if (patch.badge         !== undefined) partial.badge          = patch.badge || null;
  if (patch.isFeatured    !== undefined) partial.is_featured    = Boolean(patch.isFeatured);
  if (patch.isBestSeller  !== undefined) partial.is_best_seller = Boolean(patch.isBestSeller);
  if (patch.stock         !== undefined) partial.stock          = Number(patch.stock);  // v2

  const { error } = await supabase
    .from("products")
    .update(partial)
    .eq("id", id);

  if (error) {
    if (isDev) console.error("[Supabase] UPDATE product failed:", error.message);
    throw new Error(error.message);
  }
}

export async function deleteProductById(id: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    if (isDev) console.error("[Supabase] DELETE product failed:", error.message);
    throw new Error(error.message);
  }
}

// ─── Seed helper ─────────────────────────────────────────────────────────────

export async function seedProducts(rows: Omit<ProductRow, "id" | "created_at">[]): Promise<boolean> {
  const { error } = await supabase
    .from("products")
    .insert(rows);

  if (error) {
    if (isDev) console.error("[Supabase] Seed failed:", error.message);
    return false;
  }

  return true;
}

// ─── Cache invalidation helper ───────────────────────────────────────────────

export function useInvalidateProducts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["products"] });
}
