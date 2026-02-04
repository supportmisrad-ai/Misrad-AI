-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "landing_testimonials_is_active_sort_order_idx" ON "landing_testimonials"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "landing_faq_is_active_sort_order_idx" ON "landing_faq"("is_active", "sort_order");

-- Insert default testimonials
INSERT INTO "landing_testimonials" ("name", "role", "company", "content", "rating", "sort_order") VALUES
('דוד כהן', 'מנהל', 'כהן שירותים', 'עברנו מאקסלים לMISRAD והחיים השתנו. הכל מסודר, אפשר לעקוב אחרי כל קריאה מהנייד.', 5, 1),
('רחל לוי', 'בעלים', 'לוי אחזקה', 'המערכת פשוטה ועובדת. הטכנאים שלנו השתמשו בה מיד ללא הדרכה מיוחדת.', 5, 2),
('משה אברהם', 'סמנכ"ל תפעול', 'אברהם מיזוג', 'סוף סוף יודעים מי איפה ומה הסטטוס של כל עבודה. חסכנו שעות של טלפונים.', 5, 3);

-- Insert default FAQ
INSERT INTO "landing_faq" ("question", "answer", "sort_order") VALUES
('כמה זמן לוקח להתחיל לעבוד?', 'מקסימום 10 דקות. נרשמים, מוסיפים את הצוות, ומתחילים לפתוח קריאות. זה באמת פשוט.', 1),
('צריך הדרכה?', 'לרוב לא. המערכת בנויה להיות אינטואיטיבית. יש תמיכה בעברית בכל שעה אם צריך.', 2),
('אפשר לייבא נתונים קיימים?', 'כן. תשלחו לנו את האקסלים ואנחנו נעזור לייבא אותם. זה חלק מהשירות.', 3),
('מה עם שבת?', 'המערכת מכבדת את השבת. אין התראות או הודעות בשבת וחגים.', 4);
