import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeStorageFilename } from "@/lib/storage/filename";

// Thumbnails share the post-attachments bucket: staff can upload, and anyone
// who can see the post can read it (can_view_post on the "<post id>/" folder).
const BUCKET = "social-post-attachments";

export const THUMBNAIL_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const MAX_THUMBNAIL_BYTES = 15 * 1024 * 1024;

const MAX_EDGE = 1080;
const SIGNED_URL_SECONDS = 60 * 60;

export function validateThumbnail(file: File): string | null {
  if (!THUMBNAIL_ACCEPT.split(",").includes(file.type)) {
    return "Choose a JPG, PNG, WebP or GIF image";
  }
  if (file.size > MAX_THUMBNAIL_BYTES) return "That image is over the 15MB limit";
  return null;
}

// The feed shows small square tiles, so a 12-megapixel original is wasted
// bandwidth. Downscale to 1080px on the long edge and re-encode as JPEG.
// GIFs are left alone (re-encoding would drop the animation) and anything the
// browser can't decode is uploaded as-is.
export async function prepareThumbnail(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.fillStyle = "#ffffff"; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "thumbnail";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function uploadThumbnail(supabase: SupabaseClient, postId: string, file: File): Promise<string> {
  const path = `${postId}/thumbnail-${Date.now()}-${sanitizeStorageFilename(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

// Best effort: a leftover file is harmless, a failed cleanup shouldn't block a save.
export async function removeThumbnailFile(supabase: SupabaseClient, path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function signedThumbnailUrls(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}
