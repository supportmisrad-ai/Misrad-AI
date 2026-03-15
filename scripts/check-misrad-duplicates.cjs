// Detailed check for specific slug duplicates
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Detailed check for misrad-ai-hq duplicates\n');
  
  // Search for misrad-ai-hq
  const misradOrgs = await prisma.organization.findMany({
    where: {
      slug: { contains: 'misrad-ai' }
    },
    orderBy: { created_at: 'asc' }
  });
  
  console.log(`Found ${misradOrgs.length} organizations with 'misrad-ai' in slug:\n`);
  
  for (const org of misradOrgs) {
    console.log('---');
    console.log(`ID:    ${org.id}`);
    console.log(`Name:  ${org.name}`);
    console.log(`Slug:  ${org.slug}`);
    console.log(`Created: ${org.created_at?.toISOString()}`);
    console.log(`Updated: ${org.updated_at?.toISOString()}`);
    console.log(`Owner ID: ${org.owner_id}`);
    console.log(`');
  }
  
  // Also check for exact match
  console.log('\n\n🔍 Exact match for "misrad-ai-hq":');
  const exactMatch = await prisma.organization.findMany({
    where: { slug: 'misrad-ai-hq' }
  });
  
  console.log(`Found ${exactMatch.length} organizations with exact slug "misrad-ai-hq"`);
  exactMatch.forEach(o => {
    console.log(`  - ${o.name} (ID: ${o.id})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
