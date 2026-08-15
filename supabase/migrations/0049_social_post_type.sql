-- Post format (story/reel/carousel/post) alongside media type — separate
-- axis, e.g. a video can be posted as either a Reel or a regular feed post.

alter table public.social_posts
  add column post_type text not null default 'post'
  check (post_type in ('story', 'reel', 'carousel', 'post'));
