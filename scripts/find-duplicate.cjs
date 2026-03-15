const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking for misrad-ai-hq duplicates...\n');
  
  const orgs = await prisma.organization.findMany({
    where: { slug: 'misrad-ai-hq' }
  });
  
  console.log(`Found ${orgs.length} organizations with slug 'misrad-ai-hq':\n`);
  
  for (const org of orgs) {
    console.log('ID:', org.id);
    console.log('Name:', org.name);
    console.log('Slug:', org.slug);
    console.log('Created:', org.created_at?.toISOString());
    console.log('Owner ID:', org.owner_id);
    console.log('---');
  }
  
  if (orgs.length > 1) {
    console.log('\n⚠️  DUPLICATE FOUND! Same slug used by multiple organizations.');
    console.log('\nRecommendation: Delete the duplicate(s), keeping the oldest one.');
    console.log('To fix: Identify which one is the "real" org and delete the other.');
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
