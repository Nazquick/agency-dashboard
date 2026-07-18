import { TASK_COLOR_HEX, TASK_COLOR_LABEL, type TaskColor } from "@/lib/tasks/color-code";
import { cn } from "@/lib/utils";

export function TaskColorDot({
  color,
  className,
  title,
}: {
  color: TaskColor;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: TASK_COLOR_HEX[color] }}
      title={title ?? TASK_COLOR_LABEL[color]}
      aria-hidden
    />
  );
}
