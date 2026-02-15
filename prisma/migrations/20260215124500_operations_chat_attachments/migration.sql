-- Operations Chat Attachments: add attachment columns to call messages
-- Safe idempotent migration

ALTER TABLE "operations_call_messages" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;
ALTER TABLE "operations_call_messages" ADD COLUMN IF NOT EXISTS "attachment_type" TEXT;
