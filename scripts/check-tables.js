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
  console.log('🔍 בודק טבלאות קיימות...\n');
  
  try {
    // List all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name LIKE '%org%' OR table_name LIKE '%tenant%'
      ORDER BY table_name
    `;
    
    console.log('טבלאות עם org/tenant:');
    console.table(tables);
    
    // Try organizations
    console.log('\n🔍 מנסה organizations...');
    const orgs = await prisma.$queryRaw`
      SELECT COUNT(*)::text as count FROM organizations
    `;
    console.log('נמצאו', orgs[0].count, 'ארגונים');
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

main()
  .finally(() => prisma.$disconnect());
