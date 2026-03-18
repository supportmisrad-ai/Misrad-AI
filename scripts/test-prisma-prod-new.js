require('dotenv').config({ path: '.env.prod_backup' });

const { PrismaClient } = require('@prisma/client');

async function testPrismaProd() {
  const databaseUrl = process.env.DIRECT_URL;
  
  if (!databaseUrl) {
    console.log('❌ DIRECT_URL not found!');
    return;
  }
  
  console.log('Testing Prisma connection to PROD...');
  console.log('URL protocol:', databaseUrl.split(':')[0]);
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl }
    }
  });
  
  try {
    console.log('\n1. Testing connection...');
    await prisma.$connect();
    console.log('   ✅ Connected!');
    
    console.log('\n2. Testing bot_leads_extended count...');
    const count = await prisma.botLeadExtended.count();
    console.log(`   ✅ Count: ${count}`);
    
    console.log('\n3. Testing findMany with conversations count...');
    const leads = await prisma.botLeadExtended.findMany({
      take: 1,
      include: {
        _count: { select: { conversations: true } }
      }
    });
    console.log(`   ✅ Success! Found ${leads.length} leads`);
    if (leads.length > 0) {
      console.log('   Sample:', JSON.stringify(leads[0], null, 2));
    }
    
    console.log('\n✅ ALL TESTS PASSED - Prisma works fine!');
    
  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    if (error.code) console.log('   Code:', error.code);
    if (error.meta) console.log('   Meta:', error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaProd().catch(console.error);
