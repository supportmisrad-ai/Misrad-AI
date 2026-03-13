const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🔍 בודק לוגו בארגונים...\n');
  
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
    FROM organization
    ORDER BY created_at DESC
    LIMIT 10
  `;
  
  console.table(orgs);
  
  // Check operations tables count
  console.log('\n📊 בודק כמויות בטבלאות אופרציה...\n');
  
  const counts = await prisma.$queryRaw`
    SELECT 
      'operations_work_orders' as table_name,
      COUNT(*) as count
    FROM operations_work_orders
    UNION ALL
    SELECT 
      'operations_inventory',
      COUNT(*)
    FROM operations_inventory
    UNION ALL
    SELECT 
      'operations_projects',
      COUNT(*)
    FROM operations_projects
  `;
  
  console.table(counts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
