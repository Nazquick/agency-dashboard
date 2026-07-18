-- Action Pipeline: per-task execution steps, plus reusable pre-made task
-- templates (with their own step sets) the team can start a new task from.

create table public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  position integer not null default 0,
  description text not null,
  estimated_minutes integer,
  software text,
  equipment text,
  transportation text,
  other_cost text,
  created_at timestamptz not null default now()
);

alter table public.task_steps enable row level security;

create policy "task_steps_select_authenticated" on public.task_steps
  for select using (auth.uid() is not null);

create policy "task_steps_insert_authenticated" on public.task_steps
  for insert with check (auth.uid() is not null);

create policy "task_steps_update_authenticated" on public.task_steps
  for update using (auth.uid() is not null);

create policy "task_steps_delete_leader" on public.task_steps
  for delete using (public.current_role() = 'team_leader');

create index task_steps_task_id_idx on public.task_steps(task_id);

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  task_type text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.task_templates enable row level security;

create policy "task_templates_select_authenticated" on public.task_templates
  for select using (auth.uid() is not null);

create policy "task_templates_insert_leader" on public.task_templates
  for insert with check (public.current_role() = 'team_leader');

create policy "task_templates_update_leader" on public.task_templates
  for update using (public.current_role() = 'team_leader');

create policy "task_templates_delete_leader" on public.task_templates
  for delete using (public.current_role() = 'team_leader');

create table public.task_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  position integer not null default 0,
  description text not null,
  estimated_minutes integer,
  software text,
  equipment text,
  transportation text,
  other_cost text
);

alter table public.task_template_steps enable row level security;

create policy "task_template_steps_select_authenticated" on public.task_template_steps
  for select using (auth.uid() is not null);

create policy "task_template_steps_insert_leader" on public.task_template_steps
  for insert with check (public.current_role() = 'team_leader');

create policy "task_template_steps_update_leader" on public.task_template_steps
  for update using (public.current_role() = 'team_leader');

create policy "task_template_steps_delete_leader" on public.task_template_steps
  for delete using (public.current_role() = 'team_leader');

create index task_template_steps_template_id_idx on public.task_template_steps(template_id);

-- Seed the four pre-made templates.
do $$
declare
  film_event_id uuid;
  graphic_poster_id uuid;
  ig_post_id uuid;
  edit_video_id uuid;
begin
  insert into public.task_templates (name, task_type, description)
    values ('Film event', 'video_shoot', 'On-site event coverage, from prep to backed-up footage.')
    returning id into film_event_id;
  insert into public.task_template_steps (template_id, position, description, estimated_minutes, software, equipment, transportation, other_cost) values
    (film_event_id, 1, 'Confirm shot list and schedule with client', 20, null, null, null, null),
    (film_event_id, 2, 'Pack and check gear', 20, null, 'Camera body, 2 lenses, tripod, gimbal, shotgun mic, spare batteries, SD cards', null, null),
    (film_event_id, 3, 'Travel to venue', 30, null, null, 'Car or public transport to venue', 'Parking / transit cost'),
    (film_event_id, 4, 'Film event coverage', 180, null, 'Camera, gimbal, mic', null, null),
    (film_event_id, 5, 'Backup footage to drive and cloud', 30, null, 'External SSD', null, null);

  insert into public.task_templates (name, task_type, description)
    values ('Make graphic poster', 'graphic_design', 'Client poster from brief to print/export-ready file.')
    returning id into graphic_poster_id;
  insert into public.task_template_steps (template_id, position, description, estimated_minutes, software, equipment, transportation, other_cost) values
    (graphic_poster_id, 1, 'Gather brief, brand assets, and copy', 15, null, null, null, null),
    (graphic_poster_id, 2, 'Draft concept and layout', 45, 'Adobe Illustrator', null, null, null),
    (graphic_poster_id, 3, 'Design final poster', 90, 'Adobe Illustrator, Adobe Photoshop', null, null, null),
    (graphic_poster_id, 4, 'Internal review and revisions', 30, 'Adobe Illustrator', null, null, null),
    (graphic_poster_id, 5, 'Export print and web-ready files', 15, 'Adobe Illustrator', null, null, 'Print cost if physical copies needed');

  insert into public.task_templates (name, task_type, description)
    values ('Post on IG', 'social_post', 'Prepare, schedule, and publish an Instagram post.')
    returning id into ig_post_id;
  insert into public.task_template_steps (template_id, position, description, estimated_minutes, software, equipment, transportation, other_cost) values
    (ig_post_id, 1, 'Select and prep asset (crop, resize, retouch)', 20, 'Adobe Photoshop, Adobe Lightroom', null, null, null),
    (ig_post_id, 2, 'Write caption and hashtags', 15, null, null, null, null),
    (ig_post_id, 3, 'Schedule post', 10, 'Meta Business Suite', null, null, null),
    (ig_post_id, 4, 'Monitor and respond to early engagement', 15, null, null, null, null);

  insert into public.task_templates (name, task_type, description)
    values ('Edit video', 'video_edit', 'Raw footage to a delivered, graded, exported edit.')
    returning id into edit_video_id;
  insert into public.task_template_steps (template_id, position, description, estimated_minutes, software, equipment, transportation, other_cost) values
    (edit_video_id, 1, 'Import and organize footage', 20, 'Adobe Premiere Pro', null, null, null),
    (edit_video_id, 2, 'Rough cut', 90, 'Adobe Premiere Pro', null, null, null),
    (edit_video_id, 3, 'Color grade', 45, 'Adobe Premiere Pro', null, null, null),
    (edit_video_id, 4, 'Sound mix and add music', 30, 'Adobe Premiere Pro, Adobe Audition', null, null, 'Licensed music track if needed'),
    (edit_video_id, 5, 'Export and deliver', 20, 'Adobe Premiere Pro, Adobe Media Encoder', null, null, null);
end $$;
