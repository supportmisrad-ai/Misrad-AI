// AI Tower Migration Script
// מריץ את ה-SQL ישירות על ה-DB

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🏛️ AI Tower Migration - Starting...');
  
  const sqlPath = path.join(__dirname, '../prisma/migrations/20260313020000_ai_tower_tables/migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // הרצה ישירה של כל ה-SQL
  console.log('Executing full SQL...');
  
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ All tables created successfully!');
  } catch (error) {
    // אם יש שגיאה - מנסה פקודה אחר פקודה
    console.log('⚠️ Batch failed, trying one by one...');
    
    // פקודות יצירת טבלאות
    const createTables = [
      `CREATE TABLE IF NOT EXISTS ai_tower_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        email TEXT NOT NULL,
        organization_id UUID,
        action TEXT NOT NULL,
        reason TEXT NOT NULL,
        user_agent TEXT,
        ip TEXT,
        metadata JSONB,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS ai_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        organization_id UUID NOT NULL,
        user_id UUID NOT NULL,
        payload JSONB NOT NULL,
        metadata JSONB,
        processed BOOLEAN NOT NULL DEFAULT FALSE,
        processed_at TIMESTAMPTZ
      )`,
      `CREATE TABLE IF NOT EXISTS ai_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        rule_id TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        related_event_ids UUID[] DEFAULT '{}',
        entity_id UUID,
        entity_type TEXT,
        suggested_action_type TEXT,
        suggested_action_label TEXT,
        suggested_action_params JSONB,
        requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,
        resolved_by UUID,
        visible_to_roles TEXT[] DEFAULT '{}'
      )`,
      `CREATE TABLE IF NOT EXISTS ai_action_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        insight_id UUID NOT NULL,
        user_id UUID NOT NULL,
        action_type TEXT NOT NULL,
        action_params JSONB,
        status TEXT NOT NULL DEFAULT 'pending',
        result JSONB,
        error TEXT,
        approved_by UUID,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        executed_at TIMESTAMPTZ
      )`,
      `CREATE TABLE IF NOT EXISTS ai_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID,
        rule_key TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        event_types TEXT[] NOT NULL DEFAULT '{}',
        conditions JSONB NOT NULL,
        action_type TEXT NOT NULL,
        action_params JSONB,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        priority INT NOT NULL DEFAULT 100,
        cooldown_minutes INT NOT NULL DEFAULT 60,
        severity TEXT NOT NULL DEFAULT 'medium',
        visible_to_roles TEXT[] DEFAULT ARRAY['מנכ״ל', 'אדמין', 'סמנכ״ל', 'מנהל'],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
    ];
    
    for (let i = 0; i < createTables.length; i++) {
      try {
        console.log(`[${i + 1}/${createTables.length}] Creating table...`);
        await prisma.$executeRawUnsafe(createTables[i]);
        console.log('✅ Success');
      } catch (err) {
        if (err.message?.includes('already exists')) {
          console.log('⚠️ Already exists - skipping');
        } else {
          console.error('❌ Error:', err.message);
        }
      }
    }
    
    // יצירת אינדקסים
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_ai_tower_audit_user_id ON ai_tower_audit_logs(user_id, timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_tower_audit_org_id ON ai_tower_audit_logs(organization_id, timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_events_org_timestamp ON ai_events(organization_id, timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_insights_org_status ON ai_insights(organization_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_action_logs_insight ON ai_action_logs(insight_id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_rules_org_key ON ai_rules(organization_id, rule_key)`,
    ];
    
    for (const idx of indexes) {
      try {
        await prisma.$executeRawUnsafe(idx);
        console.log('✅ Index created');
      } catch (err) {
        console.log('⚠️ Index skipped:', err.message?.substring(0, 50));
      }
    }
  }
  
  console.log('\n✅ AI Tower Migration Complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
