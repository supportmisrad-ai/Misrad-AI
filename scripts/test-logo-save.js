// Diagnostic: test direct Organization.update for logo field
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Find the first org
  const org = await p.organization.findFirst({
    select: { id: true, name: true, logo: true },
  });
  if (!org) { console.log('No organizations found'); return; }

  console.log('BEFORE:', org.name, '| logo:', org.logo);

  // Test direct update
  const testRef = 'sb://attachments/test-logo-ref';
  const updated = await p.organization.update({
    where: { id: org.id },
    data: { logo: testRef, updated_at: new Date() },
    select: { logo: true },
  });
  console.log('AFTER UPDATE:', updated.logo);

  // Verify with a fresh read
  const verify = await p.organization.findUnique({
    where: { id: org.id },
    select: { logo: true },
  });
  console.log('VERIFY READ:', verify.logo);

  // Restore to NULL
  await p.organization.update({
    where: { id: org.id },
    data: { logo: null, updated_at: new Date() },
  });
  console.log('RESTORED to NULL');

  await p.$disconnect();
}

main().catch(function(e) { console.error('ERROR:', e.message); p.$disconnect(); });
