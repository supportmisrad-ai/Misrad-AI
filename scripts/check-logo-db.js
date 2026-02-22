// Diagnostic script: check if logo is saved in DB
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const orgs = await p.organization.findMany({
    select: { id: true, name: true, logo: true },
    take: 5,
  });
  console.log('=== Organizations with logo status ===');
  for (const org of orgs) {
    console.log(`  ${org.name} (${org.id}): logo=${org.logo ? org.logo.substring(0, 60) + '...' : 'NULL'}`);
  }
  await p.$disconnect();
}

main().catch(function(e) { console.error(e.message); p.$disconnect(); });
