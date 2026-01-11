-- Adds a human-friendly slug to organizations and backfills existing rows.
-- NOTE: Review in a staging environment first.

alter table if exists public.organizations
  add column if not exists slug text;

-- Backfill slug for existing orgs that don't have one.
-- This is a simple slugify: lowercase, replace non-alnum with '-', trim '-'.
update public.organizations
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
where slug is null and name is not null;

-- Ensure uniqueness (allows multiple NULLs).
create unique index if not exists organizations_slug_key
  on public.organizations (slug)
  where slug is not null;
