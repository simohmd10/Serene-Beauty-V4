import { supabase } from "@/lib/supabase";

const BUCKET = "product-images";

/**
 * Uploads a File object to Supabase Storage and returns the public URL.
 * Throws on failure.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Deletes an image from Storage given its full public URL.
 * Silently ignores errors (best-effort cleanup).
 */
export async function deleteProductImage(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    // Extract path after /object/public/{bucket}/
    const parts = url.pathname.split(`/object/public/${BUCKET}/`);
    if (parts.length < 2) return;
    const filePath = parts[1];
    await supabase.storage.from(BUCKET).remove([filePath]);
  } catch {
    // Best-effort cleanup — don't throw
  }
}

/**
 * Returns true if the given string is a Supabase Storage public URL
 * (as opposed to a base64 data URL or an external URL).
 */
export function isStorageUrl(url: string): boolean {
  return url.includes("/storage/v1/object/public/");
}
