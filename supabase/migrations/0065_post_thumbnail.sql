-- A post can carry a thumbnail image, shown in the client's Feed (a 3-column
-- grid in posting order). The file lives in the existing private
-- social-post-attachments bucket under "<post id>/…", so the bucket's
-- existing policies (staff upload, can_view_post() to read) already cover it.
alter table public.social_posts add column thumbnail_path text;
