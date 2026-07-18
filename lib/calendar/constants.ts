import type { Database } from "@/lib/types/database.types";

export type EventType = Database["public"]["Enums"]["event_type"];

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "meeting", label: "Meeting" },
  { value: "shoot", label: "Shoot" },
  { value: "deadline", label: "Deadline" },
  { value: "deliverable", label: "Deliverable" },
  { value: "other", label: "Other" },
];

export function eventTypeLabel(value: EventType): string {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const EVENT_TYPE_COLOR: Record<EventType, string> = {
  meeting: "#2563eb",
  shoot: "#d97706",
  deadline: "#dc2626",
  deliverable: "#16a34a",
  other: "#6b7280",
};
