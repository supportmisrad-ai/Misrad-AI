-- AlterTable
ALTER TABLE "landing_testimonials" ADD COLUMN IF NOT EXISTS "video_url" TEXT;
ALTER TABLE "landing_testimonials" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;

-- AlterTable
ALTER TABLE "landing_faq" ADD COLUMN IF NOT EXISTS "video_url" TEXT;
ALTER TABLE "landing_faq" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
