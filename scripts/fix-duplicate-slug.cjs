#!/usr/bin/env node
/**
 * Fix duplicate slug "misrad-ai-hq" in production database
 * One org should keep the slug, the other needs a new unique slug
 */

const { PrismaClient } = require('@prisma/client');

async function main() {
    console.log('🔍 Checking for duplicate slugs in database...');
    
    const prisma = new PrismaClient();
    
    try {
        // Find all organizations with the duplicate slug
        const orgs = await prisma.organization.findMany({
            where: { slug: 'misrad-ai-hq' },
            select: {
                id: true,
                name: true,
                slug: true,
                created_at: true,
                organization_users: {
                    select: {
                        id: true,
                        role: true
                    }
                }
            }
        });
        
        console.log(`Found ${orgs.length} organizations with slug "misrad-ai-hq":`);
        orgs.forEach((org, i) => {
            console.log(`  ${i + 1}. ID: ${org.id}`);
            console.log(`     Name: ${org.name}`);
            console.log(`     Created: ${org.created_at}`);
            console.log(`     Users: ${org.organization_users.length}`);
            console.log(`     Admins: ${org.organization_users.filter(u => u.role === 'admin').length}`);
        });
        
        if (orgs.length < 2) {
            console.log('✅ No duplicates found - nothing to fix');
            return;
        }
        
        // Determine which org to keep and which to rename
        // Keep the first one (older one), rename the rest
        const [keepOrg, ...duplicates] = orgs.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        console.log(`\n📝 Keeping: ${keepOrg.name} (ID: ${keepOrg.id})`);
        
        for (const dupOrg of duplicates) {
            const newSlug = `misrad-ai-hq-${dupOrg.id.slice(0, 8)}`;
            console.log(`\n🔄 Renaming: ${dupOrg.name} (ID: ${dupOrg.id})`);
            console.log(`   Old slug: ${dupOrg.slug}`);
            console.log(`   New slug: ${newSlug}`);
            
            await prisma.organization.update({
                where: { id: dupOrg.id },
                data: { slug: newSlug }
            });
            
            console.log(`   ✅ Updated successfully`);
        }
        
        console.log('\n🎉 All duplicates fixed!');
        
        // Verify fix
        const remaining = await prisma.organization.findMany({
            where: { slug: 'misrad-ai-hq' }
        });
        console.log(`\n📊 Remaining orgs with slug "misrad-ai-hq": ${remaining.length}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
