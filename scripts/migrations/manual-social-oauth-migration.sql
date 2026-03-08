-- ========================================
-- Social OAuth Direct Publishing Migration
-- Manual SQL script (if Prisma migrate fails)
-- Date: March 7, 2026
-- ========================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. ClientSocialToken - OAuth tokens storage
-- ========================================
CREATE TABLE IF NOT EXISTS "client_social_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "scope" TEXT,
    "platform_user_id" TEXT,
    "platform_page_id" TEXT,
    "platform_page_name" TEXT,
    "platform_account_type" TEXT,
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_refreshed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_social_tokens_pkey" PRIMARY KEY ("id")
);

-- Indexes for ClientSocialToken
CREATE INDEX IF NOT EXISTS "client_social_tokens_organization_id_idx" ON "client_social_tokens"("organization_id");
CREATE INDEX IF NOT EXISTS "client_social_tokens_client_id_idx" ON "client_social_tokens"("client_id");
CREATE INDEX IF NOT EXISTS "client_social_tokens_platform_idx" ON "client_social_tokens"("platform");
CREATE INDEX IF NOT EXISTS "client_social_tokens_is_active_idx" ON "client_social_tokens"("is_active");
CREATE INDEX IF NOT EXISTS "client_social_tokens_expires_at_idx" ON "client_social_tokens"("expires_at");

-- ========================================
-- 2. SocialMediaPublishedPost - Published posts tracking
-- ========================================
CREATE TABLE IF NOT EXISTS "social_media_published_posts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_post_id" TEXT NOT NULL,
    "platform_post_url" TEXT,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publish_status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "engagement_likes" INTEGER DEFAULT 0,
    "engagement_comments" INTEGER DEFAULT 0,
    "engagement_shares" INTEGER DEFAULT 0,
    "engagement_impressions" INTEGER DEFAULT 0,
    "engagement_reach" INTEGER DEFAULT 0,
    "engagement_clicks" INTEGER DEFAULT 0,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_media_published_posts_pkey" PRIMARY KEY ("id")
);

-- Indexes for SocialMediaPublishedPost
CREATE INDEX IF NOT EXISTS "social_media_published_posts_organization_id_idx" ON "social_media_published_posts"("organization_id");
CREATE INDEX IF NOT EXISTS "social_media_published_posts_post_id_idx" ON "social_media_published_posts"("post_id");
CREATE INDEX IF NOT EXISTS "social_media_published_posts_client_id_idx" ON "social_media_published_posts"("client_id");
CREATE INDEX IF NOT EXISTS "social_media_published_posts_platform_idx" ON "social_media_published_posts"("platform");
CREATE INDEX IF NOT EXISTS "social_media_published_posts_published_at_idx" ON "social_media_published_posts"("published_at");

-- ========================================
-- 3. CampaignPost - Campaign to Post relation
-- ========================================
CREATE TABLE IF NOT EXISTS "campaign_posts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaign_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_posts_pkey" PRIMARY KEY ("id")
);

-- Indexes for CampaignPost
CREATE INDEX IF NOT EXISTS "campaign_posts_campaign_id_idx" ON "campaign_posts"("campaign_id");
CREATE INDEX IF NOT EXISTS "campaign_posts_post_id_idx" ON "campaign_posts"("post_id");
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_posts_campaign_id_post_id_key" ON "campaign_posts"("campaign_id", "post_id");

-- ========================================
-- 4. Update existing tables
-- ========================================

-- Add organization_id to webhook_configs if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'webhook_configs' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE "webhook_configs" ADD COLUMN "organization_id" TEXT;
        CREATE INDEX IF NOT EXISTS "webhook_configs_organization_id_idx" ON "webhook_configs"("organization_id");
    END IF;
END $$;

-- Add fields to socialmedia_campaigns if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'socialmedia_campaigns' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE "socialmedia_campaigns" ADD COLUMN "organization_id" TEXT;
        CREATE INDEX IF NOT EXISTS "socialmedia_campaigns_organization_id_idx" ON "socialmedia_campaigns"("organization_id");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'socialmedia_campaigns' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE "socialmedia_campaigns" ADD COLUMN "description" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'socialmedia_campaigns' 
        AND column_name = 'start_date'
    ) THEN
        ALTER TABLE "socialmedia_campaigns" ADD COLUMN "start_date" TIMESTAMPTZ(6);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'socialmedia_campaigns' 
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE "socialmedia_campaigns" ADD COLUMN "end_date" TIMESTAMPTZ(6);
    END IF;
END $$;

-- Add index on scheduled_at for social_posts if not exists
CREATE INDEX IF NOT EXISTS "social_posts_scheduled_at_idx" ON "social_posts"("scheduled_at");

-- ========================================
-- Verification queries
-- ========================================

-- Check that all tables exist
SELECT 
    'client_social_tokens' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_social_tokens') as exists
UNION ALL
SELECT 
    'social_media_published_posts',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_media_published_posts')
UNION ALL
SELECT 
    'campaign_posts',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_posts')
ORDER BY table_name;

-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('client_social_tokens', 'social_media_published_posts', 'campaign_posts')
ORDER BY tablename, indexname;

-- Done!
SELECT 'Migration completed successfully!' as status;
