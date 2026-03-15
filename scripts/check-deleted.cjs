const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check ALL organizations including deleted
  const allOrgs = await prisma.organization.findMany({
    include: { owner: true }
  });
  
  console.log('All organizations (', allOrgs.length, '):\n');
  
  for (const org of allOrgs) {
    const hasDeletedAt = org.deleted_at !== null;
    console.log(`${hasDeletedAt ? '[DELETED] ' : ''}${org.name}`);
    console.log(`  ID: ${org.id}`);
    console.log(`  Slug: "${org.slug}"`);
    console.log(`  Slug length: ${org.slug?.length}`);
    console.log(`  Slug chars: ${[...org.slug || ''].map(c => c.charCodeAt(0)).join(',')}`);
    console.log(`  Owner: ${org.owner?.id?.substring(0,8) || 'N/A'}`);
    console.log(`  Created: ${org.created_at?.toISOString()}`);
    if (org.deleted_at) {
      console.log(`  Deleted: ${org.deleted_at.toISOString()}`);
    }
    console.log();
  }
  
  // Check specifically for misrad-ai-hq variations
  const misradVariants = allOrgs.filter(o => 
    o.slug?.toLowerCase().includes('misrad') ||
    o.name?.toLowerCase().includes('misrad') ||
    o.name?.includes('מרכז')
  );
  
  console.log('\n\nMisrad/Merkez variants:');
  misradVariants.forEach(o => {
    console.log(`- ${o.name} (slug: "${o.slug}", deleted: ${o.deleted_at ? 'YES' : 'NO'})`);
  });
  
  await prisma.$disconnect();
}

main();
