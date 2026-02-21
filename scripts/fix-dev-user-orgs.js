'use strict';
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const PROD_CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';
const DEV_CLERK_ID  = 'user_36taRKpH1VdyycRdg9POOD0trxH';

async function main() {
  const prisma = new PrismaClient({ log: [] });
  await prisma.$connect();
  console.log('✅  Connected to DEV DB\n');

  // 0. Get schema columns for organization_users
  const cols = await prisma.$queryRawUnsafe(
    "SELECT column_name FROM information_schema.columns WHERE table_name='organization_users' ORDER BY ordinal_position"
  );
  const colNames = cols.map(c => c.column_name);
  console.log('📋  organization_users columns:', colNames.join(', '));

  // 1. Find both user records
  const allUsers = await prisma.$queryRawUnsafe(
    "SELECT id, clerk_user_id, email, full_name, organization_id FROM organization_users WHERE clerk_user_id IN ('" + PROD_CLERK_ID + "', '" + DEV_CLERK_ID + "') ORDER BY created_at"
  );
  console.log('\n📋  Users in DB:');
  for (const u of allUsers) {
    const tag = u.clerk_user_id === DEV_CLERK_ID ? '🟢 DEV' : '🔴 PROD';
    console.log('   ' + tag + ' | ' + u.full_name + ' | ' + u.email + ' | org=' + u.organization_id);
  }

  const devUser = allUsers.find(u => u.clerk_user_id === DEV_CLERK_ID);
  const prodUser = allUsers.find(u => u.clerk_user_id === PROD_CLERK_ID);

  if (!devUser) {
    console.error('❌  DEV user not found!');
    process.exit(1);
  }

  console.log('\n🔧  DEV user id: ' + devUser.id);

  // 2. Handle PROD ghost user — transfer orgs to DEV user
  if (prodUser) {
    const prodOrgs = await prisma.$queryRawUnsafe(
      "SELECT id, name, slug FROM organizations WHERE owner_id = '" + prodUser.id + "'"
    );
    console.log('\n📦  Orgs owned by PROD user (' + prodOrgs.length + '):');
    for (const o of prodOrgs) console.log('   • ' + o.name + ' (' + o.slug + ')');

    // Transfer org ownership to DEV user
    if (prodOrgs.length > 0) {
      const r = await prisma.$executeRawUnsafe(
        "UPDATE organizations SET owner_id = '" + devUser.id + "' WHERE owner_id = '" + prodUser.id + "'"
      );
      console.log('   ✅  Transferred ' + r + ' org(s) to DEV user');
    }

    // Transfer profiles
    const r2 = await prisma.$executeRawUnsafe(
      "UPDATE profiles SET clerk_user_id = '" + DEV_CLERK_ID + "' WHERE clerk_user_id = '" + PROD_CLERK_ID + "'"
    );
    console.log('   ✅  Profiles re-linked: ' + r2);

    // Set the DEV user's organization_id to the HQ org
    const hqOrg = prodOrgs.find(o => o.slug === 'misrad-ai-hq') || prodOrgs[0];
    if (hqOrg) {
      await prisma.$executeRawUnsafe(
        "UPDATE organization_users SET organization_id = '" + hqOrg.id + "' WHERE id = '" + devUser.id + "'"
      );
      console.log('   ✅  DEV user linked to org: ' + hqOrg.name + ' (' + hqOrg.slug + ')');
    }

    // Delete PROD user record (ghost in DEV)
    await prisma.$executeRawUnsafe(
      "DELETE FROM organization_users WHERE clerk_user_id = '" + PROD_CLERK_ID + "'"
    );
    console.log('   🗑️  Removed ghost PROD user record');
  } else {
    console.log('\n⚠️  No PROD ghost user found');
  }

  // 3. Ensure DEV user has an org assigned
  const devUserFresh = await prisma.$queryRawUnsafe(
    "SELECT id, clerk_user_id, email, full_name, organization_id FROM organization_users WHERE clerk_user_id = '" + DEV_CLERK_ID + "'"
  );
  const u = devUserFresh[0];
  if (!u.organization_id) {
    // Find any org owned by this user
    const anyOrg = await prisma.$queryRawUnsafe(
      "SELECT id, name, slug FROM organizations WHERE owner_id = '" + u.id + "' LIMIT 1"
    );
    if (anyOrg.length > 0) {
      await prisma.$executeRawUnsafe(
        "UPDATE organization_users SET organization_id = '" + anyOrg[0].id + "' WHERE id = '" + u.id + "'"
      );
      console.log('   ✅  Assigned org: ' + anyOrg[0].slug);
    }
  }

  // 4. Final verification
  const devOrgs = await prisma.$queryRawUnsafe(
    "SELECT id, name, slug FROM organizations WHERE owner_id = '" + u.id + "' ORDER BY created_at"
  );
  console.log('\n✅  Final state — DEV user owns ' + devOrgs.length + ' org(s):');
  for (const o of devOrgs) console.log('   • ' + o.name + ' (' + o.slug + ')');

  const finalUser = await prisma.$queryRawUnsafe(
    "SELECT id, clerk_user_id, email, full_name, organization_id FROM organization_users WHERE clerk_user_id = '" + DEV_CLERK_ID + "'"
  );
  if (finalUser.length > 0) {
    const fu = finalUser[0];
    console.log('\n✅  DEV user: ' + fu.full_name + ' (' + fu.email + ')');
    console.log('   clerk_id: ' + fu.clerk_user_id);
    console.log('   org_id: ' + fu.organization_id);
  }

  await prisma.$disconnect();
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅  DEV DB fixed! Refresh browser and try again.');
  console.log('═══════════════════════════════════════════════════');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
