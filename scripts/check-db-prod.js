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
  console.log('🔍 בודק לוגו בארגונים...\n');
  
  try {
    const orgs = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        slug,
        CASE 
          WHEN logo IS NULL THEN '❌ NULL'
          WHEN logo = '' THEN '❌ EMPTY'
          WHEN logo LIKE 'sb://%' THEN '✅ SUPABASE_REF'
          WHEN logo LIKE 'http%' THEN '✅ URL'
          ELSE '⚠️ OTHER'
        END as logo_type,
        LENGTH(logo) as logo_length,
        subscription_status
      FROM organizations
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.table(orgs);
    
    // Check operations tables count
    console.log('\n📊 בודק כמויות בטבלאות אופרציה...\n');
    
    const counts = await prisma.$queryRaw`
      SELECT 
        'operations_work_orders' as table_name,
        COUNT(*)::text as count
      FROM operations_work_orders
      UNION ALL
      SELECT 
        'operations_inventory',
        COUNT(*)::text
      FROM operations_inventory
      UNION ALL
      SELECT 
        'operations_projects',
        COUNT(*)::text
      FROM operations_projects
    `;
    
    console.table(counts);
    
    // Check indexes on operations tables
    console.log('\n🔍 בודק אינדקסים על operations_work_orders...\n');
    
    const indexes = await prisma.$queryRaw`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'operations_work_orders'
    `;
    
    console.table(indexes);
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

main()
  .finally(() => prisma.$disconnect());
