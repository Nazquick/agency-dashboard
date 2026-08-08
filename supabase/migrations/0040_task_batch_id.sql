-- Correlates the N sibling task rows created together by the "All
-- {group}" bulk-create flow in TaskForm, so the pipeline view can display
-- them as a single collapsible row (e.g. "All JØNK") instead of N separate
-- ones — while the underlying rows stay independent so per-location
-- credit quotas and each location's own client-portal view keep working
-- exactly as before.

alter table public.tasks add column batch_id uuid;
create index tasks_batch_id_idx on public.tasks(batch_id) where batch_id is not null;
