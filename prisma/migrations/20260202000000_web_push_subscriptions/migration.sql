CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  clerk_user_id text NOT NULL,
  email text NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  expiration_time timestamptz NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_web_push_subscriptions_user_endpoint
  ON web_push_subscriptions (organization_id, email, endpoint);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_organization_id_idx
  ON web_push_subscriptions (organization_id);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_clerk_user_id_idx
  ON web_push_subscriptions (clerk_user_id);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_email_idx
  ON web_push_subscriptions (email);
