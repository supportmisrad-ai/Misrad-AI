// Debug: why dashboard shows 14 customers but Clerk has 13
require('dotenv').config({ path: '.env.prod_backup' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DEBUG: 13 vs 14 ===\n');

  // 1. All orgs with their owners
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      owner_id: true,
      subscription_status: true,
      created_at: true,
      owner: {
        select: {
          id: true,
          email: true,
          full_name: true,
          clerk_user_id: true,
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  // 2. Group by owner_id
  const byOwner = new Map();
  for (const org of orgs) {
    const ownerId = org.owner_id;
    if (!byOwner.has(ownerId)) {
      byOwner.set(ownerId, {
        owner: org.owner,
        orgs: [],
      });
    }
    byOwner.get(ownerId).orgs.push(org);
  }

  console.log(`Total orgs: ${orgs.length}`);
  console.log(`Unique owner_ids: ${byOwner.size}`);
  console.log('');

  // 3. List each unique owner and their orgs
  let idx = 1;
  for (const [ownerId, data] of byOwner) {
    const owner = data.owner;
    const orgCount = data.orgs.length;
    console.log(`${idx}. ${owner?.full_name || '(no name)'} <${owner?.email || 'no email'}>`);
    console.log(`   DB id: ${ownerId}`);
    console.log(`   Clerk id: ${owner?.clerk_user_id || 'MISSING!'}`);
    console.log(`   Orgs (${orgCount}):`);
    for (const o of data.orgs) {
      console.log(`     - "${o.name}" [${o.slug || o.id}] status:${o.subscription_status} created:${o.created_at?.toISOString().slice(0, 10)}`);
    }
    idx++;
  }

  // 4. All DB users
  console.log('\n--- All organization_users ---');
  const allUsers = await prisma.organizationUser.findMany({
    select: {
      id: true,
      email: true,
      full_name: true,
      clerk_user_id: true,
      organization_id: true,
    },
    orderBy: { created_at: 'asc' },
  });

  console.log(`Total users in DB: ${allUsers.length}`);
  const usersWithOrg = allUsers.filter(u => u.organization_id);
  const usersWithoutOrg = allUsers.filter(u => !u.organization_id);
  console.log(`With organization_id: ${usersWithOrg.length}`);
  console.log(`Without organization_id: ${usersWithoutOrg.length}`);

  // 5. Check: owners that are NOT in the users table
  const userIdSet = new Set(allUsers.map(u => u.id));
  const missingOwners = [...byOwner.keys()].filter(oid => !userIdSet.has(oid));
  if (missingOwners.length > 0) {
    console.log(`\n⚠ OWNERS NOT IN organization_users TABLE: ${missingOwners.length}`);
    for (const oid of missingOwners) {
      const data = byOwner.get(oid);
      console.log(`  ${data.owner?.full_name || '?'} <${data.owner?.email || '?'}> id:${oid}`);
    }
  }

  // 6. Check: users with same clerk_user_id (duplicates)
  const byClerkId = new Map();
  for (const u of allUsers) {
    if (!u.clerk_user_id) continue;
    if (!byClerkId.has(u.clerk_user_id)) {
      byClerkId.set(u.clerk_user_id, []);
    }
    byClerkId.get(u.clerk_user_id).push(u);
  }
  const dupClerkIds = [...byClerkId.entries()].filter(([, users]) => users.length > 1);
  if (dupClerkIds.length > 0) {
    console.log(`\n⚠ DUPLICATE clerk_user_ids:`);
    for (const [cid, users] of dupClerkIds) {
      console.log(`  clerk:${cid} → ${users.length} DB records`);
      for (const u of users) {
        console.log(`    ${u.full_name} <${u.email}> id:${u.id}`);
      }
    }
  }

  // 7. Check: users with same email (different DB ids)
  const byEmail = new Map();
  for (const u of allUsers) {
    const e = (u.email || '').toLowerCase().trim();
    if (!e) continue;
    if (!byEmail.has(e)) byEmail.set(e, []);
    byEmail.get(e).push(u);
  }
  const dupEmails = [...byEmail.entries()].filter(([, users]) => users.length > 1);
  if (dupEmails.length > 0) {
    console.log(`\n⚠ DUPLICATE emails (different DB ids):`);
    for (const [email, users] of dupEmails) {
      console.log(`  ${email} → ${users.length} records`);
      for (const u of users) {
        console.log(`    ${u.full_name} id:${u.id} clerk:${u.clerk_user_id}`);
      }
    }
  }

  // 8. Business clients count comparison
  const bizActive = await prisma.businessClient.count({ where: { deleted_at: null } });
  console.log(`\n--- Summary ---`);
  console.log(`Unique owners (dashboard "customers"): ${byOwner.size}`);
  console.log(`DB users: ${allUsers.length}`);
  console.log(`Unique clerk_user_ids: ${byClerkId.size}`);
  console.log(`Active business clients: ${bizActive}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
