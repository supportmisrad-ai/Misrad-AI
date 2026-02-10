#!/usr/bin/env node
/**
 * Check data integrity after table rename migration
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath, override) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return;
  require('dotenv').config({ path: fullPath, override: Boolean(override) });
}

loadEnvFile('.env', false);
loadEnvFile('.env.local', true);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 בודק שלמות נתונים לאחר מיגרציה...\n');
  
  try {
    // Check organizations (no rename in DB, already was "organizations")
    const orgCount = await prisma.social_organizations.count();
    console.log(`✅ Organizations: ${orgCount} רשומות`);
    
    // Check organization_users (was social_users)
    const userCount = await prisma.organizationUser.count();
    console.log(`✅ Organization Users: ${userCount} רשומות`);
    
    // Check profiles
    const profileCount = await prisma.profile.count();
    console.log(`✅ Profiles: ${profileCount} רשומות`);
    
    // Verify relationships
    console.log('\n🔗 בודק קשרים (Foreign Keys)...');
    const orgsWithOwners = await prisma.social_organizations.findMany({
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            full_name: true,
          }
        }
      },
      take: 5,
    });
    
    console.log(`✅ ${orgsWithOwners.length} ארגונים עם בעלים (דוגמה)`);
    orgsWithOwners.forEach(org => {
      console.log(`   - ${org.name}: ${org.owner?.full_name || org.owner?.email || 'N/A'}`);
    });
    
    console.log('\n✨ בדיקת שלמות נתונים הושלמה בהצלחה!');
    
  } catch (error) {
    console.error('\n❌ שגיאה בבדיקת שלמות:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
