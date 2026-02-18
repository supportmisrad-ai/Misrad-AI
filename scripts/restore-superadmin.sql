-- ═══════════════════════════════════════════════════════════════════
-- restore-superadmin.sql
-- Generated: 2026-02-18T20:21:04.471Z
-- Super Admin restore script for clean-schema PROD reset
-- Run AFTER: prisma migrate deploy  (on fresh empty DB)
-- Usage:  psql $DIRECT_URL -f scripts/restore-superadmin.sql
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. OrganizationUser (Super Admin) ─────────────────────────────
INSERT INTO organization_users (id, clerk_user_id, email, full_name, avatar_url, role, allowed_modules, created_at, updated_at) VALUES ('8b3d565d-d790-4cdf-88cb-813eb9fd6dde', 'user_39UkuSmIkk20b1MuAahuYqWHKoe', 'itsikdahan1@gmail.com', 'יצחק דהן', NULL, 'מנכ״ל', NULL, '2026-02-17T12:00:36.747Z', '2026-02-18T14:41:55.980Z') ON CONFLICT (clerk_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();

-- ─── 2. Organizations ──────────────────────────────────────────────
-- Org: Misrad AI HQ (slug: misrad-ai-hq, plan: the_empire)
INSERT INTO organizations (id, name, slug, logo, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, seats_allowed, subscription_plan, subscription_status, trial_days, trial_start_date, trial_end_date, balance, ai_credits_balance_cents, is_shabbat_protected, billing_email, tax_id, mrr, arr, discount_percent, created_at, updated_at) VALUES ('185e7212-23fc-4170-98ca-be3213424fc7', 'Misrad AI HQ', 'misrad-ai-hq', NULL, '8b3d565d-d790-4cdf-88cb-813eb9fd6dde', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 10, 'the_empire', 'active', 0, NULL, NULL, 0, 0, TRUE, NULL, NULL, 0, 0, 0, '2026-02-17T12:00:37.852Z', '2026-02-17T12:00:37.852Z') ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now();
-- Org: Test SOLO (slug: test-solo, plan: solo)
INSERT INTO organizations (id, name, slug, logo, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, seats_allowed, subscription_plan, subscription_status, trial_days, trial_start_date, trial_end_date, balance, ai_credits_balance_cents, is_shabbat_protected, billing_email, tax_id, mrr, arr, discount_percent, created_at, updated_at) VALUES ('e74e118e-d317-4e35-aeaa-cf70fc7a39b4', 'Test SOLO', 'test-solo', NULL, '8b3d565d-d790-4cdf-88cb-813eb9fd6dde', FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 1, 'solo', 'trial', 14, NULL, NULL, 0, 0, TRUE, NULL, NULL, 0, 0, 0, '2026-02-17T12:00:39.456Z', '2026-02-17T12:00:39.456Z') ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now();
-- Org: Test THE CLOSER (slug: test-the_closer, plan: the_closer)
INSERT INTO organizations (id, name, slug, logo, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, seats_allowed, subscription_plan, subscription_status, trial_days, trial_start_date, trial_end_date, balance, ai_credits_balance_cents, is_shabbat_protected, billing_email, tax_id, mrr, arr, discount_percent, created_at, updated_at) VALUES ('e7b3e758-0934-4d1a-b79c-ea2701114a59', 'Test THE CLOSER', 'test-the_closer', NULL, '8b3d565d-d790-4cdf-88cb-813eb9fd6dde', TRUE, FALSE, TRUE, TRUE, FALSE, FALSE, 5, 'the_closer', 'active', 0, NULL, NULL, 0, 0, TRUE, NULL, NULL, 0, 0, 0, '2026-02-17T12:00:40.166Z', '2026-02-17T12:00:40.166Z') ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now();
-- Org: Test THE AUTHORITY (slug: test-the_authority, plan: the_authority)
INSERT INTO organizations (id, name, slug, logo, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, seats_allowed, subscription_plan, subscription_status, trial_days, trial_start_date, trial_end_date, balance, ai_credits_balance_cents, is_shabbat_protected, billing_email, tax_id, mrr, arr, discount_percent, created_at, updated_at) VALUES ('424c0ed4-0123-4233-b8f1-a5319b6bffdd', 'Test THE AUTHORITY', 'test-the_authority', NULL, '8b3d565d-d790-4cdf-88cb-813eb9fd6dde', TRUE, TRUE, FALSE, TRUE, TRUE, FALSE, 5, 'the_authority', 'active', 0, NULL, NULL, 0, 0, TRUE, NULL, NULL, 0, 0, 0, '2026-02-17T12:00:40.883Z', '2026-02-17T12:00:40.883Z') ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now();
-- Org: Test THE OPERATOR (slug: test-the_operator, plan: the_operator)
INSERT INTO organizations (id, name, slug, logo, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, seats_allowed, subscription_plan, subscription_status, trial_days, trial_start_date, trial_end_date, balance, ai_credits_balance_cents, is_shabbat_protected, billing_email, tax_id, mrr, arr, discount_percent, created_at, updated_at) VALUES ('f0effee4-4c8b-459c-9a3a-9eef95394b61', 'Test THE OPERATOR', 'test-the_operator', NULL, '8b3d565d-d790-4cdf-88cb-813eb9fd6dde', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, 5, 'the_operator', 'active', 0, NULL, NULL, 0, 0, TRUE, NULL, NULL, 0, 0, 0, '2026-02-17T12:00:41.607Z', '2026-02-17T12:00:41.607Z') ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now();
-- Org: Test THE EMPIRE (slug: test-the_empire, plan: the_empire)
INSERT INTO organizations (id, name, slug, logo, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, seats_allowed, subscription_plan, subscription_status, trial_days, trial_start_date, trial_end_date, balance, ai_credits_balance_cents, is_shabbat_protected, billing_email, tax_id, mrr, arr, discount_percent, created_at, updated_at) VALUES ('f7560b9e-955b-44ad-bb19-7855c4e8a610', 'Test THE EMPIRE', 'test-the_empire', NULL, '8b3d565d-d790-4cdf-88cb-813eb9fd6dde', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 5, 'the_empire', 'active', 0, NULL, NULL, 0, 0, TRUE, NULL, NULL, 0, 0, 0, '2026-02-17T12:00:42.313Z', '2026-02-17T12:00:42.313Z') ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now();
-- Org: Test THE MENTOR (slug: test-the_mentor, plan: the_mentor)
INSERT INTO organizations (id, name, slug, logo, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, seats_allowed, subscription_plan, subscription_status, trial_days, trial_start_date, trial_end_date, balance, ai_credits_balance_cents, is_shabbat_protected, billing_email, tax_id, mrr, arr, discount_percent, created_at, updated_at) VALUES ('34b65af9-07fb-4188-afe4-c9f9e7786155', 'Test THE MENTOR', 'test-the_mentor', NULL, '8b3d565d-d790-4cdf-88cb-813eb9fd6dde', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 5, 'the_mentor', 'active', 0, NULL, NULL, 0, 0, TRUE, NULL, NULL, 0, 0, 0, '2026-02-17T12:00:43.036Z', '2026-02-17T12:00:43.036Z') ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now();

-- ─── 3. Link Super Admin → Primary Organization ────────────────────
UPDATE organization_users
  SET organization_id = '185e7212-23fc-4170-98ca-be3213424fc7', updated_at = now()
  WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

-- ─── 4. Profiles ───────────────────────────────────────────────────
INSERT INTO profiles (id, organization_id, clerk_user_id, email, full_name, avatar_url, phone, role, notification_preferences, ui_preferences, social_profile, billing_info, created_at, updated_at) VALUES ('fbffa819-acc5-49cd-bfbd-e0d4f1c69a1d', '185e7212-23fc-4170-98ca-be3213424fc7', 'user_39UkuSmIkk20b1MuAahuYqWHKoe', 'itsikdahan1@gmail.com', 'יצחק דהן', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzM5VWt2VlBaSml2WXoyM2RzRmJ4VVRIQUlKMiJ9', NULL, 'super_admin', '{}'::jsonb, '{"profileCompleted":false}'::jsonb, '{}'::jsonb, '{}'::jsonb, '2026-02-17T12:10:35.717Z', '2026-02-17T12:10:35.700Z') ON CONFLICT (organization_id, clerk_user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now();

-- ─── 5. Organization Settings ──────────────────────────────────────
INSERT INTO organization_settings (organization_id, ai_dna, ai_quota_cents, created_at, updated_at) VALUES ('185e7212-23fc-4170-98ca-be3213424fc7', '{"__ai_history_by_user_v1":{"user_39UkuSmIkk20b1MuAahuYqWHKoe":[]}}'::jsonb, NULL, '2026-02-17T12:11:18.825Z', '2026-02-18T14:42:06.189Z') ON CONFLICT (organization_id) DO UPDATE SET
    ai_dna = EXCLUDED.ai_dna,
    ai_quota_cents = EXCLUDED.ai_quota_cents,
    updated_at = now();

-- ─── 8. NexusUsers (Admin employee profiles) ───────────────────────
INSERT INTO nexus_users (id, organization_id, name, role, department, email, phone, is_super_admin, created_at, updated_at) VALUES ('e3f6d8e6-db1b-4d50-97b0-1feac42a0fa9', '185e7212-23fc-4170-98ca-be3213424fc7', 'יצחק דהן', 'super_admin', NULL, 'itsikdahan1@gmail.com', NULL, TRUE, '2026-02-17T12:10:36.521Z', '2026-02-18T14:42:29.266Z') ON CONFLICT (organization_id, email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = now();

COMMIT;

-- ─── Verification Queries ──────────────────────────────────────────
SELECT 'organization_users' AS tbl, count(*)::text AS cnt FROM organization_users WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
UNION ALL SELECT 'organizations', count(*)::text FROM organizations WHERE owner_id = (SELECT id FROM organization_users WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe');
