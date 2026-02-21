/**
 * set-superadmin-clerk.js
 * ─────────────────────────────────────────────────────────────────────────────
 * מגדיר publicMetadata.isSuperAdmin = true ב-Clerk עבור המשתמש הראשי.
 * גם מגדיר role = 'super_admin' ב-publicMetadata.
 *
 * הרצה על PROD:
 *   npx.cmd dotenv -e .env.prod_backup -- node scripts/set-superadmin-clerk.js
 *
 * הרצה על DEV:
 *   npx.cmd dotenv -e .env.local -- node scripts/set-superadmin-clerk.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const SUPERADMIN_CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';
const SUPERADMIN_EMAIL    = 'itsikdahan1@gmail.com';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';
if (!CLERK_SECRET_KEY) {
  console.error('❌  CLERK_SECRET_KEY is not set. Load from .env.prod_backup or .env.local.');
  process.exit(1);
}

const env = CLERK_SECRET_KEY.startsWith('sk_live_') ? '🔴 PRODUCTION' : '🟡 DEVELOPMENT';
console.log(`\n🔑  Clerk key: ${CLERK_SECRET_KEY.slice(0, 16)}...  (${env})`);
console.log(`👤  User ID  : ${SUPERADMIN_CLERK_ID}`);
console.log(`📧  Email    : ${SUPERADMIN_EMAIL}\n`);

async function clerkRequest(path, method, body) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* raw text */ }
  return { status: res.status, ok: res.ok, data, text };
}

async function main() {
  // ─── 1. Find user ──────────────────────────────────────────────────────────
  console.log('1️⃣   Looking up user in Clerk...');
  let userId = SUPERADMIN_CLERK_ID;

  const byId = await clerkRequest(`/users/${SUPERADMIN_CLERK_ID}`, 'GET');
  if (!byId.ok) {
    // Try searching by email
    console.log(`   Not found by ID (${byId.status}), searching by email...`);
    const byEmail = await clerkRequest(
      `/users?email_address=${encodeURIComponent(SUPERADMIN_EMAIL)}&limit=1`,
      'GET',
    );
    if (!byEmail.ok || !Array.isArray(byEmail.data) || byEmail.data.length === 0) {
      console.error('❌  User not found in Clerk at all!');
      console.error('    Response:', byEmail.text?.slice(0, 300));
      process.exit(1);
    }
    const found = byEmail.data[0];
    userId = found.id;
    console.log(`   Found by email. Actual Clerk ID: ${userId}`);
  } else {
    const u = byId.data;
    const email = u.email_addresses?.[0]?.email_address || 'N/A';
    console.log(`   ✅  Found: ${u.first_name} ${u.last_name} (${email})`);
    console.log(`   Current publicMetadata: ${JSON.stringify(u.public_metadata || {})}`);
  }

  // ─── 2. Set publicMetadata ─────────────────────────────────────────────────
  console.log('\n2️⃣   Setting publicMetadata.isSuperAdmin = true ...');
  const patchRes = await clerkRequest(`/users/${userId}`, 'PATCH', {
    public_metadata: {
      isSuperAdmin: true,
      role: 'super_admin',
    },
  });

  if (!patchRes.ok) {
    console.error(`❌  PATCH failed (${patchRes.status}):`);
    console.error(patchRes.text?.slice(0, 500));
    process.exit(1);
  }

  const updated = patchRes.data;
  console.log(`   ✅  publicMetadata updated!`);
  console.log(`   New publicMetadata: ${JSON.stringify(updated.public_metadata || {})}`);

  // ─── 3. Verify ────────────────────────────────────────────────────────────
  console.log('\n3️⃣   Verifying...');
  const verifyRes = await clerkRequest(`/users/${userId}`, 'GET');
  if (verifyRes.ok) {
    const meta = verifyRes.data?.public_metadata || {};
    if (meta.isSuperAdmin === true) {
      console.log('   ✅  isSuperAdmin = true — confirmed!');
    } else {
      console.warn('   ⚠️   isSuperAdmin not found in metadata after update.');
      console.warn('   metadata:', JSON.stringify(meta));
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅  Done!');
  console.log('');
  console.log('  Next step: run the DB restore too (if not done yet):');
  console.log('    psql $DIRECT_URL -f scripts/restore-superadmin.sql');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n💥  Fatal:', err.message);
  process.exit(1);
});
