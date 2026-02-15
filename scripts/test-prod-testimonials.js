const { PrismaClient } = require('@prisma/client');

async function main() {
  const p = new PrismaClient({
    datasources: { db: { url: process.env.DIRECT_URL } }
  });

  try {
    // Test 1: basic query
    const rows = await p.landing_testimonials.findMany({
      where: { is_active: true },
      select: { id: true, name: true, video_url: true, cover_image_url: true }
    });
    console.log('landing_testimonials OK:', JSON.stringify(rows, null, 2));

    // Test 2: profiles
    const profileCount = await p.profile.count();
    console.log('profiles count:', profileCount);

    // Test 3: core_system_settings
    const settings = await p.coreSystemSettings.findFirst({ select: { key: true } });
    console.log('core_system_settings:', settings);

    // Test 4: organizations
    const orgCount = await p.social_organizations.count();
    console.log('organizations count:', orgCount);
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('Code:', e.code);
  } finally {
    await p.$disconnect();
  }
}

main();
