import { contentTypeLabel, minLeadHoursFor } from "@/lib/tasks/constants";

// Hard minimum notice before a client task's deadline, based on content
// type — video needs 72h, meetings 48h, everything graphics/image-based
// 24h. Only applies to tasks tied to a client; internal tasks are exempt.
export function leadTimeViolation(
  contentType: string | null | undefined,
  deadlineIso: string | null | undefined,
  hasClient: boolean
): string | null {
  if (!hasClient || !contentType || !deadlineIso) return null;

  const minHours = minLeadHoursFor(contentType);
  if (minHours <= 0) return null;

  const hoursUntil = (new Date(deadlineIso).getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < minHours) {
    return `${contentTypeLabel(contentType)} needs at least ${minHours}h notice before the deadline.`;
  }

  return null;
}
