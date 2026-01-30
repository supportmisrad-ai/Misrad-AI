ALTER TABLE IF EXISTS public.social_users
  ADD COLUMN IF NOT EXISTS last_org_slug text;

ALTER TABLE IF EXISTS public.social_users
  ADD COLUMN IF NOT EXISTS last_module text;

ALTER TABLE IF EXISTS public.social_users
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
