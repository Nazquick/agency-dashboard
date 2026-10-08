import { formatDate, formatTime } from "@/lib/format/datetime";
import type { ConflictingEvent } from "@/lib/calendar/conflicts";

function formatRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateFmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${formatDate(start, dateFmt)}, ${formatTime(start, timeFmt)}–${formatTime(end, timeFmt)}`;
}

export function ConflictWarning({ conflicts }: { conflicts: ConflictingEvent[] }) {
  if (conflicts.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-medium">Heads up — also booked at this time:</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {conflicts.map((c) => (
          <li key={c.id}>
            {c.title}
            {c.client ? ` (${c.client.name})` : ""} — {formatRange(c.starts_at, c.ends_at)}
          </li>
        ))}
      </ul>
    </div>
  );
}
