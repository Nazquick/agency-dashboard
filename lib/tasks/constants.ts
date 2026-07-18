import type { Database } from "@/lib/types/database.types";

export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];

export const TASK_TYPES = [
  { value: "video_shoot", label: "Video shoot" },
  { value: "video_edit", label: "Video edit" },
  { value: "photo_shoot", label: "Photo shoot" },
  { value: "graphic_design", label: "Graphic design" },
  { value: "social_post", label: "Social post" },
  { value: "admin", label: "Admin" },
  { value: "other", label: "Other" },
];

export const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

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
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
};

export const STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
  review: "bg-amber-100 text-amber-800",
  done: "bg-green-100 text-green-700",
};
