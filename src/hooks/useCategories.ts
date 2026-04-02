import { useQuery } from "@tanstack/react-query";
import { fetchCategories, type Category } from "@/lib/category-service";

/**
 * Fetches categories from Supabase for use in the public storefront.
 * Separate from AdminDataContext — no admin auth required.
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 60_000, // categories change rarely — cache for 1 min
    retry: 1,
  });
}
