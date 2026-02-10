#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking current users in social_users...\n');
    
    const users = await prisma.organizationUser.findMany({
      select: {
        id: true,
        email: true,
        full_name: true,
        clerk_user_id: true,
        role: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    if (users.length === 0) {
      console.log('❌ No users found in social_users table!');
      console.log('\n💡 Solution: Login to the app first, then run the script again.');
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} user(s):\n`);
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email || 'No email'}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Role: ${u.role || 'N/A'}`);
      console.log(`   Created: ${u.created_at}\n`);
    });

    console.log('📝 Use the ID from above to update create-demo-organizations.sql');
    console.log(`   Replace: 'e0117831-48ed-4548-a2ea-ba246a5b6dcc'`);
    console.log(`   With:    '${users[0].id}'\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
