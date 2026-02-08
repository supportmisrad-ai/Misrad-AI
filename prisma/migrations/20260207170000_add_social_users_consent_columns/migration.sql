ALTER TABLE public.social_users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz(6);
ALTER TABLE public.social_users ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz(6);
ALTER TABLE public.social_users ADD COLUMN IF NOT EXISTS terms_accepted_version text;
ALTER TABLE public.social_users ADD COLUMN IF NOT EXISTS privacy_accepted_version text;
