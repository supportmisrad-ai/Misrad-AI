const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = 'postgresql://postgres.jlgoeqhlkxyhlfnijyxu:itsik25AS%4025@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=10';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🚀 Fixing Database Issues...');
  
  try {
    // 1. Create missing tables
    console.log('📦 Creating missing tables...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        session_id TEXT PRIMARY KEY,
        organization_id UUID NOT NULL,
        user_id TEXT,
        pathname TEXT,
        is_sales_mode BOOLEAN,
        detected_name TEXT,
        detected_company TEXT,
        detected_industry TEXT,
        detected_pain_points JSONB,
        detected_objections JSONB,
        detected_budget TEXT,
        detected_timeline TEXT,
        messages_count INTEGER,
        situation_type TEXT,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        duration_seconds INTEGER,
        final_outcome TEXT,
        user_rating INTEGER,
        user_feedback TEXT,
        helpful_yn BOOLEAN,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        quick_actions JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ AI Chat tables created or already exist.');

    // 2. Restore Logo for Misrad AI HQ
    console.log('🖼️ Restoring Logo for Misrad AI HQ...');
    const updateResult = await prisma.$executeRawUnsafe(`
      UPDATE organizations 
      SET logo = 'sb://org-logos/misrad-ai-hq/logo.png' 
      WHERE slug = 'misrad-ai-hq' AND (logo IS NULL OR logo = '');
    `);
    console.log('✅ Logo restored for Misrad AI HQ. Rows affected:', updateResult);

    // 3. Verify organizations state
    const orgs = await prisma.$queryRawUnsafe(`
      SELECT name, slug, logo FROM organizations WHERE slug = 'misrad-ai-hq';
    `);
    console.log('📊 Current state for misrad-ai-hq:', JSON.stringify(orgs, null, 2));

  } catch (error) {
    console.error('❌ Critical Error during DB fix:', error.message);
  }
}

main()
  .finally(() => prisma.$disconnect());
