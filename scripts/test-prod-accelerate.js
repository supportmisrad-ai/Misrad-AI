const { PrismaClient } = require('@prisma/client');
const { withAccelerate } = require('@prisma/extension-accelerate');

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  console.log('DATABASE_URL prefix:', dbUrl.substring(0, 40));
  
  const isAccelerate = dbUrl.startsWith('prisma://') || dbUrl.startsWith('prisma+postgres://');
  console.log('Is Accelerate URL:', isAccelerate);

  if (!isAccelerate) {
    console.log('Not an Accelerate URL — skipping Accelerate test.');
    console.log('Full URL starts with:', dbUrl.substring(0, 15));
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

  try {
    // Test 1: landing_testimonials
    console.log('\n--- Test: landing_testimonials ---');
    const rows = await p.landing_testimonials.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
      take: 1,
    });
    console.log('OK:', JSON.stringify(rows));
  } catch (e) {
    console.error('FAIL landing_testimonials:', e.message);
    console.error('Name:', e.name);
    console.error('Code:', e.code);
    if (e.meta) console.error('Meta:', JSON.stringify(e.meta));
  }

  try {
    // Test 2: core_system_settings
    console.log('\n--- Test: coreSystemSettings ---');
    const row = await p.coreSystemSettings.findFirst({ select: { key: true } });
    console.log('OK:', JSON.stringify(row));
  } catch (e) {
    console.error('FAIL coreSystemSettings:', e.message);
    console.error('Code:', e.code);
  }

  try {
    // Test 3: organizations
    console.log('\n--- Test: social_organizations ---');
    const count = await p.social_organizations.count();
    console.log('OK: count =', count);
  } catch (e) {
    console.error('FAIL social_organizations:', e.message);
    console.error('Code:', e.code);
  }

  try {
    // Test 4: profiles
    console.log('\n--- Test: profiles ---');
    const count = await p.profile.count();
    console.log('OK: count =', count);
  } catch (e) {
    console.error('FAIL profiles:', e.message);
    console.error('Code:', e.code);
  }

  await base.$disconnect();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
