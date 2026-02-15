require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT organization_id, email, COUNT(*)::int as cnt
      FROM nexus_users
      WHERE organization_id IS NOT NULL AND email IS NOT NULL
      GROUP BY organization_id, email
      HAVING COUNT(*) > 1
    `);
    if (rows.length === 0) {
      console.log('✅ No duplicates in nexus_users(organization_id, email) - safe to add unique constraint');
    } else {
      console.log('❌ Found duplicates:');
      rows.forEach(r => console.log(`  org=${r.organization_id} email=${r.email} count=${r.cnt}`));
    }
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
