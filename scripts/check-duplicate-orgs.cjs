// Check for duplicate organizations with same slug
// Run: node scripts/check-duplicate-orgs.cjs

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for duplicate organizations...\n');
  
  // Get all organizations
  const orgs = await prisma.organization.findMany({
    select: { id: true, slug: true, name: true, created_at: true },
    orderBy: { created_at: 'asc' }
  });
  
  console.log(`📊 Total organizations: ${orgs.length}\n`);
  
  // Group by slug
  const bySlug = new Map();
  for (const org of orgs) {
    const key = org.slug || `NULL_SLUG_${org.id.substring(0, 8)}`;
    if (!bySlug.has(key)) bySlug.set(key, []);
    bySlug.get(key).push(org);
  }
  
  // Find duplicates
  const duplicates = [];
  for (const [slug, orgList] of bySlug) {
    if (orgList.length > 1) {
      duplicates.push({ slug, orgs: orgList });
    }
  }
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate slugs found!\n');
    console.log('All organizations:');
    for (const org of orgs) {
      console.log(`  - ${org.name} (slug: ${org.slug || 'NULL'}, id: ${org.id.substring(0, 8)}...)`);
    }
    return;
  }
  
  console.log(`❌ Found ${duplicates.length} duplicate slug(s):\n`);
  
  for (const dup of duplicates) {
    console.log(`\n📌 Slug: "${dup.slug}" (${dup.orgs.length} organizations)`);
    for (const org of dup.orgs) {
      console.log(`   - ${org.name} (id: ${org.id}, created: ${org.created_at?.toISOString() || 'N/A'})`);
    }
  }
  
  console.log('\n\n🔧 Recommendation: Keep the first one, delete the rest');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
