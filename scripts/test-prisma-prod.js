const { PrismaClient } = require('@prisma/client');

async function testPrismaProd() {
  // Read from environment
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('❌ No DATABASE_URL or DIRECT_URL found!');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('URL') || k.includes('DB')));
    return;
  }
  
  console.log('Testing Prisma connection to PROD...');
  console.log('URL protocol:', databaseUrl.split(':')[0]);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
  
  try {
    console.log('\n1. Testing connection...');
    await prisma.$connect();
    console.log('   ✅ Connected!');
    
    console.log('\n2. Testing bot_leads_extended count...');
    const count = await prisma.botLeadExtended.count();
    console.log(`   ✅ Count: ${count}`);
    
    console.log('\n3. Testing findMany...');
    const leads = await prisma.botLeadExtended.findMany({
      take: 1,
      select: { id: true, phone: true, name: true }
    });
    console.log(`   ✅ Found ${leads.length} leads`);
    if (leads.length > 0) {
      console.log('   Sample:', leads[0]);
    }
    
    console.log('\n4. Testing with _count...');
    const withCount = await prisma.botLeadExtended.findMany({
      take: 1,
      include: {
        _count: { select: { conversations: true } }
      }
    });
    console.log(`   ✅ With count works!`);
    
  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    console.log('Code:', error.code);
    console.log('Meta:', error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaProd().catch(console.error);
