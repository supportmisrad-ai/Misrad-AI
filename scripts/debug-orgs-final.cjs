const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Organizations List ---');
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true
    }
  });
  console.log(JSON.stringify(orgs, null, 2));

  console.log('\n--- Duplicate Check ---');
  const slugMap = {};
  orgs.forEach(o => {
    if (o.slug) {
      if (!slugMap[o.slug]) slugMap[o.slug] = [];
      slugMap[o.slug].push(o.name + ' (' + o.id + ')');
    }
  });

  Object.entries(slugMap).forEach(([slug, names]) => {
    if (names.length > 1) {
      console.log(`DUPLICATE SLUG: "${slug}" used by:`, names);
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
