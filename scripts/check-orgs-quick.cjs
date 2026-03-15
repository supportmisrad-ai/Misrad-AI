const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgUser = await prisma.organizationUser.findFirst({
    where: { clerk_user_id: { startsWith: 'user_39Uku' } }
  });
  
  if (!orgUser) {
    console.log('User not found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('User ID:', orgUser.id);
  console.log('Primary org_id:', orgUser.organization_id);
  console.log();
  
  const ownedOrgs = await prisma.organization.findMany({
    where: { owner_id: orgUser.id }
  });
  console.log('Owned orgs:', ownedOrgs.length);
  ownedOrgs.forEach(o => console.log(' -', o.name, '(slug:', o.slug + ')'));
  
  console.log();
  const memberships = await prisma.teamMember.findMany({
    where: { user_id: orgUser.id }
  });
  console.log('Team memberships:', memberships.length);
  
  for (const m of memberships) {
    const org = await prisma.organization.findUnique({
      where: { id: m.organization_id }
    });
    console.log(' - Member of:', org?.name, '(slug:', org?.slug + ')');
  }
  
  await prisma.$disconnect();
}

main();
