'use strict';
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const PROD_CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';
const DEV_CLERK_ID  = 'user_36taRKpH1VdyycRdg9POOD0trxH';

async function main() {
  const prisma = new PrismaClient({ log: [] });
  await prisma.$connect();
  console.log('✅  Connected to DEV DB');

  // 1. Update organization_users: PROD clerk_id → DEV clerk_id
  const r1 = await prisma.$executeRawUnsafe(
    `UPDATE organization_users SET clerk_user_id = '${DEV_CLERK_ID}', updated_at = now() WHERE clerk_user_id = '${PROD_CLERK_ID}'`
  );
  console.log(`  organization_users updated: ${r1} row(s)`);

  // 2. Update profiles
  const r2 = await prisma.$executeRawUnsafe(
    `UPDATE profiles SET clerk_user_id = '${DEV_CLERK_ID}', updated_at = now() WHERE clerk_user_id = '${PROD_CLERK_ID}'`
  );
  console.log(`  profiles updated: ${r2} row(s)`);

  // 3. Verify
  const users = await prisma.$queryRawUnsafe(
    `SELECT id, clerk_user_id, email, full_name, organization_id FROM organization_users WHERE clerk_user_id = '${DEV_CLERK_ID}'`
  );
  if (users.length === 0) {
    console.error('❌  No user found with DEV clerk ID!');
    await prisma.$disconnect();
    process.exit(1);
  }
  const u = users[0];
  console.log(`\n✅  User: ${u.full_name} (${u.email})`);
  console.log(`   clerk_user_id: ${u.clerk_user_id}`);
  console.log(`   organization_id: ${u.organization_id}`);

  const orgs = await prisma.$queryRawUnsafe(
    `SELECT name, slug FROM organizations WHERE owner_id = '${u.id}' ORDER BY created_at`
  );
  console.log(`\n✅  Organizations (${orgs.length}):`);
  for (const o of orgs) console.log(`   • ${o.name} (${o.slug})`);

  await prisma.$disconnect();
  console.log('\n═══════════════════════════════════════════════');
  console.log('  Done! Refresh browser and login should work.');
  console.log('═══════════════════════════════════════════════');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
