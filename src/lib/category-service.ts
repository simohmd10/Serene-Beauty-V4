import { supabase } from "@/lib/supabase";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
};

export const saveCategory = async (
  category: Category,
  mode: "add" | "edit"
): Promise<void> => {
  if (mode === "add") {
    const { error } = await supabase.from("categories").insert({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("categories")
      .update({ name: category.name, slug: category.slug, description: category.description })
      .eq("id", category.id);
    if (error) throw new Error(error.message);
  }
};

export const deleteCategoryById = async (id: string): Promise<void> => {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
};