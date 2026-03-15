const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all orgs and show hex dump of slugs
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true }
  });
  
  console.log('All organizations with slug hex analysis:\n');
  for (const org of orgs) {
    const slugHex = org.slug ? Buffer.from(org.slug).toString('hex') : 'NULL';
    const slugLen = org.slug ? org.slug.length : 0;
    console.log(`${org.name}`);
    console.log(`  Slug: "${org.slug}" (length: ${slugLen})`);
    console.log(`  Hex:  ${slugHex.substring(0, 60)}${slugHex.length > 60 ? '...' : ''}`);
    console.log(`  ID:   ${org.id.substring(0, 8)}...`);
    console.log();
  }
  
  // Check for any org that might render as misrad-ai-hq
  const candidates = orgs.filter(o => {
    if (!o.slug) return false;
    // Normalize and check
    const normalized = o.slug.trim().toLowerCase().replace(/\s+/g, '');
    return normalized === 'misrad-ai-hq' || o.slug.includes('misrad-ai-hq');
  });
  
  console.log('\nCandidates matching misrad-ai-hq:');
  candidates.forEach(c => console.log(`  - ${c.name}: "${c.slug}"`));
  
  await prisma.$disconnect();
}

main().catch(console.error);
