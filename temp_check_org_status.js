const { PrismaClient } = require('@prisma/client');

// Load prod environment
require('dotenv').config({ path: '.env.prod_backup' });

const prisma = new PrismaClient();

async function checkOrgStatus() {
  try {
    console.log('=== Checking Organization Status in PROD ===');
    
    // First, let's see all organization users to find your user
    console.log('\n=== All Organization Users in PROD ===');
    const allOrgUsers = await prisma.organizationUser.findMany({
      select: {
        id: true,
        clerk_user_id: true,
        role: true,
        Organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            subscription_status: true,
            balance: true,
            deleted_at: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    
    if (allOrgUsers.length === 0) {
      console.log('❌ No organization users found at all in PROD');
      return;
    }
    
    allOrgUsers.forEach(orgUser => {
      console.log(`  User: ${orgUser.clerk_user_id}`);
      console.log(`    Role: ${orgUser.role}`);
      console.log(`    Organization: ${orgUser.Organization.name} (${orgUser.Organization.slug})`);
      console.log(`    Status: ${orgUser.Organization.subscription_status}`);
      console.log(`    Balance: ${orgUser.Organization.balance}`);
      console.log('');
    });
    
    // Check all organizations
    console.log('\n=== All Organizations in PROD ===');
    const allOrgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        subscription_status: true,
        balance: true,
        deleted_at: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });
    
    allOrgs.forEach(org => {
      console.log(`  ${org.name} (${org.slug})`);
      console.log(`    Status: ${org.subscription_status}`);
      console.log(`    Balance: ${org.balance}`);
      console.log(`    Deleted: ${org.deleted_at ? 'Yes' : 'No'}`);
      console.log(`    Created: ${org.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrgStatus();
