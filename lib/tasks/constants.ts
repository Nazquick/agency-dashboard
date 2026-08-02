import type { Database } from "@/lib/types/database.types";

export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];

// Content type drives both the quota credit cost and the minimum lead time
// (hours between now and the deadline) required for a client task — one
// dropdown value for both, instead of two parallel classification fields.
export const CONTENT_TYPES: { value: string; label: string; credits: number; minLeadHours: number }[] = [
  { value: "video_edit", label: "Video (with edit)", credits: 2, minLeadHours: 72 },
  { value: "video_raw", label: "Video (raw moment)", credits: 1, minLeadHours: 72 },
  { value: "graphics", label: "Graphics", credits: 1, minLeadHours: 24 },
  { value: "image_with_graphics", label: "Image (with graphics)", credits: 2, minLeadHours: 24 },
  { value: "image", label: "Image", credits: 1, minLeadHours: 24 },
  { value: "ai_image_with_graphics", label: "AI image (with graphics)", credits: 1, minLeadHours: 24 },
  { value: "stories_3", label: "3x stories", credits: 1, minLeadHours: 24 },
  { value: "stories_12", label: "12x stories", credits: 3, minLeadHours: 24 },
  { value: "meeting", label: "Meeting", credits: 0, minLeadHours: 48 },
  { value: "admin", label: "Admin", credits: 0, minLeadHours: 0 },
  { value: "other", label: "Other", credits: 0, minLeadHours: 0 },
];

export function contentTypeLabel(value: string | null): string {
  return CONTENT_TYPES.find((t) => t.value === value)?.label ?? value ?? "";
}

export function creditsFor(value: string | null): number {
  return CONTENT_TYPES.find((t) => t.value === value)?.credits ?? 0;
}

export function minLeadHoursFor(value: string | null): number {
  return CONTENT_TYPES.find((t) => t.value === value)?.minLeadHours ?? 0;
}

export const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

// Higher = more urgent — used to sort the active pipeline so the most
// urgent tasks surface first, nearest deadline breaking ties.
export const PRIORITY_RANK: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

const URGENT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// A task counts as "long urgent" once it's been sitting at urgent priority
// for more than 24h (tracked by the tasks_track_urgent_since DB trigger) —
// drives the animated red border that flags it in the pipeline.
export function isLongUrgent(task: { priority: string; urgent_since: string | null }): boolean {
  if (task.priority !== "urgent" || !task.urgent_since) return false;
  return Date.now() - new Date(task.urgent_since).getTime() > URGENT_THRESHOLD_MS;
}

export const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

export function priorityLabel(value: TaskPriority): string {
  return PRIORITIES.find((p) => p.value === value)?.label ?? value;
}

export function statusLabel(value: TaskStatus): string {
  return STATUSES.find((s) => s.value === value)?.label ?? value;
}

export const PRIORITY_BADGE_CLASS: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

export const STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  blocked: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  review: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  done: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
};
