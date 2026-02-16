const { PrismaClient } = require('@prisma/client');

async function main() {
  const p = new PrismaClient({
    datasources: { db: { url: process.env.DIRECT_URL } }
  });

  try {
    const columns = await p.$queryRawUnsafe(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position"
    );
    console.log('profiles table columns:');
    console.log(JSON.stringify(columns, null, 2));

    // Check organizationUser table too
    const orgUserCols = await p.$queryRawUnsafe(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'organization_users' ORDER BY ordinal_position"
    );
    console.log('\norganization_users table columns:');
    console.log(JSON.stringify(orgUserCols, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
