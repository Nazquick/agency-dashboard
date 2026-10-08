-- Templates for the content types the team actually creates tasks for
-- (task_type values match lib/tasks/constants.ts CONTENT_TYPES).
do $$
declare
  tpl record;
  new_id uuid;
  idx integer;
  step record;
begin
  for tpl in
    select * from (values
      ('Graphics', 'graphics', 'Static graphic from brief to export.'),
      ('3x stories', 'stories_3', 'A three-frame story sequence.'),
      ('12x stories', 'stories_12', 'A full twelve-frame story campaign.'),
      ('Meeting', 'meeting', 'Client or internal meeting, prep to follow-up.'),
      ('Video (raw moment)', 'video_raw', 'Quick raw-moment video with light trimming.')
    ) as t(name, task_type, description)
  loop
    if exists (select 1 from public.task_templates where name = tpl.name) then
      continue;
    end if;
    insert into public.task_templates (name, task_type, description)
      values (tpl.name, tpl.task_type, tpl.description)
      returning id into new_id;

    idx := 0;
    for step in
      select * from (values
        ('Graphics', 'Collect brief, references and brand assets', 30),
        ('Graphics', 'Design first draft', 90),
        ('Graphics', 'Revisions', 45),
        ('Graphics', 'Export all sizes and upload', 20),
        ('3x stories', 'Plan the three story frames', 20),
        ('3x stories', 'Shoot or gather assets', 45),
        ('3x stories', 'Edit, add text and stickers', 40),
        ('3x stories', 'Schedule in the post plan', 10),
        ('12x stories', 'Outline the twelve-story arc', 45),
        ('12x stories', 'Shoot or gather assets', 120),
        ('12x stories', 'Edit, add text and stickers', 120),
        ('12x stories', 'Review with the client', 30),
        ('12x stories', 'Schedule in the post plan', 20),
        ('Meeting', 'Prepare agenda and materials', 20),
        ('Meeting', 'Hold the meeting', 60),
        ('Meeting', 'Send notes and action items', 20),
        ('Video (raw moment)', 'Capture the clips', 60),
        ('Video (raw moment)', 'Pick the best takes and trim', 30),
        ('Video (raw moment)', 'Export and upload', 15)
      ) as s(template_name, description, minutes)
      where s.template_name = tpl.name
    loop
      idx := idx + 1;
      insert into public.task_template_steps (template_id, position, description, estimated_minutes)
        values (new_id, idx, step.description, step.minutes);
    end loop;
  end loop;
end $$;
