import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';
const USER_EMAIL = 'itsikdahan1@gmail.com';
const CLERK_USER_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

async function main() {
  console.log('🔍 Checking permissions for', USER_EMAIL, 'in org', ORG_ID);
  
  // Find organization_user by clerk_user_id (most reliable)
  const orgUserByClerk = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: CLERK_USER_ID },
    select: { id: true, email: true, role: true, organization_id: true, clerk_user_id: true }
  });
  console.log('OrganizationUser by clerk_id:', orgUserByClerk);
  
  if (!orgUserByClerk) {
    console.log('❌ No organization_user found for this Clerk user!');
    console.log('Creating organization_user and linking to demo org...');
    
    const newOrgUser = await prisma.organizationUser.create({
      data: {
        clerk_user_id: CLERK_USER_ID,
        email: USER_EMAIL,
        full_name: 'Itsik Dahan',
        organization_id: ORG_ID,
        role: 'owner',
      }
    });
    console.log('✅ Created OrganizationUser:', newOrgUser.id);
    console.log('   Linked to org:', newOrgUser.organization_id);
  } else if (orgUserByClerk.organization_id !== ORG_ID) {
    console.log('⚠️ User is linked to a DIFFERENT org:', orgUserByClerk.organization_id);
    console.log('Updating to link to demo org...');
    
    const updated = await prisma.organizationUser.update({
      where: { clerk_user_id: CLERK_USER_ID },
      data: { organization_id: ORG_ID }
    });
    console.log('✅ Updated OrganizationUser to demo org');
  } else {
    console.log('✅ User is correctly linked to demo org with role:', orgUserByClerk.role);
  }
  
  // Also check/create Profile
  const profile = await prisma.profile.findFirst({
    where: { 
      clerkUserId: CLERK_USER_ID,
      organizationId: ORG_ID
    }
  });
  
  if (!profile) {
    console.log('\n❌ No Profile found for this user in demo org!');
    console.log('Creating Profile...');
    
    await prisma.profile.create({
      data: {
        organizationId: ORG_ID,
        clerkUserId: CLERK_USER_ID,
        email: USER_EMAIL,
        fullName: 'Itsik Dahan',
        role: 'owner',
      }
    });
    console.log('✅ Created Profile');
  } else {
    console.log('\n✅ Profile exists:', profile.id);
  }
  
  await prisma.$disconnect();
  console.log('\n🎉 Done! Refresh the page to see the data.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
