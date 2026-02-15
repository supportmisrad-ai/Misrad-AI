-- Fix missing tables in production DB
-- Run with: echo scripts/fix-prod-missing-tables.sql content | npx dotenv -e .env.prod_backup -- prisma db execute --stdin

-- 1. Create profiles table (missing in prod)
CREATE TABLE IF NOT EXISTS "profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "bio" TEXT,
    "notification_preferences" JSONB NOT NULL DEFAULT '{}',
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ui_preferences" JSONB NOT NULL DEFAULT '{}',
    "social_profile" JSONB NOT NULL DEFAULT '{}',
    "billing_info" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- profiles indexes
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_organization_id_clerk_user_id_key" ON "profiles"("organization_id", "clerk_user_id");
CREATE INDEX IF NOT EXISTS "profiles_organization_id_idx" ON "profiles"("organization_id");
CREATE INDEX IF NOT EXISTS "profiles_clerk_user_id_idx" ON "profiles"("clerk_user_id");

-- profiles FK
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_organization_id_fkey') THEN
    ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "social_organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
  END IF;
END $$;

-- 2. Create landing_testimonials table
CREATE TABLE IF NOT EXISTS "landing_testimonials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "landing_testimonials_pkey" PRIMARY KEY ("id")
);

-- Add video/cover columns if missing
ALTER TABLE "landing_testimonials" ADD COLUMN IF NOT EXISTS "video_url" TEXT;
ALTER TABLE "landing_testimonials" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;

CREATE INDEX IF NOT EXISTS "landing_testimonials_is_active_sort_order_idx" ON "landing_testimonials"("is_active", "sort_order");

-- 3. Create landing_faq table
CREATE TABLE IF NOT EXISTS "landing_faq" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "landing_faq_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "landing_faq_is_active_sort_order_idx" ON "landing_faq"("is_active", "sort_order");

-- 4. Insert default testimonials if table is empty
INSERT INTO "landing_testimonials" ("name", "role", "company", "content", "rating", "sort_order")
SELECT * FROM (VALUES
  ('דוד כהן', 'מנהל', 'כהן שירותים', 'עברנו מאקסלים לMISRAD AI והחיים השתנו. הכל מסודר, אפשר לעקוב אחרי כל קריאה מהנייד.', 5, 1),
  ('רחל לוי', 'בעלים', 'לוי אחזקה', 'המערכת פשוטה ועובדת. הטכנאים שלנו השתמשו בה מיד ללא הדרכה מיוחדת.', 5, 2),
  ('משה אברהם', 'סמנכ"ל תפעול', 'אברהם מיזוג', 'סוף סוף יודעים מי איפה ומה הסטטוס של כל עבודה. חסכנו שעות של טלפונים.', 5, 3)
) AS t("name", "role", "company", "content", "rating", "sort_order")
WHERE NOT EXISTS (SELECT 1 FROM "landing_testimonials" LIMIT 1);

-- 5. Insert default FAQ if table is empty
INSERT INTO "landing_faq" ("question", "answer", "sort_order")
SELECT * FROM (VALUES
  ('כמה זמן לוקח להתחיל לעבוד?', 'מקסימום 10 דקות. נרשמים, מוסיפים את הצוות, ומתחילים לפתוח קריאות. זה באמת פשוט.', 1),
  ('צריך הדרכה?', 'לרוב לא. המערכת בנויה להיות אינטואיטיבית. יש תמיכה בעברית בכל שעה אם צריך.', 2),
  ('אפשר לייבא נתונים קיימים?', 'כן. תשלחו לנו את האקסלים ואנחנו נעזור לייבא אותם. זה חלק מהשירות.', 3),
  ('מה עם שבת?', 'המערכת מכבדת את השבת. אין התראות או הודעות בשבת וחגים.', 4)
) AS t("question", "answer", "sort_order")
WHERE NOT EXISTS (SELECT 1 FROM "landing_faq" LIMIT 1);
