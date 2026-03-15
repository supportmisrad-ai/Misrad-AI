const fs = require('fs');
const dotenv = require('dotenv');

const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const prodEnv = dotenv.parse(prodContent);
process.env.DATABASE_URL = prodEnv.DIRECT_URL;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('בודק תלויות לטבלאות החסרות...\n');
  
  const deps = {
    'impersonation_audit_logs': ['impersonation_sessions'],
    'partner_link_usage': ['partners']
  };
  
  for (const [table, dependencies] of Object.entries(deps)) {
    console.log(`${table}:`);
    for (const dep of dependencies) {
      const exists = await prisma.$queryRaw`SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${dep}
      ) as e`;
      console.log(`  ${dep}: ${exists[0].e ? '✅ קיים' : '❌ חסר'}`);
    }
    console.log();
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
