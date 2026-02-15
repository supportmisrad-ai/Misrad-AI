const { PrismaClient } = require('@prisma/client');
const { withAccelerate } = require('@prisma/extension-accelerate');

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  console.log('DATABASE_URL prefix:', dbUrl.substring(0, 50));
  
  const isAccelerate = dbUrl.startsWith('prisma://') || dbUrl.startsWith('prisma+postgres://');
  console.log('Is Accelerate URL:', isAccelerate);

  if (!isAccelerate) {
    console.log('Not an Accelerate URL — using direct connection');
    const p = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });
    await testWithClient(p, 'DIRECT');
    await p.$disconnect();
    return;
  }

  // Normalize prisma+postgres:// to prisma://
  const normalizedUrl = dbUrl.startsWith('prisma+postgres://')
    ? dbUrl.replace('prisma+postgres://', 'prisma://')
    : dbUrl;

  const base = new PrismaClient({
    datasources: { db: { url: normalizedUrl } },
  });
  const p = base.$extends(withAccelerate());

  await testWithClient(p, 'ACCELERATE');
  await base.$disconnect();
}

async function testWithClient(p, type) {
  console.log(`\n=== Testing with ${type} connection ===`);

  try {
    // Test 1: landing_testimonials
    console.log('\n--- Test: landing_testimonials ---');
    const rows = await p.landing_testimonials.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
      take: 3,
    });
    console.log('✅ OK:', rows.length, 'rows');
    rows.forEach(r => console.log(`  - ${r.name}`));
  } catch (e) {
    console.error('❌ FAIL landing_testimonials:', e.message);
    console.error('Code:', e.code);
  }

  try {
    // Test 2: core_system_settings
    console.log('\n--- Test: core_system_settings ---');
    const row = await p.coreSystemSettings.findFirst({ select: { key: true } });
    console.log('✅ OK:', row ? `key=${row.key}` : 'empty');
  } catch (e) {
    console.error('❌ FAIL core_system_settings:', e.message);
    console.error('Code:', e.code);
  }

  try {
    // Test 3: organizations
    console.log('\n--- Test: organizations ---');
    const count = await p.social_organizations.count();
    console.log('✅ OK: count =', count);
  } catch (e) {
    console.error('❌ FAIL organizations:', e.message);
    console.error('Code:', e.code);
  }

  try {
    // Test 4: profiles
    console.log('\n--- Test: profiles ---');
    const count = await p.profile.count();
    console.log('✅ OK: count =', count);
  } catch (e) {
    console.error('❌ FAIL profiles:', e.message);
    console.error('Code:', e.code);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
