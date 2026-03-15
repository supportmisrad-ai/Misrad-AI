const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check for organizations with "מרכז" in the name
  const orgsWithCenter = await prisma.organization.findMany({
    where: { name: { contains: 'מרכז' } }
  });
  
  console.log('Organizations with "מרכז" in name:');
  for (const org of orgsWithCenter) {
    console.log('\nName:', org.name);
    console.log('Slug:', org.slug);
    console.log('ID:', org.id);
  }
  
  // Check ALL misrad-ai related
  const allMisrad = await prisma.organization.findMany({
    where: { OR: [
      { slug: { contains: 'misrad' } },
      { name: { contains: 'Misrad' } },
      { name: { contains: 'משרד' } }
    ]}
  });
  
  console.log('\n\nAll Misrad-related organizations:');
  for (const org of allMisrad) {
    console.log(`\n- ${org.name} (slug: ${org.slug}, id: ${org.id.substring(0,8)})`);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
