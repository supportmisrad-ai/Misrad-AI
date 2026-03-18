import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function main() {
  console.log('🔍 בדיקת owner ארגון\n');
  
  const org = await prisma.organization.findUnique({
    where: { id: ORG_ID },
    select: {
      id: true,
      name: true,
      owner_id: true
    }
  });
  
  if (!org) {
    console.log('❌ ארגון לא נמצא');
    await prisma.$disconnect();
    return;
  }
  
  // Fetch owner profile separately
  const owner = await prisma.profile.findFirst({
    where: { 
      organizationId: org.id,
      clerkUserId: org.owner_id 
    },
    select: {
      id: true,
      email: true,
      avatarUrl: true,
      fullName: true
    }
  });
  
  console.log(`📊 ארגון: ${org.name}`);
  console.log(`👤 Owner:`);
  if (owner) {
    console.log(`   ID: ${owner.id}`);
    console.log(`   שם: ${owner.fullName || 'לא צוין'}`);
    console.log(`   Email: ${owner.email}`);
    console.log(`   Avatar: ${owner.avatarUrl || 'אין'}`);
  } else {
    console.log(`   לא נמצא פרופיל owner (owner_id: ${org.owner_id})`);
  }
  
  // Check for organization users
  const orgUsers = await prisma.organizationUser.findMany({
    where: { organization_id: ORG_ID },
    select: {
      id: true,
      clerk_user_id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      created_at: true
    }
  });
  
  console.log(`\n👥 Organization Users (${orgUsers.length}):`);
  orgUsers.forEach((orgUser, index) => {
    console.log(`   ${index + 1}. ${orgUser.full_name || 'לא צוין'} (${orgUser.email || 'לא צוין'})`);
  });
  
  await prisma.$disconnect();
}

main();
