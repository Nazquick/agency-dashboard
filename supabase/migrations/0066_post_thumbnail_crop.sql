-- How a post's thumbnail is framed in the feed's square tile. The image is
-- shown "cover"-style, scaled up by thumbnail_zoom, and the point of the
-- image given by thumbnail_focus_x/y (0-1) sits at the centre of the tile.
-- Defaults (zoom 1, focus 0.5/0.5) are a plain centred crop, i.e. what
-- existing thumbnails already looked like.
alter table public.social_posts
  add column thumbnail_zoom real not null default 1 check (thumbnail_zoom between 1 and 5),
  add column thumbnail_focus_x real not null default 0.5 check (thumbnail_focus_x between 0 and 1),
  add column thumbnail_focus_y real not null default 0.5 check (thumbnail_focus_y between 0 and 1);
