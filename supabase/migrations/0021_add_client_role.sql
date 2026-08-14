-- Retroactively fills a gap in this migration history. The 'client' portal
-- role has existed in production since early on, but the original
-- statement adding it to the `user_role` enum predates this project's
-- current migration-tracking discipline and was applied directly (Studio
-- SQL editor) rather than saved as a tracked file — leaving this numbering
-- gap and an incomplete replay history. Discovered by actually replaying
-- the full migration set against a fresh project while building the
-- white-label onboarding feature: 0022_client_portal.sql immediately
-- after this one compares profiles.role against 'client', which requires
-- the enum to already contain that value, and errored on a truly blank
-- database.
--
-- Do NOT apply this to DYOR's own production project: by the time 0028
-- runs there, `user_role` is dropped entirely in favor of a plain `text`
-- column, so `user_role` no longer exists in production today and this
-- statement would simply error there (type does not exist). This file
-- exists only so a fresh white-label tenant replaying 0001 onward gets a
-- complete, working schema.

alter type public.user_role add value if not exists 'client';
