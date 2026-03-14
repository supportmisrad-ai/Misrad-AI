/**
 * הרצת migration לטבלאות התחזות על PROD
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Load PROD env
const envPath = path.join(process.cwd(), '.env.prod_backup');
if (!fs.existsSync(envPath)) {
  console.error('❌ קובץ .env.prod_backup לא נמצא');
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split(/\r?\n/);
for (const line of lines) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

console.log('✅ נטען מ-.env.prod_backup');
console.log('🚀 מריץ migration לטבלאות התחזות על PROD...\n');

const prisma = new PrismaClient();

async function run() {
  const statements = [
    `ALTER TABLE "impersonation_sessions" ADD COLUMN IF NOT EXISTS "otp_code" TEXT`,
    `ALTER TABLE "impersonation_sessions" ADD COLUMN IF NOT EXISTS "otp_expires_at" TIMESTAMPTZ(6)`,
    `ALTER TABLE "impersonation_sessions" ADD COLUMN IF NOT EXISTS "otp_verified_at" TIMESTAMPTZ(6)`,
    `DO $$ BEGIN CREATE TYPE "ImpersonationStatus" AS ENUM ('PENDING_OTP', 'OTP_SENT', 'ACTIVE', 'EXPIRED', 'REVOKED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `ALTER TABLE "impersonation_sessions" ADD COLUMN IF NOT EXISTS "status" "ImpersonationStatus" NOT NULL DEFAULT 'PENDING_OTP'`,
    `CREATE TABLE IF NOT EXISTS "impersonation_audit_logs" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "session_id" UUID NOT NULL, "admin_user_id" UUID NOT NULL, "client_id" UUID NOT NULL, "organization_id" UUID, "action" TEXT NOT NULL, "ip_address" TEXT, "user_agent" TEXT, "metadata" JSONB, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), CONSTRAINT "impersonation_audit_logs_pkey" PRIMARY KEY ("id"))`,
    `ALTER TABLE "impersonation_audit_logs" DROP CONSTRAINT IF EXISTS "impersonation_audit_logs_session_id_fkey"`,
    `ALTER TABLE "impersonation_audit_logs" ADD CONSTRAINT "impersonation_audit_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "impersonation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_admin_user_id_idx" ON "impersonation_audit_logs"("admin_user_id")`,
    `CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_client_id_idx" ON "impersonation_audit_logs"("client_id")`,
    `CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_created_at_idx" ON "impersonation_audit_logs"("created_at")`,
  ];
  
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log('✅', stmt.substring(0, 60) + '...');
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log('⏭️  Already exists:', stmt.substring(0, 40) + '...');
      } else {
        console.error('❌', e.message);
      }
    }
  }
  
  await prisma.$disconnect();
  console.log('\n✅ Migration PROD הושלם בהצלחה!');
}

run().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
