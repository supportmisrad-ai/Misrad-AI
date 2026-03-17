const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function checkOrgs() {
  try {
    const orgs = await prisma.organization.findMany({
      select: { id: true, slug: true }
    });
    console.log('Available organizations:', orgs);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrgs();
