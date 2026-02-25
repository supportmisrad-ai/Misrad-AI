// Find missing users: list all DB users + orgs, and optionally compare with Clerk
// Usage:
//   node scripts/_find-missing-users.cjs                    (DB only)
//   CLERK_SECRET_KEY=sk_live_xxx node scripts/_find-missing-users.cjs  (with Clerk comparison)
require('dotenv').config({ path: '.env.prod_backup' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchClerkUsers(secretKey) {
  const allUsers = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}&order_by=-created_at`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Clerk API error ${res.status}: ${text}`);
    }

    const users = await res.json();
    if (!Array.isArray(users) || users.length === 0) break;

    allUsers.push(...users);
    if (users.length < limit) break;
    offset += limit;
  }

  return allUsers;
}

async function main() {
  console.log('=== FIND MISSING USERS ===\n');

  // 1. All DB users
  const dbUsers = await prisma.organizationUser.findMany({
    select: {
      id: true,
      clerk_user_id: true,
      email: true,
      full_name: true,
      organization_id: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });

  console.log(`DB users (organization_users): ${dbUsers.length}`);
  console.log('');

  // 2. All DB organizations with owner details
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      owner_id: true,
      subscription_status: true,
      created_at: true,
      owner: { select: { email: true, full_name: true, clerk_user_id: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  console.log(`DB organizations: ${orgs.length}`);
  const uniqueOwners = new Set(orgs.map(o => o.owner_id));
  console.log(`Unique org owners: ${uniqueOwners.size}`);
  console.log('');

  // 3. List all DB users with their org status
  console.log('--- All DB users ---');
  for (const u of dbUsers) {
    const hasOrg = u.organization_id ? '✓' : '✗';
    console.log(`  ${hasOrg} ${u.full_name || '(no name)'} <${u.email || 'no email'}> clerk:${u.clerk_user_id || '?'}`);
    if (!u.organization_id) console.log(`    ⚠ NO ORGANIZATION`);
  }
  console.log('');

  // 4. List all organizations
  console.log('--- All organizations ---');
  for (const o of orgs) {
    console.log(`  ${o.name || '(no name)'} [${o.slug || o.id}] status:${o.subscription_status}`);
    console.log(`    owner: ${o.owner?.full_name || '?'} <${o.owner?.email || '?'}>`);
  }
  console.log('');

  // 5. Clerk comparison (if key available)
  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (clerkKey && clerkKey.startsWith('sk_live')) {
    console.log('--- Comparing with Clerk (production) ---');
    try {
      const clerkUsers = await fetchClerkUsers(clerkKey);
      console.log(`Clerk users: ${clerkUsers.length}`);

      const dbClerkIds = new Set(dbUsers.map(u => u.clerk_user_id).filter(Boolean));

      const missingInDb = clerkUsers.filter(cu => !dbClerkIds.has(cu.id));
      console.log(`Missing in DB (exist in Clerk but not in organization_users): ${missingInDb.length}`);

      if (missingInDb.length > 0) {
        console.log('');
        console.log('--- MISSING USERS (in Clerk, not in DB) ---');
        for (const cu of missingInDb) {
          const email = cu.email_addresses?.[0]?.email_address || 'no email';
          const name = [cu.first_name, cu.last_name].filter(Boolean).join(' ') || '(no name)';
          const created = cu.created_at ? new Date(cu.created_at).toISOString() : '?';
          console.log(`  ${name} <${email}> clerk:${cu.id} created:${created}`);
        }
      }
    } catch (err) {
      console.log(`  Clerk API error: ${err.message}`);
    }
  } else if (clerkKey && clerkKey.startsWith('sk_test')) {
    console.log('⚠ Clerk key is sk_test_ (test environment) — skipping Clerk comparison');
    console.log('  To compare with production Clerk, run:');
    console.log('  CLERK_SECRET_KEY=sk_live_xxx node scripts/_find-missing-users.cjs');
  } else {
    console.log('ℹ No CLERK_SECRET_KEY found — skipping Clerk comparison');
    console.log('  To compare with Clerk, run:');
    console.log('  CLERK_SECRET_KEY=sk_live_xxx node scripts/_find-missing-users.cjs');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
