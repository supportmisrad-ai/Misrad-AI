const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';
const USER_EMAIL = 'itsikdahan1@gmail.com';

async function main() {
  console.log('Checking permissions for', USER_EMAIL, 'in org', ORG_ID);
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
    select: { id: true, email: true, clerk_user_id: true }
  });
  console.log('User:', user);
  
  if (!user) {
    console.log('❌ User not found in DB!');
    await prisma.$disconnect();
    return;
  }
  
  // Check org membership
  const orgUser = await prisma.organizationUser.findFirst({
    where: { 
      organization_id: ORG_ID,
      user_id: user.id
    },
    select: { id: true, email: true, role: true, clerk_user_id: true }
  });
  console.log('OrganizationUser:', orgUser);
  
  if (!orgUser) {
    console.log('❌ User is NOT a member of the demo organization!');
    console.log('Creating membership...');
    
    const newOrgUser = await prisma.organizationUser.create({
      data: {
        organization_id: ORG_ID,
        user_id: user.id,
        email: USER_EMAIL,
        clerk_user_id: user.clerk_user_id,
        role: 'owner',
      }
    });
    console.log('✅ Created OrganizationUser:', newOrgUser.id);
  } else {
    console.log('✅ User is already a member with role:', orgUser.role);
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
