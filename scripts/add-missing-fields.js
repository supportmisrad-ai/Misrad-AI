const fs = require('fs');
const dotenv = require('dotenv');

const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const prodEnv = dotenv.parse(prodContent);
process.env.DATABASE_URL = prodEnv.DIRECT_URL;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingFields() {
  console.log('🔧 מוסיף שדות חסרים ל-PROD DB...\n');
  
  const changes = [
    {
      table: 'nexus_users',
      field: 'attendance_pin',
      sql: `ALTER TABLE "nexus_users" ADD COLUMN IF NOT EXISTS "attendance_pin" VARCHAR(10)`,
      desc: 'PIN לניהול נוכחות'
    },
    {
      table: 'socialmedia_posts',
      field: 'ai_hashtags',
      sql: `ALTER TABLE "socialmedia_posts" ADD COLUMN IF NOT EXISTS "ai_hashtags" TEXT[]`,
      desc: 'AI generated hashtags'
    }
  ];
  
  let added = 0;
  
  for (const change of changes) {
    try {
      // Check if field already exists
      const exists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${change.table}
          AND column_name = ${change.field}
        ) as e
      `;
      
      if (exists[0].e) {
        console.log(`✅ ${change.table}.${change.field}: כבר קיים`);
        continue;
      }
      
      // Add field
      await prisma.$executeRawUnsafe(change.sql);
      console.log(`✅ ${change.table}.${change.field}: נוסף (${change.desc})`);
      added++;
      
    } catch(e) {
      console.log(`❌ ${change.table}.${change.field}: שגיאה - ${e.message.substring(0, 60)}`);
    }
  }
  
  await prisma.$disconnect();
  
  console.log('\n' + '='.repeat(60));
  if (added === 0) {
    console.log('✅ כל השדות כבר קיימים!');
  } else {
    console.log(`✅ נוספו ${added} שדות חדשים`);
  }
}

addMissingFields().catch(e => {
  console.error('שגיאה:', e);
  process.exit(1);
});
