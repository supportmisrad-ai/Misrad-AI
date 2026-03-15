const fs = require('fs');
const dotenv = require('dotenv');

const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const prodEnv = dotenv.parse(prodContent);
process.env.DATABASE_URL = prodEnv.DIRECT_URL;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCriticalTables() {
  console.log('🔍 בודק שדות בטבלאות קריטיות...\n');
  
  const criticalTables = [
    'organizations', 'organization_users', 'nexus_users', 'profiles',
    'nexus_tasks', 'nexus_time_entries', 'client_clients', 
    'billing_invoices', 'socialmedia_posts', 'system_settings'
  ];
  
  let totalIssues = 0;
  
  for (const table of criticalTables) {
    const exists = await prisma.$queryRaw`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ${table}
    ) as e`;
    
    if (!exists[0].e) {
      console.log(`❌ ${table}: טבלה לא קיימת`);
      continue;
    }
    
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}
    `;
    
    console.log(`✅ ${table}: ${columns.length} שדות`);
  }
  
  // Check for specific recent schema changes
  console.log('\n🔍 בודק שדות חדשים ממיגרציות אחרונות...\n');
  
  const checks = [
    { table: 'organizations', field: 'deleted_at', desc: 'soft delete' },
    { table: 'organizations', field: 'tax_id', desc: 'מספר עוסק' },
    { table: 'organizations', field: 'balance', desc: 'יתרה' },
    { table: 'nexus_users', field: 'attendance_pin', desc: 'PIN נוכחות' },
    { table: 'socialmedia_posts', field: 'ai_hashtags', desc: 'AI hashtags' },
  ];
  
  for (const check of checks) {
    try {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${check.table}
          AND column_name = ${check.field}
        ) as e
      `;
      
      if (result[0].e) {
        console.log(`✅ ${check.table}.${check.field}: קיים (${check.desc})`);
      } else {
        console.log(`❌ ${check.table}.${check.field}: חסר! (${check.desc})`);
        totalIssues++;
      }
    } catch(e) {
      console.log(`❌ ${check.table}.${check.field}: שגיאה בבדיקה`);
    }
  }
  
  await prisma.$disconnect();
  
  console.log('\n' + '='.repeat(60));
  if (totalIssues === 0) {
    console.log('✅ כל השדות הקריטיים קיימים!');
  } else {
    console.log(`❌ נמצאו ${totalIssues} שדות חסרים`);
  }
  
  return totalIssues;
}

checkCriticalTables().then(count => process.exit(count > 0 ? 1 : 0));
