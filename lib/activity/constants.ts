export const ACTIVITY_LABELS: Record<string, string> = {
  task_created: "Created task",
  task_updated: "Updated task",
  task_completed: "Completed task",
  task_status_changed: "Changed task status",
  task_archived: "Archived task",
  task_unarchived: "Unarchived task",
  task_deleted: "Deleted task",
  task_requested: "Requested a task",
  report_submitted: "Submitted report",
  content_reported: "Reported content",
  client_created: "Created client",
  client_updated: "Updated client",
  team_member_updated: "Updated team member",
  question_asked: "Asked a question",
  question_answered: "Answered a question",
  special_task_created: "Posted a bounty",
  special_task_claimed: "Claimed a bounty",
  special_task_delivered: "Delivered a bounty",
  special_task_approved: "Approved a bounty",
};

export function activityLabel(action: string): string {
  return ACTIVITY_LABELS[action] ?? action;
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return "< 1m";
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
