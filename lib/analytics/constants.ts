import type { Database } from "@/lib/types/database.types";

export type SocialPlatform = Database["public"]["Enums"]["social_platform"];
export type ContentAssetType = Database["public"]["Enums"]["content_asset_type"];

export const PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter_x", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Other" },
];

export const ASSET_TYPES: { value: ContentAssetType; label: string }[] = [
  { value: "post", label: "Post" },
  { value: "reel", label: "Reel" },
  { value: "video", label: "Video" },
  { value: "story", label: "Story" },
  { value: "carousel", label: "Carousel" },
  { value: "other", label: "Other" },
];

export function platformLabel(value: SocialPlatform): string {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

export function assetTypeLabel(value: ContentAssetType): string {
  return ASSET_TYPES.find((t) => t.value === value)?.label ?? value;
}
