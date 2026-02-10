#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvLocalOnly() {
  const fullPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(fullPath)) {
    console.error('[link-owner-clerk-user] .env.local not found; using process.env only.');
    return;
  }
  const parsed = dotenv.parse(fs.readFileSync(fullPath));
  for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
}

function parseDbIdentity(urlValue) {
  try {
    if (!urlValue) return null;
    const u = new URL(String(urlValue));
    const port = u.port ? Number.parseInt(String(u.port), 10) : 5432;
    const database = u.pathname ? String(u.pathname).replace(/^\//, '') : '';
    return {
      host: u.hostname || null,
      port: Number.isFinite(port) ? port : 5432,
      database: database || null,
      user: u.username ? decodeURIComponent(u.username) : null,
    };
  } catch {
    return null;
  }
}

loadEnvLocalOnly();

const dbId = parseDbIdentity(process.env.DATABASE_URL);
if (dbId) {
  console.error(
    `[link-owner-clerk-user] DATABASE_URL -> host=${dbId.host} port=${dbId.port} db=${dbId.database ?? 'unknown'} user=${dbId.user ?? 'unknown'}`
  );
} else {
  console.error('[link-owner-clerk-user] DATABASE_URL -> (missing/invalid)');
}

const OWNER_ID = 'e0117831-48ed-4548-a2ea-ba246a5b6dcc';

function getClerkUserIdArg() {
  const args = process.argv.slice(2).filter((a) => a && !a.startsWith('--'));
  return args[0] ? String(args[0]).trim() : '';
}

const clerkUserId = getClerkUserIdArg();
if (!clerkUserId) {
  console.error('❌ Missing clerkUserId');
  console.error('Usage: node scripts/link-owner-clerk-user.js <clerkUserId>');
  console.error('Tip: after login, open http://localhost:4000/api/debug/whoami to copy clerkUserId');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const owner = await prisma.organizationUser.findUnique({
      where: { id: OWNER_ID },
      select: { id: true, email: true, clerk_user_id: true, role: true },
    });

    if (!owner?.id) {
      console.error(`❌ Owner social_user not found (id=${OWNER_ID}). Run: npm run db:create:my-user`);
      process.exit(1);
    }

    const updated = await prisma.organizationUser.update({
      where: { id: OWNER_ID },
      data: { clerk_user_id: clerkUserId, updated_at: new Date() },
      select: { id: true, email: true, clerk_user_id: true, role: true },
    });

    console.log('✅ Linked owner social_user to Clerk');
    console.log(`   social_user_id: ${updated.id}`);
    console.log(`   email: ${updated.email || 'n/a'}`);
    console.log(`   role: ${updated.role || 'n/a'}`);
    console.log(`   clerk_user_id: ${updated.clerk_user_id || 'n/a'}`);
    console.log('\n👉 Now refresh: http://localhost:4000/workspaces');
  } catch (e) {
    console.error('❌ link-owner-clerk-user failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
