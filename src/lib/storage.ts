export type PublicBucket = "product-images" | "banners";

/** Public URL of a Supabase Storage object (absolute URLs are returned as they are). */
export function publicStorageUrl(bucket: PublicBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const clean = path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${clean}`;
}
