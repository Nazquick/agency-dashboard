import type { Database } from "@/lib/types/database.types";

export type CampaignStatus = Database["public"]["Tables"]["campaigns"]["Row"]["status"];

export const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string; badgeClass: string }[] = [
  { value: "draft", label: "Draft", badgeClass: "bg-muted text-muted-foreground" },
  { value: "scheduled", label: "Scheduled", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  { value: "active", label: "Active", badgeClass: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" },
  { value: "paused", label: "Paused", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400" },
  { value: "completed", label: "Completed", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400" },
  { value: "cancelled", label: "Cancelled", badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
];

export function campaignStatusLabel(value: string): string {
  return CAMPAIGN_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function campaignStatusBadgeClass(value: string): string {
  return CAMPAIGN_STATUSES.find((s) => s.value === value)?.badgeClass ?? "bg-muted text-muted-foreground";
}

// Free-form on the DB side (text[], no CHECK constraint) — this list drives
// the UI and is the only place a new channel needs to be added.
export const DISTRIBUTION_CHANNELS: { value: string; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "physical_flyers", label: "Physical Flyers" },
];

export function channelLabel(value: string): string {
  return DISTRIBUTION_CHANNELS.find((c) => c.value === value)?.label ?? value;
}

export const MAX_CAMPAIGN_ATTACHMENTS = 15;
