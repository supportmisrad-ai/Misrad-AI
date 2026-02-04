#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const targetId = 'e0117831-48ed-4548-a2ea-ba246a5b6dcc';
    
    console.log(`🔍 Checking if user with ID exists: ${targetId}\n`);
    
    const user = await prisma.social_users.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        email: true,
        full_name: true,
        clerk_user_id: true,
        role: true,
        created_at: true,
      },
    });

    if (!user) {
      console.log('❌ User with this ID does NOT exist in database');
      console.log('\n✅ Good news: You can create it with:');
      console.log('   npm run db:create:my-user\n');
      process.exit(0);
    }

    console.log('✅ User EXISTS in database!\n');
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.full_name || 'N/A'}`);
    console.log(`Role: ${user.role || 'N/A'}`);
    console.log(`ID: ${user.id}`);
    console.log(`Clerk ID: ${user.clerk_user_id || 'N/A'}`);
    console.log(`Created: ${user.created_at}\n`);

    if (user.email?.toLowerCase().includes('itsikdahan1')) {
      console.log('✅ This is YOUR user! You can run:');
      console.log('   npm run db:create:demos\n');
    } else {
      console.log('⚠️  This user exists but email is different from itsikdahan1@gmail.com');
      console.log('   You might want to use a different ID or create your user first.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
