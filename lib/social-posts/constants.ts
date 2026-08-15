import type { Database } from "@/lib/types/database.types";

export type PostPlatform = Database["public"]["Tables"]["social_posts"]["Row"]["platform"];
export type PostMediaType = Database["public"]["Tables"]["social_posts"]["Row"]["media_type"];
export type PostType = Database["public"]["Tables"]["social_posts"]["Row"]["post_type"];

export const POST_TYPES: { value: PostType; label: string }[] = [
  { value: "post", label: "Post" },
  { value: "reel", label: "Reel" },
  { value: "story", label: "Story" },
  { value: "carousel", label: "Carousel" },
];

export function postTypeLabel(value: string): string {
  return POST_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const PLATFORMS: { value: PostPlatform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
  { value: "snapchat", label: "Snapchat" },
  { value: "pinterest", label: "Pinterest" },
  { value: "threads", label: "Threads" },
  { value: "other", label: "Other" },
];

export function platformLabel(value: string): string {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

// video=red, image=yellow, graphic=blue, collab=green, campaign=pink — the
// team's post-plan color language, mirrors lib/tasks/color-code.ts's
// dark-mode-aware badge pattern but keyed on media type instead of role.
export const MEDIA_TYPES: {
  value: PostMediaType;
  label: string;
  hex: string;
  badgeClass: string;
}[] = [
  { value: "video", label: "Video", hex: "#dc2626", badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  { value: "image", label: "Image", hex: "#eab308", badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400" },
  { value: "graphic", label: "Graphic", hex: "#2563eb", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  { value: "collab", label: "Collab", hex: "#16a34a", badgeClass: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" },
  { value: "campaign", label: "Campaign", hex: "#db2777", badgeClass: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400" },
];

export function mediaTypeLabel(value: string): string {
  return MEDIA_TYPES.find((m) => m.value === value)?.label ?? value;
}

export function mediaTypeHex(value: string): string {
  return MEDIA_TYPES.find((m) => m.value === value)?.hex ?? "#6b7280";
}

export function mediaTypeBadgeClass(value: string): string {
  return MEDIA_TYPES.find((m) => m.value === value)?.badgeClass ?? "bg-muted text-muted-foreground";
}

export const MAX_POST_ATTACHMENTS = 15;
