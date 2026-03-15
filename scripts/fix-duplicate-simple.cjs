#!/usr/bin/env node
/**
 * Fix duplicate slug - simple version with better error handling
 */

const { PrismaClient } = require('@prisma/client');

async function main() {
    console.log('Starting duplicate slug fix...');
    
    // Check environment
    const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
    if (!dbUrl) {
        console.error('❌ No DATABASE_URL or DIRECT_URL found in environment');
        process.exit(1);
    }
    
    console.log('Database URL found:', dbUrl.substring(0, 30) + '...');
    
    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error']
    });
    
    try {
        console.log('\n🔍 Testing connection...');
        await prisma.$connect();
        console.log('✅ Connected to database');
        
        console.log('\n🔍 Finding organizations with slug "misrad-ai-hq"...');
        const orgs = await prisma.$queryRaw`
            SELECT id, name, slug, created_at
            FROM organizations
            WHERE slug = 'misrad-ai-hq'
        `;
        
        console.log(`Found ${orgs.length} organization(s):`);
        orgs.forEach((org, i) => {
            console.log(`  ${i + 1}. ${org.name} (ID: ${org.id})`);
        });
        
        if (orgs.length < 2) {
            console.log('\n✅ No duplicates to fix');
            return;
        }
        
        // Sort by created_at, keep the oldest
        const sorted = orgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const [keep, ...duplicates] = sorted;
        
        console.log(`\n📝 Keeping: ${keep.name} (oldest)`);
        
        for (const dup of duplicates) {
            const newSlug = `misrad-ai-hq-${dup.id.slice(0, 8)}`;
            console.log(`\n🔄 Updating: ${dup.name}`);
            console.log(`   New slug: ${newSlug}`);
            
            // Use Prisma's typed update instead of raw SQL to avoid UUID casting issues
            await prisma.organization.update({
                where: { id: dup.id },
                data: { slug: newSlug }
            });
            console.log('   ✅ Updated');
        }
        
        console.log('\n🎉 Done!');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
