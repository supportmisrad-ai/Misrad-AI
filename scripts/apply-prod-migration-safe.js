const fs = require('fs');
const dotenv = require('dotenv');

console.log('🔒 PROD Migration - Safe Mode (Split Statements)');
console.log('=================================================\n');

const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const prodEnv = dotenv.parse(prodContent);
process.env.DATABASE_URL = prodEnv.DIRECT_URL;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🛡️  בדיקות בטיחות...');
    const tablesToCreate = ['impersonation_audit_logs', 'partner_link_usage'];
    
    for (const table of tablesToCreate) {
      const result = await prisma.$queryRaw`SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${table}
      ) as e`;
      if (result[0].e) {
        console.log(`   ✅ ${table} כבר קיימת`);
        return;
      }
    }
    console.log('   ✅ טבלאות חסרות - ממשיך\n');
    
    // ============================================
    // Create impersonation_audit_logs
    // ============================================
    console.log('📝 יוצר טבלה: impersonation_audit_logs');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "impersonation_audit_logs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "session_id" UUID NOT NULL,
        "admin_user_id" UUID NOT NULL,
        "client_id" UUID NOT NULL,
        "organization_id" UUID,
        "action" TEXT NOT NULL,
        "ip_address" TEXT,
        "user_agent" TEXT,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "impersonation_audit_logs_pkey" PRIMARY KEY ("id")
      )
    `);
    
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_admin_user_id_idx" ON "impersonation_audit_logs"("admin_user_id")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_client_id_idx" ON "impersonation_audit_logs"("client_id")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_created_at_idx" ON "impersonation_audit_logs"("created_at")`);
    
    // Add FK safely
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "impersonation_audit_logs" 
        ADD CONSTRAINT "impersonation_audit_logs_session_id_fkey" 
        FOREIGN KEY ("session_id") REFERENCES "impersonation_sessions"("id") ON DELETE CASCADE
      `);
      console.log('   ✅ Foreign key added');
    } catch(e) {
      console.log('   ⚠️ FK skipped:', e.message.substring(0, 50));
    }
    
    console.log('   ✅ נוצרה בהצלחה\n');
    
    // ============================================
    // Create partner_link_usage  
    // ============================================
    console.log('📝 יוצר טבלה: partner_link_usage');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "partner_link_usage" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "partner_id" UUID NOT NULL,
        "visitor_phone" TEXT,
        "visitor_ip" TEXT,
        "user_agent" TEXT,
        "referrer" TEXT,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "converted" BOOLEAN NOT NULL DEFAULT false,
        "converted_at" TIMESTAMPTZ(6),
        "commission" DECIMAL(10, 2) DEFAULT 0,
        CONSTRAINT "partner_link_usage_pkey" PRIMARY KEY ("id")
      )
    `);
    
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "partner_link_usage_partner_id_idx" ON "partner_link_usage"("partner_id")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "partner_link_usage_created_at_idx" ON "partner_link_usage"("created_at")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "partner_link_usage_converted_idx" ON "partner_link_usage"("converted")`);
    
    console.log('   ✅ נוצרה בהצלחה\n');
    
    // ============================================
    // Verify and record
    // ============================================
    console.log('🔍 מאמת יצירת טבלאות...');
    for (const table of tablesToCreate) {
      const result = await prisma.$queryRaw`SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${table}
      ) as e`;
      console.log(`   ${table}: ${result[0].e ? '✅ נוצרה' : '❌ לא נוצרה'}`);
    }
    
    // Record migration
    await prisma.$executeRaw`
      INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
      VALUES (
        gen_random_uuid(),
        'manual-' || extract(epoch from now())::text,
        NOW(),
        '20260315150000_add_missing_prod_tables',
        NOW(),
        1
      )
      ON CONFLICT DO NOTHING
    `;
    console.log('\n   _prisma_migrations: ✅ עודכן');
    
    await prisma.$disconnect();
    console.log('\n🎉 מיגרציה הושלמה בהצלחה!');
    
  } catch (error) {
    console.error('\n❌ שגיאה:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runMigration();
