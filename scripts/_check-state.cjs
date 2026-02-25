require('dotenv').config({ path: '.env.prod_backup' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const unlinked = await p.organization.count({ where: { client_id: null } });
  const active = await p.businessClient.count({ where: { deleted_at: null } });
  const deleted = await p.businessClient.count({ where: { deleted_at: { not: null } } });
  const total = await p.organization.count();

  console.log(`Orgs total: ${total}`);
  console.log(`Orgs unlinked (client_id=null): ${unlinked}`);
  console.log(`Biz clients active: ${active}`);
  console.log(`Biz clients deleted: ${deleted}`);

  if (unlinked > 0) {
    const orgs = await p.organization.findMany({
      where: { client_id: null },
      select: { id: true, name: true, owner: { select: { email: true, full_name: true } } },
    });
    console.log('\nUnlinked orgs:');
    for (const o of orgs) {
      console.log(`  ${o.name} - owner: ${o.owner?.full_name || '?'} <${o.owner?.email || '?'}>`);
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
