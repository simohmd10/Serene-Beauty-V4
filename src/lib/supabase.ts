import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[Supabase] Missing environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n" +
    "Add them to .env for local dev, or to Vercel Project Settings → Environment Variables."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? ""
);

// Connection probe — dev only
if (import.meta.env.DEV) {
  supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .then(({ count, error }) => {
      if (error) {
        console.error("[Supabase] Connection probe failed:", error.message, "| code:", error.code);
        if (error.code === "42P01") {
          console.error("[Supabase] Table 'products' does not exist. Run SUPABASE_SETUP.sql");
        } else if (error.message?.includes("permission") || error.code === "42501") {
          console.error("[Supabase] RLS is blocking reads. Run SUPABASE_SETUP.sql");
        }
      } else {
        console.log(`[Supabase] Connected — products table has ${count ?? 0} rows`);
      }
    });
}
