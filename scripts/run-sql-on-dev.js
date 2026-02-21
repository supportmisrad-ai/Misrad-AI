'use strict';
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SQL_FILE = process.argv[2] || path.join(__dirname, 'restore-superadmin.sql');

async function main() {
  const prisma = new PrismaClient({ log: [] });
  await prisma.$connect();
  console.log('✅  Connected to DEV DB');

  const raw = fs.readFileSync(SQL_FILE, 'utf8');

  // Split into individual statements (skip comments and empty lines)
  const statements = raw
    .split(/;\s*\n/)
    .map(s => s.replace(/--[^\n]*/g, '').trim())
    .filter(s => s.length > 0 && !/^SELECT\b/i.test(s)); // skip verification SELECTs

  let ok = 0, skipped = 0;
  for (const stmt of statements) {
    if (!stmt || stmt === 'BEGIN' || stmt === 'COMMIT') { skipped++; continue; }
    try {
      await prisma.$executeRawUnsafe(stmt + ';');
      ok++;
      const preview = stmt.slice(0, 60).replace(/\n/g, ' ');
      console.log(`  ✅  ${preview}…`);
    } catch (e) {
      console.error(`  ❌  ${stmt.slice(0, 80)}…`);
      console.error(`      ${e.message}`);
    }
  }

  console.log(`\n✅  Done: ${ok} statements executed, ${skipped} skipped`);

  // Quick verification
  const rows = await prisma.$queryRaw`
    SELECT 'organization_users' AS tbl, count(*)::text AS cnt
    FROM organization_users WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
    UNION ALL
    SELECT 'organizations', count(*)::text
    FROM organizations WHERE owner_id = (
      SELECT id FROM organization_users WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
    )
  `;
  console.log('\n📊  Verification:');
  for (const r of rows) console.log(`    ${r.tbl}: ${r.cnt}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
