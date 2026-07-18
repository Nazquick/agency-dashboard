-- Calendar: mark which events came from a client (email-intake) so the UI
-- can draw a distinguishing stroke around them, reusing the same
-- manual/email distinction already used on tasks.

alter table public.calendar_events
  add column source task_source not null default 'manual';
