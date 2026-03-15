const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check ALL organizationUsers
  const allUsers = await prisma.organizationUser.findMany({
    take: 5,
    orderBy: { created_at: 'desc' }
  });
  
  console.log('Recent organizationUsers:');
  for (const u of allUsers) {
    console.log(` - ${u.id.substring(0,8)}... clerk: ${u.clerk_user_id?.substring(0,12)}... org: ${u.organization_id?.substring(0,8)}`);
  }
  
  // Check if any user has access to multiple orgs with same slug
  const allOrgs = await prisma.organization.findMany();
  
  const slugCounts = {};
  for (const org of allOrgs) {
    if (!slugCounts[org.slug]) slugCounts[org.slug] = [];
    slugCounts[org.slug].push(org);
  }
  
  console.log('\nAll slugs:');
  for (const [slug, orgs] of Object.entries(slugCounts)) {
    if (orgs.length > 1) {
      console.log(` DUPLICATE: ${slug} - ${orgs.length} orgs:`);
      orgs.forEach(o => console.log(`   - ${o.name} (${o.id.substring(0,8)})`));
    } else {
      console.log(` ${slug}: ${orgs[0].name}`);
    }
  }
  
  await prisma.$disconnect();
}

main();
