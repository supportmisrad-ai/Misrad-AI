const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking ALL organizations for potential visual duplicates ---');
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      owner_id: true,
      created_at: true
    }
  });

  console.log(`Total organizations: ${orgs.length}`);
  
  const seenSlugs = {};
  orgs.forEach(o => {
    const slug = o.slug || 'no-slug';
    if (!seenSlugs[slug]) seenSlugs[slug] = [];
    seenSlugs[slug].push(o);
  });

  console.log('\n--- Slugs Analysis ---');
  Object.entries(seenSlugs).forEach(([slug, list]) => {
    if (list.length > 1) {
      console.log(`[!] DUPLICATE SLUG DETECTED: "${slug}"`);
      list.forEach(org => {
        console.log(`    - Name: "${org.name}", ID: ${org.id}, Created: ${org.created_at}`);
      });
    } else {
      console.log(`[OK] Slug "${slug}" is unique (used by "${list[0].name}")`);
    }
  });

  console.log('\n--- Checking for subtle differences in misrad-ai-hq ---');
  const hqOrgs = orgs.filter(o => o.slug && o.slug.includes('misrad-ai-hq'));
  hqOrgs.forEach(org => {
    const hex = Buffer.from(org.slug).toString('hex');
    console.log(`ID: ${org.id}, Name: "${org.name}", Slug: "${org.slug}", Hex: ${hex}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
