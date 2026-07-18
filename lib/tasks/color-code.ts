import type { UserRole } from "@/lib/auth/roles";
import type { Database } from "@/lib/types/database.types";

export type TaskPriority = Database["public"]["Enums"]["task_priority"];

// The team's task color language, used consistently across Clients, the
// Action Pipeline, and Calendar:
//   red    = urgent (overrides role — any role can be urgent)
//   blue   = videographer / photographer
//   yellow = editor / graphic designer
//   green  = team leader
//   pink   = social media manager
export type TaskColor = "red" | "blue" | "yellow" | "green" | "pink";

export const TASK_COLOR_HEX: Record<TaskColor, string> = {
  red: "#dc2626",
  blue: "#2563eb",
  yellow: "#eab308",
  green: "#16a34a",
  pink: "#db2777",
};

export const TASK_COLOR_CLASS: Record<TaskColor, string> = {
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-700",
  pink: "bg-pink-100 text-pink-700",
};

export const TASK_COLOR_LABEL: Record<TaskColor, string> = {
  red: "Urgent",
  blue: "Videographer / Photographer",
  yellow: "Editor / Graphic",
  green: "Team Leader",
  pink: "Social Media Manager",
};

const ROLE_COLOR: Record<UserRole, TaskColor> = {
  videographer_photographer: "blue",
  editor_designer: "yellow",
  team_leader: "green",
  social_media_manager: "pink",
};

export function roleForColor(color: Exclude<TaskColor, "red">): UserRole {
  return (Object.entries(ROLE_COLOR).find(([, c]) => c === color)?.[0] ?? "team_leader") as UserRole;
}

// Returns null when the task has neither an urgent priority nor an assignee
// to derive a color from — that's the "needs an AI (or human) assessment"
// case surfaced in the Action Pipeline.
export function taskColor(
  priority: TaskPriority,
  assigneeRole: UserRole | null | undefined
): TaskColor | null {
  if (priority === "urgent") return "red";
  if (assigneeRole) return ROLE_COLOR[assigneeRole];
  return null;
}
