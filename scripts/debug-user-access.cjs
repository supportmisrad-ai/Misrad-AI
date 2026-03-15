const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking for misrad-ai-hq in Organization table ---');
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { slug: 'misrad-ai-hq' },
        { name: { contains: 'Misrad AI HQ' } }
      ]
    },
    select: { id: true, name: true, slug: true }
  });
  console.log('Organizations found:', JSON.stringify(orgs, null, 2));

  console.log('\n--- Checking organization_users table ---');
  const users = await prisma.organizationUser.findMany({
    select: {
      id: true,
      email: true,
      clerk_user_id: true,
      organization_id: true
    }
  });
  console.log('Organization Users:', JSON.stringify(users, null, 2));

  console.log('\n--- Checking team_members table ---');
  const memberships = await prisma.teamMember.findMany({
    select: {
      id: true,
      user_id: true,
      organization_id: true,
      role: true
    }
  });
  console.log('Team Memberships:', JSON.stringify(memberships, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
