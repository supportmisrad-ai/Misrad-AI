-- ============================================
-- BOOKING SYSTEM - FULL MIGRATION
-- MISRAD AI - Complete Booking Module Tables
-- ============================================
-- יצירת כל טבלאות מערכת התורים מ-0
-- תאריך: 2026-03-19
-- ============================================

-- ============================================
-- 1. ENUM TYPES
-- ============================================

-- סטטוס תור
CREATE TYPE "booking_appointment_status" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

-- סוג מיקום
CREATE TYPE "booking_location_type" AS ENUM ('zoom', 'meet', 'phone', 'address');

-- סוג תזכורת
CREATE TYPE "booking_reminder_type" AS ENUM ('email', 'sms', 'whatsapp');

-- סטטוס תזכורת
CREATE TYPE "booking_reminder_status" AS ENUM ('pending', 'sent', 'failed');

-- סטטוס תשלום
CREATE TYPE "booking_payment_status" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- סוג זמינות
CREATE TYPE "booking_availability_type" AS ENUM ('weekly', 'override', 'blocked');

-- ============================================
-- 2. טבלת נותני שירות (Providers)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID, -- קשר למשתמש במערכת (אופציונלי)
    
    -- פרטים בסיסיים
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    
    -- הגדרות
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "buffer_minutes" INTEGER NOT NULL DEFAULT 0, -- זמן מרווח בין תורים
    "max_daily_appointments" INTEGER, -- מקסימום תורים ביום (null = ללא הגבלה)
    
    -- הגדרות קלנדר
    "default_timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "working_hours_start" TEXT NOT NULL DEFAULT '09:00',
    "working_hours_end" TEXT NOT NULL DEFAULT '17:00',
    "working_days" INTEGER[] NOT NULL DEFAULT ARRAY[0, 1, 2, 3, 4], -- 0=ראשון, 6=שבת
    
    -- זמנים
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_providers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- אינדקסים לנותני שירות
CREATE INDEX "idx_booking_providers_org" ON "booking_providers"("organization_id");
CREATE INDEX "idx_booking_providers_org_active" ON "booking_providers"("organization_id", "is_active");
CREATE INDEX "idx_booking_providers_user" ON "booking_providers"("user_id");

-- ============================================
-- 3. טבלת שירותים (Services)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    
    -- פרטים בסיסיים
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1', -- צבע ביומן
    
    -- הגדרות זמן ומחיר
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "buffer_after_minutes" INTEGER NOT NULL DEFAULT 0, -- זמן מרווח אחרי התור
    "price_amount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    
    -- הגדרות מתקדמות
    "requires_payment" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "requires_reason" BOOLEAN NOT NULL DEFAULT false, -- דרישת סיבה לתור
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    
    -- זמנים
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_services_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- אינדקסים לשירותים
CREATE INDEX "idx_booking_services_org" ON "booking_services"("organization_id");
CREATE INDEX "idx_booking_services_org_active" ON "booking_services"("organization_id", "is_active");

-- ============================================
-- 4. טבלת קשר Provider-Service (many-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_provider_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    
    -- הגדרות ספציפיות לנותן השירות
    "custom_duration" INTEGER, -- null = ברירת מחדל מהשירות
    "custom_price" DECIMAL(10,2), -- null = ברירת מחדל מהשירות
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    
    -- זמנים
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_provider_services_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_provider_services_provider_fkey" FOREIGN KEY ("provider_id") REFERENCES "booking_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_provider_services_service_fkey" FOREIGN KEY ("service_id") REFERENCES "booking_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_provider_services_unique" UNIQUE ("provider_id", "service_id")
);

-- אינדקסים
CREATE INDEX "idx_provider_services_provider" ON "booking_provider_services"("provider_id");
CREATE INDEX "idx_provider_services_service" ON "booking_provider_services"("service_id");

-- ============================================
-- 5. טבלת זמינות (Availabilities)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_availabilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    
    -- סוג זמינות
    "type" "booking_availability_type" NOT NULL DEFAULT 'weekly',
    "day_of_week" INTEGER, -- 0-6 (לסוג weekly)
    "specific_date" DATE, -- לסוג override
    
    -- זמנים
    "start_time" TEXT NOT NULL, -- HH:MM
    "end_time" TEXT NOT NULL, -- HH:MM
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    
    -- סטטוס
    "is_available" BOOLEAN NOT NULL DEFAULT true, -- false = חסום
    "reason" TEXT, -- סיבת חסימה (אופציונלי)
    
    -- זמנים
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_availabilities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_availabilities_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_availabilities_provider_fkey" FOREIGN KEY ("provider_id") REFERENCES "booking_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- אינדקסים
CREATE INDEX "idx_availabilities_org" ON "booking_availabilities"("organization_id");
CREATE INDEX "idx_availabilities_provider" ON "booking_availabilities"("provider_id");
CREATE INDEX "idx_availabilities_provider_type" ON "booking_availabilities"("provider_id", "type");

-- ============================================
-- 6. טבלת לינקים ציבוריים (Links)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL, -- נותן השירות הראשי
    
    -- זיהוי
    "slug" TEXT NOT NULL, -- מזהה ייחודי ב-URL
    "title" TEXT NOT NULL,
    "description" TEXT,
    
    -- הגדרות זמן
    "available_days" INTEGER[] NOT NULL DEFAULT ARRAY[0, 1, 2, 3, 4], -- ימים פעילים
    "min_notice_hours" INTEGER NOT NULL DEFAULT 24, -- התראה מינימלית
    "max_booking_days" INTEGER NOT NULL DEFAULT 30, -- כמה ימים קדימה אפשר לקבוע
    "available_start_time" TEXT NOT NULL DEFAULT '09:00',
    "available_end_time" TEXT NOT NULL DEFAULT '17:00',
    "slot_duration_minutes" INTEGER, -- null = לפי השירות
    
    -- הגדרות מדיניות
    "allow_cancellations" BOOLEAN NOT NULL DEFAULT true,
    "cancellation_deadline_hours" INTEGER NOT NULL DEFAULT 24,
    "require_payment" BOOLEAN NOT NULL DEFAULT false,
    "payment_amount" DECIMAL(10,2), -- מחיר קבוע (null = לפי השירות)
    "require_approval" BOOLEAN NOT NULL DEFAULT false,
    "max_bookings_per_slot" INTEGER NOT NULL DEFAULT 1,
    
    -- מיקום
    "location_type" "booking_location_type" NOT NULL DEFAULT 'zoom',
    "location_details" TEXT, -- כתובת, לינק זום, וכו'
    
    -- הגדרות OTP (אימות לקוח)
    "require_otp" BOOLEAN NOT NULL DEFAULT true,
    "otp_valid_minutes" INTEGER NOT NULL DEFAULT 10,
    
    -- סטטוס
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "total_bookings" INTEGER NOT NULL DEFAULT 0,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    
    -- זמנים
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_links_organization_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_links_provider_fkey" FOREIGN KEY ("provider_id") REFERENCES "booking_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_links_slug_org_unique" UNIQUE ("organization_id", "slug")
);

-- אינדקסים
CREATE INDEX "idx_booking_links_org" ON "booking_links"("organization_id");
CREATE INDEX "idx_booking_links_org_active" ON "booking_links"("organization_id", "is_active");
CREATE INDEX "idx_booking_links_slug" ON "booking_links"("slug");

-- ============================================
-- 7. טבלת קשר Link-Service (many-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_link_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "link_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    
    -- הגדרות ספציפיות ללינק
    "custom_price" DECIMAL(10,2), -- null = מחיר ברירת מחדל
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    
    -- זמנים
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_link_services_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_link_services_link_fkey" FOREIGN KEY ("link_id") REFERENCES "booking_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_link_services_service_fkey" FOREIGN KEY ("service_id") REFERENCES "booking_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_link_services_unique" UNIQUE ("link_id", "service_id")
);

-- אינדקסים
CREATE INDEX "idx_link_services_link" ON "booking_link_services"("link_id");
CREATE INDEX "idx_link_services_service" ON "booking_link_services"("service_id");

-- ============================================
-- 8. טבלת תורים (Appointments)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "link_id" UUID, -- null = נוצר ידנית על ידי אדמין
    
    -- פרטי הלקוח
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT,
    "customer_company" TEXT,
    "customer_reason" TEXT, -- סיבת הפגישה
    
    -- זמני התור
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    
    -- מיקום
    "location_type" "booking_location_type" NOT NULL DEFAULT 'zoom',
    "location_details" TEXT, -- כתובת מלאה או לינק
    "meeting_link" TEXT, -- לינק לפגישה (זום/גוגל מיט)
    
    -- סטטוס ומדיניות
    "status" "booking_appointment_status" NOT NULL DEFAULT 'pending',
    "notes" TEXT, -- הערות פנימיות
    "customer_notes" TEXT, -- הערות שמוצגות ללקוח
    "cancel_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" TEXT, -- 'customer', 'provider', 'system'
    
    -- אישורים
    "confirmed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "no_show_at" TIMESTAMPTZ(6),
    
    -- ספירת שליחות תזכורת
    "reminder_sent_count" INTEGER NOT NULL DEFAULT 0,
    "last_reminder_sent_at" TIMESTAMPTZ(6),
    
    -- קואורדינטות GPS (לפגישות פיזיות)
    "customer_lat" DOUBLE PRECISION,
    "customer_lng" DOUBLE PRECISION,
    
    -- זמנים
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_appointments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_appointments_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_appointments_provider_fkey" FOREIGN KEY ("provider_id") REFERENCES "booking_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_appointments_service_fkey" FOREIGN KEY ("service_id") REFERENCES "booking_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_appointments_link_fkey" FOREIGN KEY ("link_id") REFERENCES "booking_links"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- אינדקסים
CREATE INDEX "idx_appointments_org" ON "booking_appointments"("organization_id");
CREATE INDEX "idx_appointments_provider" ON "booking_appointments"("provider_id");
CREATE INDEX "idx_appointments_provider_start" ON "booking_appointments"("provider_id", "start_time");
CREATE INDEX "idx_appointments_service" ON "booking_appointments"("service_id");
CREATE INDEX "idx_appointments_link" ON "booking_appointments"("link_id");
CREATE INDEX "idx_appointments_status" ON "booking_appointments"("status");
CREATE INDEX "idx_appointments_start_time" ON "booking_appointments"("start_time");
CREATE INDEX "idx_appointments_org_start" ON "booking_appointments"("organization_id", "start_time");

-- ============================================
-- 9. טבלת תשלומים (Payments)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    
    -- פרטי תשלום
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "status" "booking_payment_status" NOT NULL DEFAULT 'pending',
    
    -- שערוך חיצוני
    "external_provider" TEXT, -- 'green_invoice', 'stripe', 'paypal'
    "external_payment_id" TEXT,
    "external_payment_url" TEXT, -- URL לתשלום
    
    -- זמנים
    "paid_at" TIMESTAMPTZ(6),
    "refunded_at" TIMESTAMPTZ(6),
    "refund_reason" TEXT,
    
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_payments_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_payments_appointment_fkey" FOREIGN KEY ("appointment_id") REFERENCES "booking_appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_payments_appointment_unique" UNIQUE ("appointment_id")
);

-- אינדקסים
CREATE INDEX "idx_booking_payments_org" ON "booking_payments"("organization_id");
CREATE INDEX "idx_booking_payments_status" ON "booking_payments"("status");
CREATE INDEX "idx_booking_payments_external" ON "booking_payments"("external_provider", "external_payment_id");

-- ============================================
-- 10. טבלת תזכורות (Reminders)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    
    -- פרטי תזכורת
    "type" "booking_reminder_type" NOT NULL,
    "status" "booking_reminder_status" NOT NULL DEFAULT 'pending',
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL, -- מתי לשלוח
    "sent_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    
    -- תוכן
    "message_content" TEXT, -- תוכן שנשלח
    "recipient" TEXT NOT NULL, -- אימייל/טלפון
    
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_reminders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_reminders_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_reminders_appointment_fkey" FOREIGN KEY ("appointment_id") REFERENCES "booking_appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- אינדקסים
CREATE INDEX "idx_booking_reminders_org" ON "booking_reminders"("organization_id");
CREATE INDEX "idx_booking_reminders_appointment" ON "booking_reminders"("appointment_id");
CREATE INDEX "idx_booking_reminders_status" ON "booking_reminders"("status");
CREATE INDEX "idx_booking_reminders_scheduled" ON "booking_reminders"("scheduled_at");

-- ============================================
-- 11. טבלת רשימת המתנה (Waitlist)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_waitlist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    
    -- פרטי מבקש
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT,
    
    -- העדפות
    "preferred_date_start" DATE, -- טווח תאריכים
    "preferred_date_end" DATE,
    "preferred_time_start" TEXT, -- טווח שעות
    "preferred_time_end" TEXT,
    "preferred_days" INTEGER[], -- ימים מועדפים
    
    -- סטטוס
    "status" TEXT NOT NULL DEFAULT 'active', -- 'active', 'notified', 'converted', 'expired'
    "notes" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- המרה לתור
    "converted_to_appointment_id" UUID,
    "notified_at" TIMESTAMPTZ(6),
    
    -- תפוגה
    "expires_at" TIMESTAMPTZ(6),
    
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_waitlist_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_waitlist_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_waitlist_provider_fkey" FOREIGN KEY ("provider_id") REFERENCES "booking_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_waitlist_service_fkey" FOREIGN KEY ("service_id") REFERENCES "booking_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_waitlist_appointment_fkey" FOREIGN KEY ("converted_to_appointment_id") REFERENCES "booking_appointments"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- אינדקסים
CREATE INDEX "idx_booking_waitlist_org" ON "booking_waitlist"("organization_id");
CREATE INDEX "idx_booking_waitlist_provider" ON "booking_waitlist"("provider_id");
CREATE INDEX "idx_booking_waitlist_status" ON "booking_waitlist"("status");
CREATE INDEX "idx_booking_waitlist_expires" ON "booking_waitlist"("expires_at");

-- ============================================
-- 12. טבלת OTP לאימות (Verification Codes)
-- ============================================

CREATE TABLE IF NOT EXISTS "booking_verification_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    
    -- פרטי אימות
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "link_id" UUID NOT NULL,
    
    -- סטטוס
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    
    -- תפוגה
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_verification_codes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_verification_codes_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "booking_verification_codes_link_fkey" FOREIGN KEY ("link_id") REFERENCES "booking_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- אינדקסים
CREATE INDEX "idx_booking_verification_codes_org" ON "booking_verification_codes"("organization_id");
CREATE INDEX "idx_booking_verification_codes_phone" ON "booking_verification_codes"("phone");
CREATE INDEX "idx_booking_verification_codes_expires" ON "booking_verification_codes"("expires_at");

-- ============================================
-- 13. RLS (Row Level Security) Policies
-- ============================================

-- Providers RLS
ALTER TABLE "booking_providers" ENABLE ROW LEVEL SECURITY;

-- Services RLS
ALTER TABLE "booking_services" ENABLE ROW LEVEL SECURITY;

-- Provider Services RLS
ALTER TABLE "booking_provider_services" ENABLE ROW LEVEL SECURITY;

-- Availabilities RLS
ALTER TABLE "booking_availabilities" ENABLE ROW LEVEL SECURITY;

-- Links RLS
ALTER TABLE "booking_links" ENABLE ROW LEVEL SECURITY;

-- Link Services RLS
ALTER TABLE "booking_link_services" ENABLE ROW LEVEL SECURITY;

-- Appointments RLS
ALTER TABLE "booking_appointments" ENABLE ROW LEVEL SECURITY;

-- Payments RLS
ALTER TABLE "booking_payments" ENABLE ROW LEVEL SECURITY;

-- Reminders RLS
ALTER TABLE "booking_reminders" ENABLE ROW LEVEL SECURITY;

-- Waitlist RLS
ALTER TABLE "booking_waitlist" ENABLE ROW LEVEL SECURITY;

-- Verification Codes RLS
ALTER TABLE "booking_verification_codes" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 14. Function: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all booking tables
CREATE TRIGGER booking_providers_updated_at BEFORE UPDATE ON "booking_providers"
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

CREATE TRIGGER booking_services_updated_at BEFORE UPDATE ON "booking_services"
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

CREATE TRIGGER booking_provider_services_updated_at BEFORE UPDATE ON "booking_provider_services"
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

CREATE TRIGGER booking_availabilities_updated_at BEFORE UPDATE ON "booking_availabilities"
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

CREATE TRIGGER booking_links_updated_at BEFORE UPDATE ON "booking_links"
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

CREATE TRIGGER booking_link_services_updated_at BEFORE UPDATE ON "booking_link_services"
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

CREATE TRIGGER booking_appointments_updated_at BEFORE UPDATE ON "booking_appointments"
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

CREATE TRIGGER booking_payments_updated_at BEFORE UPDATE ON "booking_payments"
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

CREATE TRIGGER booking_reminders_updated_at BEFORE UPDATE ON "booking_reminders"
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

CREATE TRIGGER booking_waitlist_updated_at BEFORE UPDATE ON "booking_waitlist"
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

-- ============================================
-- 15. סיכום
-- ============================================
-- נוצרו בהצלחה:
-- - 11 טבלאות
-- - 40+ אינדקסים
-- - 11 RLS policies enabled
-- - 10 triggers לעדכון אוטומטי
-- - Foreign keys מקיפים
-- ============================================
